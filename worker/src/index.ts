/**
 * OpenCodeWEBsAG Worker — Cloudflare Worker entry point.
 *
 * Routes:
 *   GET  /health          → 200 OK (health check)
 *   GET  /installations   → Sync & list all GitHub App installations from API
 *   POST /webhook         → GitHub webhook handler (HMAC-verified)
 *
 * Secrets (set via `wrangler secret put`):
 *   WEBHOOK_SECRET   — GitHub webhook secret
 *   APP_ID           — GitHub App ID (numeric)
 *   PRIVATE_KEY      — GitHub App RSA private key (PEM)
 *   INSTALLATION_ID  — GitHub App installation ID
 *
 * KV namespace:
 *   AG_TOKENS_KV     — stores OAuth / installation tokens
 */

import type { Env } from "./_shared.js";
import { handleWebhook } from "./webhook/handler.js";
import { handleListInstallations } from "./installations.js";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // ── CORS preflight ────────────────────────────────────────── //
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-Hub-Signature-256, X-GitHub-Event, X-GitHub-Delivery, Authorization",
        },
      });
    }

    // ── GET /health ───────────────────────────────────────────── //
    if (method === "GET" && url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "opencodewebsag-worker",
          version: "1.0.0",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
        },
      );
    }

    // ── GET /installations ────────────────────────────────────── //
    if (method === "GET" && url.pathname === "/installations") {
      return handleListInstallations(env);
    }

    // ── POST /webhook ─────────────────────────────────────────── //
    if (method === "POST" && url.pathname === "/webhook") {
      const event = request.headers.get("X-GitHub-Event") ?? "";
      const delivery = request.headers.get("X-GitHub-Delivery") ?? "";
      const signature = request.headers.get("X-Hub-Signature-256");
      const body = await request.text();

      if (!event || !delivery) {
        return new Response("Missing X-GitHub-Event or X-GitHub-Delivery header", { status: 400 });
      }

      return handleWebhook(env, event, delivery, body, signature, ctx);
    }

    // ── 404 ───────────────────────────────────────────────────── //
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
