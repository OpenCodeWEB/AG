# SYSTEM_UPGRADE_SPEC

**Scope:** Backend-only security and API-compliance upgrades for OpenCodeWEBsAG (Worker + Gateway + Core).
**Hard Constraint:** ZERO visual changes to the public site (`pocwu.pages.dev/AG`) or any UI element,
style, layout, or color of `OpenCodeWEBsUI`. Upgrades are confined to business logic, Worker endpoints,
security headers, automation (CI), and AST engines.

---

## 1. GitHub API Version Header Injection (per-request)

**Requirement:** Every outgoing request to `https://api.github.com` MUST include:

```
X-GitHub-Api-Version: 2022-11-28
```

**Implementation:** A single helper `githubFetch()` (see `src/github-api.ts`) that wraps the native
`fetch()` and injects the header on every call. All GitHub API call sites must use `githubFetch`
instead of bare `fetch()`.

**Call sites covered:**
- `src/auth/github.ts` — app JWT → installation token exchange
- `src/backup/fork-engine.ts` — repo info, fork creation, ref read, branch creation
- `src/auth/token-refresh.ts` — OAuth token refresh (NOTE: hits `github.com/login/oauth/access_token`,
  NOT `api.github.com`; no header needed)
- `worker/src/installations.ts` — GitHub App installation list
- `worker/src/repos.ts` — repo creation
- `worker/src/webhook/handler.ts` — file fetch, comment post, branch create, file update, PR create,
  changed-files fetch

**User-Agent:** Every call must also carry a valid `User-Agent` (GitHub requires it). `githubFetch`
defaults to `OpenCodeWEBsAG/1.0` when the caller omits one.

**Accept:** `application/vnd.github+json` (or v3 preview) must be preserved on call sites that need it.

## 2. Security Hardening

### 2.1 Secret Leak Prevention

- CI pipelines (AG `agent-core.yml`, UI `deploy.yml`) run a regex-based scanner before deploy.
- Patterns: AWS Access Key (`AKIA[0-9A-Z]{16}`), PEM private keys
  (`-----BEGIN [A-Z ]*PRIVATE KEY-----`), GitHub PATs (`ghp_...`, `github_pat_...`),
  Slack tokens (`xox...`), Stripe secret keys (`sk_live_...`), Google API keys (`AIza...`).
- Exclusions: `node_modules`, `dist`, `.git`, `coverage`, `.wrangler`, `.github` (workflows reference
  `secrets.*` by name only), lockfiles, minified bundles.
- Failure blocks the pipeline (`::error::` + exit 1).

### 2.2 HMAC SHA-256 Validation

- Already implemented: write endpoints (`/api/metrics/update`, backup/webhook triggers) verify
  `X-Webhook-Signature` HMAC-SHA256 using `WEBHOOK_SECRET`.
- Verified by E2E tests: missing HMAC → 401, tampered HMAC → 401, valid HMAC → 200.

### 2.3 Pre-Mutation Backup Snapshots

- Already implemented: `backup/opencode-ag-{timestamp}` snapshot branches + fork backups
  (`fork-engine.ts`) created by CI before mutation (AG step 4, UI step 4).

## 3. Already-Satisfied Requirements (no work needed)

- **HMAC SHA-256 validation** — see §2.2.
- **Pre-mutation backup snapshots** — see §2.3.
- **Multi-author attribution** — commits carry `Co-authored-by` trailers (OpenCodeWEBsAG +
  OpenCodeWEB) with dynamic user attribution.
- **Worker/gateway code verification snippet** — `/health` endpoint on gateway returns worker +
  gateway status; worker exposes `/api/metrics/live` (public GET) and `/api/metrics/update`
  (HMAC-protected POST) verified by E2E + browser.

## 4. Deliverables

| # | Item | Status |
|---|------|--------|
| 1 | `src/github-api.ts` helper (header + UA) | ✅ |
| 2 | All GitHub API call sites migrated to `githubFetch` | ✅ |
| 3 | Secret-leak scanner in AG CI | ✅ |
| 4 | Secret-leak scanner in UI CI | ✅ |
| 5 | Worker typecheck green | ✅ |
| 6 | Worker redeploy with header injection | ⏳ |
| 7 | Live verification (`X-GitHub-Api-Version` present) | ⏳ |
| 8 | Spec saved + track registered | ⏳ |

## 5. Verification

- `npx tsc --noEmit` in `worker/` passes.
- Live worker calls include the header (observe via GitHub API behavior / logs).
- No UI file under `src/pages`, `src/components`, `src/styles` modified by this upgrade.
- Both CI pipelines green after merge (secret scan + deploy).
