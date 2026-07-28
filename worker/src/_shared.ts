/**
 * Shared types and utilities for the OpenCodeWEBsAG webhook Worker.
 */

export interface Env {
  AG_TOKENS_KV: KVNamespace;
  WEBHOOK_SECRET?: string;
  APP_ID?: string;
  PRIVATE_KEY?: string;
  INSTALLATION_ID?: string;
}

/** JSON-serialised token store saved in AG_TOKENS_KV keyed by installation ID */
export interface TokenStore {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;        // ISO‑8601
  installationId: string;
  login: string;
}

/** GitHub webhook event payload envelope */
export interface WebhookEvent {
  event: string;      // e.g. "push", "pull_request"
  delivery: string;   // unique delivery GUID
  payload: Record<string, unknown>;
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
