# 🤖 OpenCodeWEB

**Autonomous Polyglot AI Agent** — a universal GitHub bot that automatically backs up, audits, and self-heals your repositories before any code mutation.

---

## Overview

OpenCodeWEB operates as an autonomous agent that intercepts every push/PR event and:

1. **Creates pre-mutation backups** — forks public repos, snapshot branches for private repos
2. **Runs AST code audits** — detects syntax errors, type bugs, security flaws
3. **Applies auto-fixes** — self-heals common issues on isolated fix branches
4. **Commits with dual authorship** — every automated commit attributes both `opencodeweb[bot]` and `ABsUP`

## Repository Structure

```
github.com/OpenCodeWEB/AG/
├── .github/workflows/
│   └── agent-core.yml              # Master CI/CD workflow
├── src/
│   ├── index.ts                    # Main entry point
│   ├── auth/
│   │   └── token-refresh.ts        # OAuth token lifecycle
│   ├── backup/
│   │   └── fork-engine.ts          # Pre-mutation fork/snapshot engine
│   ├── scanner/
│   │   └── ast-inspector.ts        # AST code audit & ToDo builder
│   └── fixer/
│       └── auto-repair.ts          # Self-healing auto-repair routines
├── scripts/
│   ├── build-engine.sh             # Polyglot build & verification
│   └── setup.sh                    # Development environment setup
├── docs/
│   └── index.html                  # GitHub Pages landing page
├── OpenCodeWEBsPRD/                # PRD documentation (gitignored)
├── CONTRIBUTING.md                 # Development policy
└── README.md                       # This file
```

## OAuth & Permissions

- **Scope:** `read:user` only (minimum possible — just public profile info)
- **Token lifetime:** 8-hour access token with refresh token support
- **Security:** Access tokens are discarded immediately after each operation

## Getting Started

```bash
# Clone the repository
git clone https://github.com/OpenCodeWEB/AG.git
cd AG

# Install dependencies
npm ci

# Build
npm run build
```

## Related Projects

- **OpenCodeWEB/UI** — Frontend UI hosted at [pocwu.pages.dev](https://pocwu.pages.dev) ([github.com/OpenCodeWEB/UI](https://github.com/OpenCodeWEB/UI))
