# Testing Sandbox & Repository Architecture

## Testing Sandbox Specification

**Repository:** `OpenCodeWEB/SandBox`
**Local mirror:** `D:\OpenCodeWEBsAG-Test-Sandbox`

An isolated environment containing intentionally bugged code patterns for validating the OpenCodeWEBsAG bot without risking production code.

### Seed Code (Polyglot)

| File | Language | Intentional Issues |
|------|----------|--------------------|
| `src/index.ts` | TypeScript | Unused vars, console.log, TODO/FIXME/HACK comments |
| `src/processor.ts` | TypeScript | Unused vars, trailing whitespace, TODO/FIXME |
| `src/config.ts` | TypeScript | Unused exports, trailing whitespace, TODO |
| `src/crypto.rs` | Rust | 3 unsafe `.unwrap()` calls |
| `src/server.go` | Go | 2 naked returns |

### Test Scenarios

| Scenario | Description | Validation |
|----------|-------------|------------|
| Fork Backup | Push to a public repo with buggy code | Verify automated fork creation |
| Snapshot Backup | Push to a private repo | Verify `backup/opencode-ag-*` branch creation |
| AST Audit | Scan files with unused vars, console.log, trailing whitespace | Verify `OpenCodeWEBsPRD/ToDo.md` is populated |
| Auto-Repair | Push code with auto-fixable issues | Verify fix branch + dual-authorship commit |
| Non-Fixable Issues | Push code with logic errors | Verify review comment posted on PR |

### Verification Results (Session 2026-07-29)

| Test | Result |
|------|--------|
| `npm install` | 0 vulnerabilities |
| `npx tsc --noEmit` | Zero type errors |
| AST Scanner on Test Sandbox | 20 issues: 3 errors, 10 warnings, 7 info |
| Auto-Fixer + dual-author commit msg | Verified |

### Execution Steps

1. Authorize OpenCodeWEBsAG via https://pocwu.pages.dev/ag
2. Push buggy code to the sandbox repo
3. Verify automated backup fork/snapshot branch
4. Check AST audit output in `OpenCodeWEBsPRD/ToDo.md`
5. Validate auto-repair patches, dual co-authored commits, and non-destructive PR merges

## Core Repository Architecture

```
github.com/OpenCodeWEB/AG/
├── .github/workflows/
│   └── agent-core.yml              # Master CI/CD workflow
├── worker/                         # <-- NEW: Cloudflare Worker (webhook handler)
│   ├── wrangler.toml
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                # Router: POST /webhook, GET /health
│       ├── _shared.ts              # Env, TokenStore, WebhookEvent types
│       └── webhook/
│           └── handler.ts          # HMAC verification + event dispatch
├── crypto/                         # <-- NEW: Rust WASM crypto module
│   ├── Cargo.toml
│   └── src/
│       └── lib.rs                  # sha256_hash(), hmac_sha256(), verify_hmac()
├── src/
│   ├── index.ts                    # Public API exports
│   ├── auth/
│   │   ├── token-refresh.ts        # OAuth token lifecycle management
│   │   └── github.ts               # GitHub App JWT + install tokens + webhook verify
│   ├── backup/
│   │   └── fork-engine.ts          # Pre-mutation backup engine (fork + snapshot)
│   ├── scanner/
│   │   └── ast-inspector.ts        # AST code analysis and ToDo ledger builder
│   └── fixer/
│       └── auto-repair.ts          # Self-healing code repair with dual authorship
├── scripts/
│   ├── build-engine.sh             # Build and verification pipeline
│   └── setup.sh                    # Development environment setup
├── docs/
│   └── index.html                  # GitHub Pages homepage
├── OpenCodeWEBsPRD/
│   ├── PRD.md
│   ├── OpenCodeWEBsAG_Full_GitHub_Logic.md
│   ├── OpenCodeWEBsAG_Build_Execution_Architecture.md
│   └── Testing_and_Repo_Architecture.md
├── CONTRIBUTING.md
├── README.md
├── package.json
├── tsconfig.json
└── .gitignore
```

## OpenCodeWEBsUI Integration

The AG bot's user interface lives in the companion UI project:

```
github.com/OpenCodeWEB/UI/
├── functions/api/ag/
│   ├── _shared.ts                  # Env + helpers for AG routes
│   ├── auth/
│   │   ├── login.ts                # GET  → redirect to GitHub App install
│   │   └── callback.ts             # GET  → handle install callback, store in KV
│   └── dashboard.ts                # GET  → bot status, installation list
├── src/pages/
│   └── AGDashboard.tsx             # React dashboard with status + installs
├── wrangler.toml                   # AG_TOKENS_KV binding + AG_WORKER service binding
└── src/App.tsx                     # Route /ag → AGDashboard
```
