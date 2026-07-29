/**
 * GitHub App Authentication Module
 *
 * Handles JWT generation (RSA256 signed with app private key),
 * installation access token retrieval, and webhook verification.
 *
 * GitHub App auth flow:
 *   1. Sign JWT with app ID + private key (RSA256)
 *   2. Exchange JWT for an installation access token (POST /app/installations/{id}/access_tokens)
 *   3. Use installation token for API calls (1-hour expiry)
 *   4. Refresh via new JWT exchange when expired
 */

export interface GitHubAppConfig {
  appId: string;
  privateKey: string; // PEM-encoded RSA private key
  installationId: string;
}

export interface InstallationToken {
  token: string;
  expiresAt: Date;
  permissions: Record<string, string>;
  repositorySelection: string;
}

const GITHUB_API = "https://api.github.com";

/**
 * Generate a JWT for GitHub App authentication.
 * The JWT is signed with the app's RSA private key using RS256 algorithm.
 *
 * JWT payload:
 *   - iss: app ID
 *   - iat: issued at (now)
 *   - exp: expires (10 minutes max per GitHub)
 */
export async function generateAppJwt(config: GitHubAppConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: config.appId,
    iat: now - 60, // 60s leeway for clock skew
    exp: now + 600, // 10 minutes — GitHub max
  };

  const encode = (obj: unknown): string =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const message = `${headerB64}.${payloadB64}`;

  // Import the private key (handles both PKCS#1 "RSA PRIVATE KEY" and PKCS#8 "PRIVATE KEY")
  const pemContents = config.privateKey
    .replace(/-----BEGIN [\w\s]+ KEY-----/g, "")
    .replace(/-----END [\w\s]+ KEY-----/g, "")
    .replace(/\s/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    new TextEncoder().encode(message)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${message}.${sigB64}`;
}

/**
 * Exchange an app JWT for an installation access token.
 * The token is valid for 1 hour and has the permissions
 * configured in the GitHub App.
 */
export async function getInstallationToken(
  jwt: string,
  installationId: string
): Promise<InstallationToken> {
  const resp = await fetch(
    `${GITHUB_API}/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
        "User-Agent": "OpenCodeWEBsAG/1.0",
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!resp.ok) {
    throw new Error(
      `Installation token exchange failed: ${resp.status} ${await resp.text()}`
    );
  }

  const data = (await resp.json()) as {
    token: string;
    expires_at: string;
    permissions: Record<string, string>;
    repository_selection: string;
  };

  return {
    token: data.token,
    expiresAt: new Date(data.expires_at),
    permissions: data.permissions,
    repositorySelection: data.repository_selection,
  };
}

/**
 * Verify a GitHub webhook signature.
 * Returns true if the signature matches the HMAC-SHA256 of the body.
 */
export async function verifyWebhookSignature(
  secret: string,
  body: string,
  signature: string
): Promise<boolean> {
  const algo = { name: "HMAC", hash: "SHA-256" };
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    algo,
    false,
    ["verify"]
  );

  const expectedSig = `sha256=${await hmacHex(key, body)}`;
  return constantTimeCompare(expectedSig, signature);
}

async function hmacHex(key: CryptoKey, data: string): Promise<string> {
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
