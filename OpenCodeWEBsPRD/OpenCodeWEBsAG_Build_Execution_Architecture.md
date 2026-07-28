# Build & Execution Architecture

## 1. System Overview

The OpenCodeWEBsAG system consists of four deployable components:

| Component | Location | Technology | Deployment Target |
|-----------|----------|------------|-------------------|
| Core library | `src/` | TypeScript (npm package) | GitHub/NPM |
| Webhook Worker | `worker/` | TypeScript + Cloudflare Workers | `wrangler deploy` |
| UI Dashboard | `functions/api/ag/` + `src/pages/AGDashboard.tsx` | React + Pages Functions | Cloudflare Pages |
| WASM Crypto | `crypto/` | Rust → wasm32 | `wasm-pack build` |

**Go CLI** (`cmd/pocwu/`) — Requires Go toolchain installation (not currently available).

## 2. Build Commands

### Core Library
```bash
cd D:\OpenCodeWEBsAG
npm install
npm run build           # tsc
npx tsc --noEmit        # type check (CI)
```

### Webhook Worker
```bash
cd D:\OpenCodeWEBsAG\worker
npm install
npx tsc --noEmit        # type check
npx wrangler deploy     # deploy to Cloudflare
```

Secrets to set before deployment:
```bash
npx wrangler secret put WEBHOOK_SECRET
npx wrangler secret put APP_ID
npx wrangler secret put PRIVATE_KEY
npx wrangler secret put INSTALLATION_ID
```

### Rust WASM Crypto
```bash
cd D:\OpenCodeWEBsAG\crypto
wasm-pack build --target bundler --no-opt
cargo test              # run Rust unit tests
```

Output: `crypto/pkg/opencodewebsag_crypto_bg.wasm` + JS/TS bindings.

### Go CLI (when Go is installed)
```bash
cd D:\OpenCodeWEBsAG\cmd\pocwu
go build -o ../../bin/pocwu.exe
```

## 3. Deployment Architecture

```
┌─ User Browser ──────────────────────────────────────────────────┐
│  https://pocwu.pages.dev                                        │
│  ├── /ag              → AGDashboard.tsx (React)                 │
│  ├── /api/ag/auth/login    → redirect to GitHub App install      │
│  └── /api/ag/dashboard     → reads AG_TOKENS_KV + AG_WORKER     │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─ Cloudflare Pages ──────────────────────┐
│  AG_TOKENS_KV  ←→  opencodewebsag-worker │
└──────────────────────────────────────────┘
         │
         ▼
┌─ GitHub ───────────────────────────────────┐
│  GitHub App → webhook → POST /webhook      │
│  [opencodewebsag-worker]                   │
└────────────────────────────────────────────┘
```

### KV Namespaces

| Namespace | Purpose | Created |
|-----------|---------|---------|
| `AG_TOKENS_KV` | Bot OAuth tokens + installation metadata | Pending — create in Cloudflare dashboard |

### Service Bindings

| Binding | Source | Target |
|---------|--------|--------|
| `AG_WORKER` | OpenCodeWEBsUI Pages | `opencodewebsag-worker` |

## 4. Worker API Reference

### GET /health
```
Response 200:
{
  "status": "ok",
  "service": "opencodewebsag-worker",
  "version": "1.0.0",
  "timestamp": "2026-07-29T..."
}
```

### POST /webhook
```
Headers:
  X-GitHub-Event: push | pull_request
  X-GitHub-Delivery: <uuid>
  X-Hub-Signature-256: sha256=<hex>

Response 200:
{
  "ok": true,
  "event": "push",
  "repo": "owner/repo",
  "ref": "refs/heads/main"
}
```

## 5. Cryptography Module

The Rust WASM crypto module (`crypto/`) provides three exported functions:

```rust
// SHA-256 hash, returns hex string
sha256_hash(input: &str) -> String

// HMAC-SHA256 of key+data, returns hex string  
hmac_sha256(key: &str, data: &str) -> String

// Constant-time HMAC verification
verify_hmac(key: &str, data: &str, signature: &str) -> bool
```

These mirror the JavaScript implementations in `src/auth/github.ts` for the polyglot requirement.
