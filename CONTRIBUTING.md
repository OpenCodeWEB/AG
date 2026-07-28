# 🤝 Contributing to OpenCodeWEBsAG

## 🚫 Direct GitHub Push Prohibition

**Direct `git push` to this repository is strictly prohibited.** All code updates MUST route through the ABsUP workflow engine.

### Why?

- Bypassing the pipeline bypasses mandatory pre-mutation backup generation
- The AST audit and auto-repair engine must validate every change
- Dual authorship attribution ensures proper accountability

### How to Submit Changes

All feature additions, bug fixes, and file modifications MUST be submitted through one of these approved channels:

1. **ABsUP Engine (preferred):** Route your changes through the ABsUP workflow engine, which automatically triggers backup creation, code validation, and dual-authoring.
2. **Pull Requests:** Submit PRs from feature branches. The `agent-core.yml` workflow will process them through the full pipeline.

## Dual-Authorship Standard

Every automated commit created by `OpenCodeWEBsAG[bot]` MUST include:

```
Co-authored-by: ABsUP <ABsUP@users.noreply.github.com>
```

Manual commits by human contributors should follow the same standard when incorporating bot-generated code.

## Code Standards

- **TypeScript:** Strict mode, ES2022 target, NodeNext module resolution
- **Formatting:** Prettier with default config
- **No `console.log` in production code** — use structured logging instead
- **No unsafe `.unwrap()` calls** in Rust — handle errors properly

## Pre-Mutation Backup Policy

Before any code mutation:

- **Public repos:** The fork engine will fork the target repo to a backup namespace
- **Private repos:** An immutable snapshot branch `backup/opencode-ag-*` is created

These backups serve as restore points in case the mutation introduces errors.
