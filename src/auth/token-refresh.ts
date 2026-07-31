/**
 * OAuth Token Refresh Engine
 *
 * Handles GitHub OAuth token exchange and 6-month
 * refresh token lifecycle for the OpenCodeWEBsAG bot.
 */

export interface TokenPayload {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}

export interface TokenStore {
  get(key: string): Promise<TokenPayload | null>;
  set(key: string, value: TokenPayload, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

/**
 * Exchange an authorization code for an access + refresh token pair.
 */
export async function exchangeCode(
  clientId: string,
  clientSecret: string,
  code: string,
): Promise<TokenPayload> {
  const resp = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Token exchange failed: ${resp.status}`);
  }

  const data = (await resp.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    refresh_token_expires_in?: number;
    scope?: string;
  };

  if (!data.access_token) {
    throw new Error("No access_token in response");
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? "",
    expiresAt: new Date(Date.now() + (data.expires_in ?? 28800) * 1000),
    scope: data.scope ?? "read:user",
  };
}

/**
 * Refresh an expired access token using the refresh token.
 */
export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<TokenPayload> {
  const resp = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Token refresh failed: ${resp.status}`);
  }

  const data = (await resp.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  return {
    accessToken: data.access_token ?? "",
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 28800) * 1000),
    scope: data.scope ?? "read:user",
  };
}

/**
 * Ensure a valid token is available — refresh if expired.
 */
export async function ensureValidToken(
  store: TokenStore,
  clientId: string,
  clientSecret: string,
  key: string,
): Promise<TokenPayload> {
  const existing = await store.get(key);
  if (!existing) {
    throw new Error(`No stored token for key: ${key}`);
  }

  // If still valid, return as-is
  if (existing.expiresAt > new Date()) {
    return existing;
  }

  // Refresh if we have a refresh token
  if (existing.refreshToken) {
    const refreshed = await refreshAccessToken(
      clientId,
      clientSecret,
      existing.refreshToken,
    );
    // Store the new token (8h TTL for access, longer for refresh)
    await store.set(key, refreshed, 28800);
    return refreshed;
  }

  throw new Error("Token expired and no refresh token available");
}
