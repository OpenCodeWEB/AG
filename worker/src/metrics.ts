/**
 * AG Metrics & Contributor Leaderboard — Cloudflare KV-backed telemetry.
 *
 * Routes:
 *   GET  /api/metrics/live    → public, edge-cached read of dashboard data
 *   POST /api/metrics/update  → HMAC-authenticated write (backup | bug_fix | commit)
 *
 * Storage: KV namespace `AG_METRICS`, key `dashboard_data`.
 *
 * The write path mirrors GitHub's webhook HMAC scheme
 * (X-Hub-Signature-256) so GitHub Actions / agents can sign payloads
 * with the same secret tooling they already use for webhooks.
 */

import type { Env } from "./_shared.js";
import { generateAppJwt, getInstallationToken } from "../../src/auth/github.js";
import type { GitHubAppConfig } from "../../src/auth/github.js";
import { githubFetch } from "../../src/github-api.js";

const KV_KEY = "dashboard_data";
const GITHUB_API = "https://api.github.com";

/** CORS origin allowed for browser access (Pages SPA). */
const ALLOWED_ORIGIN = "https://pocwu.pages.dev";

export type MetricsEvent = "backup" | "bug_fix" | "commit";

export interface Contributor {
  username: string;
  role: string;
  avatar: string;
  commits_count: number;
  last_active: string;
}

export interface MetricsData {
  system_stats: {
    total_backups: number;
    bugs_fixed: number;
    total_commits: number;
    last_updated: string;
  };
  contributors: Contributor[];
}

/* ------------------------------------------------------------------ */
/*  Pure helpers                                                       */
/* ------------------------------------------------------------------ */

export function emptyMetrics(): MetricsData {
  return {
    system_stats: {
      total_backups: 0,
      bugs_fixed: 0,
      total_commits: 0,
      last_updated: new Date(0).toISOString(),
    },
    contributors: [],
  };
}

/** Verify GitHub-style `X-Hub-Signature-256: sha256=<hex>` (constant-time). */
export async function verifyGitHubSignature(
  secret: string,
  body: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!signatureHeader) return false;

  const algo = { name: "HMAC", hash: "SHA-256" };
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    algo,
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const expected =
    "sha256=" +
    Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  if (expected.length !== signatureHeader.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signatureHeader.charCodeAt(i);
  }
  return result === 0;
}

/** Sanitise a GitHub login so it is safe for JSON/KV round-trips. */
export function sanitizeLogin(actor: string): string {
  return (actor || "").replace(/[^\w-]/g, "").slice(0, 64);
}

/** Read the current metrics blob (empty defaults when unset/corrupt). */
export async function readMetrics(env: Env): Promise<MetricsData> {
  if (!env.AG_METRICS) return emptyMetrics();
  try {
    const raw = await env.AG_METRICS.get(KV_KEY);
    if (!raw) return emptyMetrics();
    const parsed = JSON.parse(raw) as MetricsData;
    if (!parsed.system_stats || !Array.isArray(parsed.contributors)) {
      return emptyMetrics();
    }
    return parsed;
  } catch {
    return emptyMetrics();
  }
}

/** Apply one event to the metrics blob and persist it. */
async function applyAndPersist(
  env: Env,
  event: MetricsEvent,
  actor: string,
): Promise<MetricsData | null> {
  if (!env.AG_METRICS) return null;

  const data = await readMetrics(env);
  const now = new Date().toISOString();
  const s = data.system_stats;

  if (event === "backup") s.total_backups += 1;
  if (event === "bug_fix") s.bugs_fixed += 1;
  s.total_commits += 1;
  s.last_updated = now;

  // Contributor upsert (case-insensitive on username)
  const login = sanitizeLogin(actor) || "anonymous";
  const existing = data.contributors.find(
    (c) => c.username.toLowerCase() === login.toLowerCase(),
  );
  if (existing) {
    existing.commits_count += 1;
    existing.last_active = now;
  } else {
    data.contributors.push({
      username: login,
      role: "Co-Author / Contributor",
      avatar: `https://github.com/${login}.png`,
      commits_count: 1,
      last_active: now,
    });
  }

  // Sort by commits desc, then last_active desc
  data.contributors.sort(
    (a, b) =>
      b.commits_count - a.commits_count ||
      b.last_active.localeCompare(a.last_active),
  );

  await env.AG_METRICS.put(KV_KEY, JSON.stringify(data));
  return data;
}

/* ------------------------------------------------------------------ */
/*  Route handlers                                                     */
/* ------------------------------------------------------------------ */

/** GET /api/metrics/live — public read with edge caching + CORS. */
export async function handleGetMetrics(env: Env): Promise<Response> {
  const data = await readMetrics(env);
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60",
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Hub-Signature-256",
    },
  });
}

/**
 * POST /api/metrics/update — HMAC-protected write.
 *
 * Headers: `X-Hub-Signature-256: sha256=<hex>` over the raw body.
 * Secret: `METRICS_WEBHOOK_SECRET` if set, else `WEBHOOK_SECRET`.
 * Body:   { "event": "backup" | "bug_fix" | "commit", "actor": "<login>" }
 */
export async function handleUpdateMetrics(
  env: Env,
  request: Request,
): Promise<Response> {
  const secret = env.METRICS_WEBHOOK_SECRET ?? env.WEBHOOK_SECRET;
  if (!secret) {
    return new Response(
      JSON.stringify({ error: "Metrics secret not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("X-Hub-Signature-256");

  const valid = await verifyGitHubSignature(secret, rawBody, signature);
  if (!valid) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: { event?: string; actor?: string };
  try {
    payload = JSON.parse(rawBody) as { event?: string; actor?: string };
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const event = payload.event;
  const actor = payload.actor;
  if (event !== "backup" && event !== "bug_fix" && event !== "commit") {
    return new Response(
      JSON.stringify({ error: "event must be backup | bug_fix | commit" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
  if (!actor || !sanitizeLogin(actor)) {
    return new Response(
      JSON.stringify({ error: "actor (GitHub login) is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const data = await applyAndPersist(env, event, actor);
  if (!data) {
    return new Response(
      JSON.stringify({ error: "AG_METRICS KV not bound" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ success: true, totals: data.system_stats }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

/**
 * Record a metrics event from internal processing (webhook pipeline).
 * Fire-and-forget: never throws, logs failures only.
 */
export async function recordMetricsEvent(
  env: Env,
  event: MetricsEvent,
  actor: string,
): Promise<void> {
  try {
    await applyAndPersist(env, event, actor);
  } catch (err) {
    console.error(`[metrics] record ${event} failed: ${err}`);
  }
}

/* ------------------------------------------------------------------ */
/*  Daily sync (cron 00:00 UTC) — authoritative GitHub recompute       */
/* ------------------------------------------------------------------ */

interface GitHubRepo {
  full_name: string;
  name: string;
  private: boolean;
}

interface GitHubContributor {
  login: string | null;
  avatar_url: string | null;
  contributions: number;
}

interface GitHubCommit {
  author: { login: string | null } | null;
  commit: { author: { date: string } };
}

/**
 * Aggregate real leaderboard stats from the GitHub API using an
 * installation access token:
 *   - contributors        → /installation/repositories + /repos/{r}/contributors
 *   - last_active         → most recent commit date per author (per repo, 100 newest)
 *   - total_commits       → sum of GitHub `contributions` (default-branch commits)
 *   - total_backups       → count of `backup/opencode-*` branches across repos
 *
 * Pure function (token in, data out) — never touches KV.
 */
export async function aggregateGitHubStats(
  token: string,
): Promise<MetricsData> {
  const reposResp = await githubFetch(
    `${GITHUB_API}/installation/repositories?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "OpenCodeWEBsAG/1.0",
      },
    },
  );
  if (!reposResp.ok) {
    throw new Error(
      `Failed to list installation repositories: ${reposResp.status} ${await reposResp.text()}`,
    );
  }
  const reposData = (await reposResp.json()) as {
    repositories: GitHubRepo[];
  };

  const contributors = new Map<
    string,
    { username: string; commits: number; avatar: string; lastActive: string }
  >();
  let totalBackups = 0;

  for (const repo of reposData.repositories) {
    try {
      // ── Contributor commit counts (default branch) ──────────────── //
      const cResp = await githubFetch(
        `${GITHUB_API}/repos/${repo.full_name}/contributors?per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "OpenCodeWEBsAG/1.0",
          },
        },
      );
      if (cResp.ok) {
        const list = (await cResp.json()) as GitHubContributor[];
        for (const c of list) {
          const login = sanitizeLogin(c.login ?? "");
          if (!login) continue; // anonymous contributors are not leaderboard members
          const avatar =
            c.avatar_url ?? `https://github.com/${login}.png`;
          const cur = contributors.get(login);
          if (cur) {
            cur.commits += c.contributions;
          } else {
            contributors.set(login, {
              username: login,
              commits: c.contributions,
              avatar,
              lastActive: new Date(0).toISOString(),
            });
          }
        }
      }

      // ── Last-active timestamps (100 newest commits per repo) ────── //
      const mResp = await githubFetch(
        `${GITHUB_API}/repos/${repo.full_name}/commits?per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "OpenCodeWEBsAG/1.0",
          },
        },
      );
      if (mResp.ok) {
        const commits = (await mResp.json()) as GitHubCommit[];
        for (const c of commits) {
          const login = sanitizeLogin(c.author?.login ?? "");
          const date = c.commit?.author?.date;
          if (!login || !date) continue;
          const cur = contributors.get(login);
          if (cur && date > cur.lastActive) cur.lastActive = date;
        }
      }

      // ── Real backup snapshot count ──────────────────────────────── //
      const bResp = await githubFetch(
        `${GITHUB_API}/repos/${repo.full_name}/branches?per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "OpenCodeWEBsAG/1.0",
          },
        },
      );
      if (bResp.ok) {
        const branches = (await bResp.json()) as { name: string }[];
        totalBackups += branches.filter((b) =>
          b.name.startsWith("backup/opencode-"),
        ).length;
      }
    } catch (err) {
      // One repo failing must not kill the whole daily sync.
      console.error(`[metrics] sync skip repo ${repo.full_name}: ${err}`);
    }
  }

  const list = [...contributors.values()]
    .map((c) => ({
      username: c.username,
      role: "Co-Author / Contributor",
      avatar: c.avatar,
      commits_count: c.commits,
      last_active: c.lastActive,
    }))
    .sort(
      (a, b) =>
        b.commits_count - a.commits_count ||
        b.last_active.localeCompare(a.last_active),
    );

  return {
    system_stats: {
      total_backups: totalBackups,
      bugs_fixed: 0, // preserved from existing data by runDashboardSync
      total_commits: list.reduce((s, c) => s + c.commits_count, 0),
      last_updated: new Date().toISOString(),
    },
    contributors: list,
  };
}

/**
 * Run the daily dashboard sync (cron 00:00 UTC or manual POST):
 * obtains an installation token, recomputes authoritative stats from
 * GitHub, preserves the `bugs_fixed` accumulator, and rewrites KV.
 * Never corrupts KV on failure — the previous snapshot stays intact.
 */
export async function runDashboardSync(
  env: Env,
): Promise<{ ok: boolean; data?: MetricsData; error?: string }> {
  try {
    if (!env.AG_METRICS) {
      return { ok: false, error: "AG_METRICS KV not bound" };
    }
    const appId = env.APP_ID;
    const privateKey = env.PRIVATE_KEY;
    const installationId = env.INSTALLATION_ID;
    if (!appId || !privateKey || !installationId) {
      return { ok: false, error: "GitHub App secrets not configured" };
    }

    const config: GitHubAppConfig = { appId, privateKey, installationId };
    const jwt = await generateAppJwt(config);
    const { token } = await getInstallationToken(jwt, installationId);

    const fresh = await aggregateGitHubStats(token);

    // Preserve the event-accumulated bug-fix counter across resyncs.
    const existing = await readMetrics(env);
    fresh.system_stats.bugs_fixed = existing.system_stats.bugs_fixed;

    await env.AG_METRICS.put(KV_KEY, JSON.stringify(fresh));
    return { ok: true, data: fresh };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * POST /api/metrics/sync — HMAC-protected manual trigger of the daily
 * sync (same auth scheme as /api/metrics/update). Primarily an ops
 * tool; the cron trigger is the automatic path.
 */
export async function handleSyncMetrics(
  env: Env,
  request: Request,
): Promise<Response> {
  const secret = env.METRICS_WEBHOOK_SECRET ?? env.WEBHOOK_SECRET;
  if (!secret) {
    return new Response(
      JSON.stringify({ error: "Metrics secret not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("X-Hub-Signature-256");

  const valid = await verifyGitHubSignature(secret, rawBody, signature);
  if (!valid) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = await runDashboardSync(env);
  if (!result.ok || !result.data) {
    return new Response(
      JSON.stringify({ error: result.error ?? "sync failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ success: true, totals: result.data.system_stats }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
