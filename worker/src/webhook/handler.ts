/**
 * GitHub webhook event handler.
 *
 * 1. Verify HMAC-SHA256 signature using WEBHOOK_SECRET.
 * 2. Parse the X-GitHub-Event header.
 * 3. Dispatch to the appropriate handler based on event type.
 */

import type { Env } from "../_shared.js";

/**
 * Verify a GitHub webhook signature using constant-time comparison.
 *
 * GitHub sends the signature in the `X-Hub-Signature-256` header:
 *   sha256=<hex-encoded HMAC-SHA256 of the raw body>
 */
async function verifySignature(
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
  const expected = "sha256=" + Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time compare
  if (expected.length !== signatureHeader.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signatureHeader.charCodeAt(i);
  }
  return result === 0;
}

// ── Event dispatchers ────────────────────────────────────────────── //

async function handlePush(env: Env, payload: Record<string, unknown>): Promise<Response> {
  const repo = (payload as any).repository?.full_name ?? "unknown";
  const ref = (payload as any).ref ?? "unknown";
  const sender = (payload as any).sender?.login ?? "unknown";

  console.log(`[push] ${sender} pushed to ${repo} ${ref}`);

  // Placeholder — will integrate with scanner/fixer pipeline
  return new Response(JSON.stringify({ ok: true, event: "push", repo, ref }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function handlePullRequest(env: Env, payload: Record<string, unknown>): Promise<Response> {
  const action = (payload as any).action ?? "unknown";
  const repo = (payload as any).repository?.full_name ?? "unknown";
  const pr = (payload as any).pull_request?.number ?? 0;

  console.log(`[pull_request] ${action} PR #${pr} on ${repo}`);

  return new Response(JSON.stringify({ ok: true, event: "pull_request", action, pr }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// ── Main entry ───────────────────────────────────────────────────── //

export async function handleWebhook(
  env: Env,
  event: string,
  delivery: string,
  body: string,
  signature: string | null,
): Promise<Response> {
  // 1. Verify signature
  if (!env.WEBHOOK_SECRET) {
    return new Response("Webhook secret not configured", { status: 500 });
  }
  const valid = await verifySignature(env.WEBHOOK_SECRET, body, signature);
  if (!valid) {
    return new Response("Invalid signature", { status: 401 });
  }

  // 2. Parse payload
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body) as Record<string, unknown>;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  // 3. Dispatch
  switch (event) {
    case "push":
      return handlePush(env, payload);
    case "pull_request":
      return handlePullRequest(env, payload);
    default:
      // Acknowledge but don't process unknown event types
      console.log(`[ignore] unsupported event: ${event}`);
      return new Response(JSON.stringify({ ok: true, event, ignored: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
  }
}
