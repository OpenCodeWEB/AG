# 🧪 OpenCodeWEBsAG Testing Sandbox & Repository Architecture

## Testing Sandbox Specification

**Repository:** `OpenCodeWEBsAG-Test-Sandbox`

An isolated environment containing intentionally bugged code patterns for validating the OpenCodeWEBsAG bot without risking production code.

### Test Scenarios

| Scenario | Description | Validation |
|----------|-------------|------------|
| Fork Backup | Push to a public repo with buggy code | Verify automated fork creation |
| Snapshot Backup | Push to a private repo | Verify `backup/opencode-ag-*` branch creation |
| AST Audit | Scan files with unused vars, console.log, trailing whitespace | Verify `OpenCodeWEBsPRD/ToDo.md` is populated |
| Auto-Repair | Push code with auto-fixable issues | Verify fix branch + dual-authorship commit |
| Non-Fixable Issues | Push code with logic errors | Verify review comment posted on PR |

### Execution Steps

1. Authorize OpenCodeWEBsAG via https://pocwu.pages.dev
2. Push buggy code to the sandbox repo
3. Verify automated backup fork/snapshot branch
4. Check AST audit output in `OpenCodeWEBsPRD/ToDo.md`
5. Validate auto-repair patches, dual co-authored commits, and non-destructive PR merges

## Core Repository Architecture

```
github.com/ABsUPs/OpenCodeWEBsAG/
├── .github/workflows/
│   └── agent-core.yml              # Master CI/CD workflow
├── src/
│   ├── index.ts                    # Public API exports
│   ├── auth/
│   │   └── token-refresh.ts        # OAuth token lifecycle management
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
│   └── OpenCodeWEBsAG_Build_Execution_Architecture.md
├── CONTRIBUTING.md
├── README.md
└── package.json
```
