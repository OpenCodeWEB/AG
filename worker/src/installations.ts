/**
 * GET /installations — Sync & list all GitHub App installations.
 *
 * 1. Generate a JWT signed with the GitHub App's RSA private key (RS256).
 * 2. Call GET /app/installations on the GitHub REST API.
 * 3. Store / update each installation record in AG_TOKENS_KV.
 * 4. Remove stale entries no longer returned by GitHub.
 * 5. Return the fresh list.
 */

import type { Env } from "./_shared.js";
import { json } from "./_shared.js";

/* ------------------------------------------------------------------ */
/*  GitHub App JWT (RS256)                                             */
/* ------------------------------------------------------------------ */

/** Decode a PEM string to DER bytes (assumes PKCS#8 format). */
function pemToDer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN [\w\s]+ KEY-----/g, "")
    .replace(/-----END [\w\s]+ KEY-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/** Base64url-encode an ArrayBuffer (no padding). */
function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function generateAppJwt(appId: string, privateKeyPem: string): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iat: now - 60, exp: now + 600, iss: Number(appId) };

  const encoder = new TextEncoder();
  const message =
    base64url(encoder.encode(JSON.stringify(header)).buffer) +
    "." +
    base64url(encoder.encode(JSON.stringify(payload)).buffer);

  // Import the PKCS#8 private key into Web Crypto
  const der = pemToDer(privateKeyPem);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  // Sign the message
  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    encoder.encode(message),
  );

  return message + "." + base64url(signature);
}

/* ------------------------------------------------------------------ */
/*  GitHub REST API helpers                                            */
/* ------------------------------------------------------------------ */

interface GitHubInstallation {
  id: number;
  account: {
    login: string;
    type: "User" | "Organization";
  } | null;
  created_at: string;
  updated_at: string;
  suspended_at: string | null;
  [key: string]: unknown;
}

async function fetchInstallationsFromGitHub(jwt: string): Promise<GitHubInstallation[]> {
  const url = "https://api.github.com/app/installations?per_page=100";
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${jwt}`,
      "User-Agent": "opencodewebsag-worker",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${body}`);
  }

  return (await response.json()) as GitHubInstallation[];
}

/* ------------------------------------------------------------------ */
/*  KV sync helpers                                                    */
/* ------------------------------------------------------------------ */

/** Normalised record shape stored in KV under ag_install:<id> */
interface InstallRecord {
  installationId: string;
  account: string;
  accountType: string;
  setupAction: string;
  installedAt: string;
  suspendedAt: string | null;
  updatedAt: string;
}

function toRecord(inst: GitHubInstallation): InstallRecord {
  return {
    installationId: String(inst.id),
    account: inst.account?.login ?? "unknown",
    accountType: inst.account?.type ?? "Unknown",
    setupAction: "install",
    installedAt: inst.created_at,
    suspendedAt: inst.suspended_at,
    updatedAt: inst.updated_at,
  };
}

const KV_PREFIX = "ag_install:";

async function syncToKv(
  kv: KVNamespace,
  installations: GitHubInstallation[],
): Promise<InstallRecord[]> {
  const fresh = new Set<string>();

  // Upsert each installation from GitHub
  for (const inst of installations) {
    const id = String(inst.id);
    fresh.add(id);
    const key = `${KV_PREFIX}${id}`;
    const record = toRecord(inst);
    await kv.put(key, JSON.stringify(record), { expirationTtl: 86400 * 90 });
  }

  // Remove stale entries (those in KV but not returned by GitHub)
  const listed = await kv.list({ prefix: KV_PREFIX });
  for (const key of listed.keys) {
    const existingId = key.name.replace(KV_PREFIX, "");
    if (!fresh.has(existingId)) {
      console.log(`[installations] removing stale installation ${existingId}`);
      await kv.delete(key.name);
    }
  }

  return installations.map(toRecord);
}

/* ------------------------------------------------------------------ */
/*  Handler                                                           */
/* ------------------------------------------------------------------ */

export async function handleListInstallations(env: Env): Promise<Response> {
  if (!env.APP_ID || !env.PRIVATE_KEY) {
    return json(
      { error: "GitHub App not configured (APP_ID or PRIVATE_KEY missing)" },
      503,
    );
  }

  if (!env.AG_TOKENS_KV) {
    return json({ error: "AG_TOKENS_KV not bound" }, 503);
  }

  try {
    // 1. Authenticate as the GitHub App
    const jwt = await generateAppJwt(env.APP_ID, env.PRIVATE_KEY);

    // 2. Fetch installations from GitHub API
    const installations = await fetchInstallationsFromGitHub(jwt);

    // 3. Sync to KV (upsert + remove stale)
    const records = await syncToKv(env.AG_TOKENS_KV, installations);

    return json({
      ok: true,
      count: records.length,
      installations: records,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[installations] sync failed: ${message}`);
    return json({ error: "Sync failed", message }, 500);
  }
}
