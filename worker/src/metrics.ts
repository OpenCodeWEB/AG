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

const KV_KEY = "dashboard_data";

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
