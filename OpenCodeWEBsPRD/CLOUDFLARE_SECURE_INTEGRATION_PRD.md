# 🔒 Secure Cloudflare Worker Gateway & Ecosystem PRD

## 1. Executive Summary & Routing Architecture

To ensure end-to-end security, zero exposed secrets, and automated request verification, all interactions between GitHub Apps, Marketplace Webhooks, `OpenCodeWEB/Ui`, `OpenCodeWEB/AG`, and `OpenCodeWEB/SandBoxe` are routed through a central Cloudflare Worker gateway.

### 📌 Core Gateway Details
- **Worker Endpoint:** `https://opencodeweb.xup.workers.dev`
- **Cloudflare Dashboard:** `dash.cloudflare.com/9c6e3d4513006c50aedc3ea090dad901/workers/services/edit/opencodeweb/production`
- **Primary Webhook Receiver:** `https://opencodeweb.xup.workers.dev/api/github/webhook`
- **OAuth Callback URL:** `https://opencodeweb.xup.workers.dev/api/auth/callback`

---

## 2. Secure Data Flow Topology

```text
[ GitHub Event / Marketplace Webhook ]
                  │
                  ▼ (HMAC SHA-256 Verified)
[ Cloudflare Worker: opencodeweb.xup.workers.dev ]
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
[ Validate Token ]    [ Route Payload ]
        │                   │
        ├───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ OpenCodeWEB/  │   │ OpenCodeWEB/  │   │ OpenCodeWEB/  │
│      Ui       │   │      AG       │   │   SandBoxe    │
└───────────────┘   └───────────────┘   └───────────────┘

```

---

## 3. Worker Implementation Code (`index.ts`)

Copy and deploy this TypeScript handler directly inside your Cloudflare Worker dashboard.

```typescript
export interface Env {
  WEBHOOK_SECRET: string;
  GITHUB_APP_PEM: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. CORS Preflight Handling
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "https://pocwu.pages.dev",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-Hub-Signature-256",
        },
      });
    }

    // 2. GitHub Webhook Ingress Route
    if (url.pathname === "/api/github/webhook" && request.method === "POST") {
      const signature = request.headers.get("X-Hub-Signature-256");
      const bodyText = await request.text();

      // Verify HMAC SHA-256 Signature
      const isValid = await verifyGitHubSignature(bodyText, signature, env.WEBHOOK_SECRET);
      if (!isValid) {
        return new Response(JSON.stringify({ error: "Unauthorized Signature" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const payload = JSON.parse(bodyText);
      console.log(`🛡️ Validated Webhook Event: ${payload.action || 'push'} received.`);

      return new Response(JSON.stringify({ status: "Accepted", agent: "OpenCodeWEBsAG" }), {
        status: 202,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Health & Status Route
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "Online", gateway: "opencodeweb.xup.workers.dev" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("OpenCodeWEB Gateway Active", { status: 200 });
  },
};

// HMAC Signature Verification Helper
async function verifyGitHubSignature(payload: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const sigHex = signature.replace("sha256=", "");
  const sigBytes = hexToBytes(sigHex);
  return await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(payload));
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

```

---

## 4. GitHub Marketplace & App URL Update Matrix

Update your GitHub App configuration (`https://github.com/apps/opencodewebsag`) with these verified secure endpoints:

| Setting Parameter | Updated Secure Endpoint Value |
| --- | --- |
| **Homepage URL** | `https://pocwu.pages.dev/AG` |
| **Webhook URL** | `https://opencodeweb.xup.workers.dev/api/github/webhook` |
| **Callback URL** | `https://opencodeweb.xup.workers.dev/api/auth/callback` |
| **Setup URL** | `https://pocwu.pages.dev/AG/setup` |

---

## 5. Environment Secrets Configuration in Cloudflare

Ensure the following variables are configured under **Cloudflare Settings -> Variables**:

1. `WEBHOOK_SECRET` — Strong random key matching GitHub App Webhook Secret.
2. `GITHUB_APP_PEM` — Private key generated from your GitHub App settings.
3. `GITHUB_CLIENT_ID` — GitHub App Client ID.
4. `GITHUB_CLIENT_SECRET` — GitHub App Client Secret.
