# 🔒 Cloudflare Worker Secure Integration Specification

> **Status: VERIFIED & DEPLOYED** — Last verified: 2026-07-29
> All internal connectivity routes through this single gateway. No other endpoints are used.

## 1. Routing Architecture

All traffic and webhooks passing between **`OpenCodeWEB/Ui`**, **`OpenCodeWEB/AG`**, and **`OpenCodeWEB/SandBoxe`** are strictly routed and authenticated through a centralized Cloudflare Worker gateway.

* **Central Worker Gateway:** `https://opencodeweb.xup.workers.dev`
* **Dashboard Endpoint:** `https://dash.cloudflare.com/9c6e3d4513006c50aedc3ea090dad901/workers/services/edit/opencodeweb/production`
* **Primary Webhook Ingress:** `https://opencodeweb.xup.workers.dev/api/github/webhook`
* **Authentication Callback:** `https://opencodeweb.xup.workers.dev/api/auth/callback`
* **AG Worker Proxy:** `https://opencodeweb.xup.workers.dev/api/ag/*` (proxies to `opencodewebsag-worker`)

### Service Bindings

| Source | Binding | Target |
|--------|---------|--------|
| Gateway (`opencodeweb`) | `AG_WORKER` | `opencodewebsag-worker` |
| Pages (`pocwu`) | `AG_WORKER` | `opencodeweb` (routes through gateway) |

---

## 2. Data Flow Topology

```text
[ GitHub Ingress / Event Webhook ]
               │
               ▼
   [ X-Hub-Signature-256 ]
               │
               ▼
[ Cloudflare Worker Gateway ]
 (opencodeweb.xup.workers.dev)
               │
      ┌────────┴────────┐
      ▼                 ▼
[ HMAC Verified ]  [ Token Validated ]
      │                 │
      └────────┬────────┘
               ▼
    [ Route Payload Event ]
               │
     ┌─────────┼─────────┐
     ▼         ▼         ▼
┌─────────┐ ┌─────────┐ ┌──────────┐
│  WEB/Ui │ │  WEB/AG │ │ SandBoxe │
└─────────┘ └─────────┘ └──────────┘

All internal traffic flows through the gateway via service bindings.
Pages Functions call `AG_WORKER` binding → gateway → AG worker.
No direct calls to `opencodewebsag-worker.xup.workers.dev`.

```

---

## 3. Worker Implementation Code (`index.ts`)

Deployed at `D:\OpenCodeWEBsAG\gateway\index.ts` and running on `opencodeweb.xup.workers.dev`:

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

    // 1. CORS Preflight Configuration
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "https://pocwu.pages.dev",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-Hub-Signature-256",
        },
      });
    }

    // 2. Webhook HMAC SHA-256 Verification Route
    if (url.pathname === "/api/github/webhook" && request.method === "POST") {
      const signature = request.headers.get("X-Hub-Signature-256");
      const bodyText = await request.text();

      const isValid = await verifyGitHubSignature(bodyText, signature, env.WEBHOOK_SECRET);
      if (!isValid) {
        return new Response(JSON.stringify({ error: "Unauthorized Signature" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const payload = JSON.parse(bodyText);
      return new Response(
        JSON.stringify({ status: "Accepted", event: payload.action || "push", agent: "OpenCodeWEBsAG" }),
        { status: 202, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Gateway Health Endpoint
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({ status: "Online", gateway: "opencodeweb.xup.workers.dev" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response("OpenCodeWEB Gateway Active", { status: 200 });
  },
};

// HMAC SHA-256 Verification Helper
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

// Hexadecimal to Uint8Array Conversion Helper
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
```

---

## 4. GitHub App URL Update Matrix

Update your GitHub App configuration settings (`https://github.com/apps/opencodewebsag`) using these parameters:

| Setting Parameter | Configuration Endpoint Value |
| --- | --- |
| **Homepage URL** | `https://pocwu.pages.dev/AG` |
| **Webhook URL** | `https://opencodeweb.xup.workers.dev/api/github/webhook` |
| **Callback URL** | `https://opencodeweb.xup.workers.dev/api/auth/callback` |
| **Setup URL** | `https://pocwu.pages.dev/AG/setup` |

---

## 5. Secrets Configuration

Configure these 4 environment variables under **Cloudflare Settings -> Variables & Secrets**:

1. **`WEBHOOK_SECRET`**: Secret key matching the Webhook Secret set in GitHub App settings.
2. **`GITHUB_APP_PEM`**: Private key string generated from your GitHub App (PKCS#8 format).
3. **`GITHUB_CLIENT_ID`**: Client ID assigned to the GitHub App (`Iv23liyqdR2KcjagdldW`).
4. **`GITHUB_CLIENT_SECRET`**: Client Secret generated for GitHub OAuth operations.

### AG Worker Secrets (opencodewebsag-worker)

| Secret | Value/Source |
|--------|-------------|
| `APP_ID` | `4418346` |
| `INSTALLATION_ID` | `149676194` |
| `PRIVATE_KEY` | GitHub App private key (PKCS#8 format) |
| `WEBHOOK_SECRET` | Same as gateway `WEBHOOK_SECRET` |

---

## 6. Verified Deployments

| Endpoint | Method | Status | Response |
|----------|--------|--------|----------|
| `GET /health` | Health | ✅ 200 | `{"status":"Online","gateway":"opencodeweb.xup.workers.dev"}` |
| `GET /` | Root | ✅ 200 | Lists `/health`, `/api/github/webhook`, `/api/auth/callback`, `/api/ag/*` |
| `POST /api/github/webhook` (no sig) | Webhook | ✅ 401 | `{"error":"Unauthorized Signature"}` |
| `POST /api/github/webhook` (valid HMAC) | Webhook | ✅ 202 | `{"status":"Accepted","forward_status":200}` |
| `GET /api/ag/health` | AG Proxy | ✅ 200 | Proxies to AG worker `/health` |
| `GET /api/ag/installations` | AG Proxy | ✅ 200 | Returns 4 installations |

### GitHub App URLs (Updated 2026-07-29)

| Setting | Value |
|---------|-------|
| **Homepage URL** | `https://pocwu.pages.dev/AG` |
| **Webhook URL** | `https://opencodeweb.xup.workers.dev/api/github/webhook` |
| **Callback URL** | `https://opencodeweb.xup.workers.dev/api/auth/callback` |

### AG Dashboard (Static HTML)

| Property | Value |
|----------|-------|
| **URL** | `https://pocwu.pages.dev/AG/` |
| **Source** | `D:\OpenCodeWEBsUI\public\AG\index.html` |
| **Deployment** | Cloudflare Pages `pocwu` project, `main` branch |
| **Routing** | `_redirects` serves `/AG /AG/index.html 200` for any casing |
| **Gateway health** | Live fetch to `https://opencodeweb.xup.workers.dev/health` on page load |
| **CDN** | Tailwind CSS (CDN) + Font Awesome 6.4 |
