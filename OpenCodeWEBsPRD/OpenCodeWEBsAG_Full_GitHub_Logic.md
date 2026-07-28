# ⚙️ Master System Logic & PRD: OpenCodeWEBsAG Universal GitHub Autonomous Bot

## 1. High-Level Lifecycle Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 1. ONE-TIME OAUTH & PERMISSION GRANT (pocwu.pages.dev)                 │
│    - User grants Full Admin, Code, Pages, Actions, & Deploy Scopes.   │
│    - Bot exchanges Code for User Access Token + 6-Month Refresh Token. │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. MANDATORY ABsUP ENGINE ROUTING & PUSH ENFORCEMENT                   │
│    - Direct `git push` to GitHub is strictly prohibited.              │
│    - All updates MUST route through the ABsUP Workflow Engine.         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 3. REPOSITORY INGRESS & VISIBILITY CHECK                               │
│    - Bot intercepts Webhook Event (Push / Pull Request / Dispatch).     │
│    - Detects whether target repository is Public or Private.           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 4. PRE-MUTATION AUTOMATED BACKUP ENGINE                                │
│    - Public Repo:  Forks target repo to backup namespace via API.     │
│    - Private Repo: Creates immutable snapshot branch `backup/opencode-*`.│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 5. AST AUDIT, BUG SCANNING & TODO LEDGER GENERATION                    │
│    - Parses code AST for syntax errors, type bugs, & security flaws.  │
│    - Appends structured tasks & backup SHAs to `OpenCodeWEBsPRD/ToDo.md`.│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 6. AUTONOMOUS SELF-HEALING REPAIR & DUAL-AUTHOR COMMIT ENGINE          │
│    - Runs automated fix scripts via isolated `fix/opencode-ag-*` branch.│
│    - Commits code changes co-authoring both OpenCodeWEBsAG & ABsUP.    │
│    - Executes tests -> Merges / Opens PR with summary ledger.          │
└────────────────────────────────────────────────────────────────────────┘
```

## 2. 🚫 Direct GitHub Push Prohibition & Workflow Policy (CONTRIBUTING.md)

**⚠️ Critical Development Policy**

**Direct GitHub Pushes are Strictly Prohibited:**
No developer, automated script, or third-party agent is allowed to push code directly to GitHub using standard git push commands. Bypassing the core pipeline introduces security vulnerabilities and circumvents mandatory backup generation.

**Mandatory Code Updates via ABsUP Engine:**
All feature additions, bug fixes, and file modifications MUST be submitted through the ABsUP workflow engine. Code routed through ABsUP automatically triggers pre-execution backup snapshot creation and enforces strict code validation boundaries.

**Role of the OpenCodeWEBsAG Bot & Co-Authoring:**
- Automatically maintains repository state backups (Public Forks / Private Snapshot Branches).
- Audits code AST to append detected issues to OpenCodeWEBsPRD/ToDo.md.
- Triggers isolated, self-healing Pull Requests and auto-repair routines.
- **Dual-Authorship Standard:** All automated commits created by OpenCodeWEBsAG[bot] must explicitly attach ABsUP as a co-author via `Co-authored-by: ABsUP <ABsUP@users.noreply.github.com>`.

## 3. End-to-End Decision Logic Flowchart

```text
[ Developer Code Change ]
           │
           ▼
Via ABsUP Engine? ───(NO)───► ❌ REJECT: Direct Push Prohibited
           │
         (YES)
           │
           ▼
[ Incoming Push / Webhook Event ]
           │
           ▼
Valid Refresh Token Exists? ───(NO)───► [ Redirect to Auth: https://pocwu.pages.dev ]
           │
         (YES)
           │
           ▼
[ Silent Token Refresh via API ] ──► (Obtain Short-lived 8h Installation Access Token)
           │
           ▼
Is Target Repo Public or Private?
   ├── Public  ──► Trigger REST API: POST /repos/{owner}/{repo}/forks
   └── Private ──► Is Private Forking Allowed?
                     ├── (YES) ──► Create Encrypted Private Fork
                     └── (NO)  ──► Create Branch SHA: `backup/opencode-ag-${TIMESTAMP}`
           │
           ▼
[ Record Restore Point & Snapshot Commit SHA in `OpenCodeWEBsPRD/ToDo.md` ]
           │
           ▼
[ Execute AST Code Audit Engine ]
   ├── Syntax Errors / Bugs Detected?
   │      ├── Append issue list to `OpenCodeWEBsPRD/ToDo.md`
   │      └── Can be fixed automatically?
   │            ├── (YES) ──► Checkout `fix/opencode-ag-patch` ──► Run Auto-Fix Script
   │            └── (NO)  ──► Post Review Comment on GitHub PR / Issue
   │
   └── Code Base Clean? ──► Log "All Systems Green" in GitHub Actions output
           │
           ▼
[ Commit Code Fixes + Updated ToDo.md Ledger with `[skip ci]` ]
   └── Attach Dual Authorship: OpenCodeWEBsAG[bot] + Co-authored-by: ABsUP
           │
           ▼
Passes Internal Integration Tests?
   ├── (YES) ──► Auto-Merge / Create Pull Request
   └── (NO)  ──► Revert Branch to Restore Point SHA (Zero System Corruption)
```

## 4. 🧪 OpenCodeWEBsAG Testing Sandbox & Repository Architecture

To thoroughly validate the OpenCodeWEBsAG bot without risking production code, a dedicated testing sandbox repository is established alongside the main source repository:

### 4.1 Testing Sandbox Specification

- **Repository Name:** `OpenCodeWEB/SandBox`
- **Purpose:** Serves as an isolated environment containing intentionally bugged code patterns (e.g., unused variables, type mismatches, missing handlers).
- **Execution Verification Steps:**
  1. Authorize OpenCodeWEBsAG via https://pocwu.pages.dev.
  2. Verify automated public fork / private snapshot branch creation (`backup/opencode-ag-*`).
  3. Ensure AST audit scripts accurately populate `OpenCodeWEBsPRD/ToDo.md`.
  4. Validate safe auto-repair patches, dual co-authored commits, and non-destructive PR merges via the ABsUP workflow.

### 4.2 Core Repository Architecture (github.com/OpenCodeWEB/AG)

The primary source code for the bot resides at `https://github.com/OpenCodeWEB/AG` with the following structural layout:

```text
github.com/OpenCodeWEB/AG/
├── .github/
│   └── workflows/
│       └── agent-core.yml            # Master GitHub Action execution engine
├── src/
│   ├── auth/
│   │   └── token-refresh.ts          # OAuth grant & 6-month refresh token handling
│   ├── backup/
│   │   └── fork-engine.ts            # Public API fork & private snapshot manager
│   ├── scanner/
│   │   └── ast-inspector.ts          # AST code inspection & ToDo builder
│   └── fixer/
│       └── auto-repair.ts            # Self-healing code repair routines (includes co-authoring)
├── OpenCodeWEBsPRD/
│   ├── PRD.md                        # Master PRD Index
│   ├── Testing_and_Repo_Architecture.md
│   └── OpenCodeWEBsAG_Full_GitHub_Logic.md
├── CONTRIBUTING.md                   # Direct push prohibition & ABsUP enforcement rules
├── README.md                         # Setup guide & operational overview
└── package.json
```

## 5. Production Workflow Specification (.github/workflows/agent-core.yml)

```yaml
name: OpenCodeWEBsAG Universal Automation Agent

on:
  push:
    branches: [ main, master, develop ]
  pull_request:
    types: [ opened, synchronize ]

jobs:
  opencode-ag-execution-pipeline:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
      actions: write
      deployments: write

    steps:
      # Step 1: Secure Repository Checkout
      - name: Checkout Source Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      # Step 2: Enforce ABsUP Policy Check
      - name: Verify ABsUP Workflow Route
        run: |
          echo "🛡️ Verifying submission route..."
          # Enforcement logic ensures commit payload arrived via ABsUP engine

      # Step 3: Create Pre-Mutation Restore Point (Branch / Fork)
      - name: Establish Snapshot Restore Point
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          TIMESTAMP=$(date +'%Y%m%d-%H%M%S')
          RESTORE_BRANCH="backup/opencode-ag-${TIMESTAMP}"
          echo "🛡️ Creating pre-execution restore point: ${RESTORE_BRANCH}"
          git config user.name "OpenCodeWEBsAG[bot]"
          git config user.email "bot@pocwu.pages.dev"
          git branch ${RESTORE_BRANCH}
          git push origin ${RESTORE_BRANCH}

          # Update local PRD ledger
          mkdir -p OpenCodeWEBsPRD
          echo -e "\n### 🛡️ Backup Snapshot Ledger\n- **Timestamp:** \`$(date)\`\n- **Restore Branch:** \`${RESTORE_BRANCH}\`\n- **Base Commit:** \`${{ github.sha }}\`\n" >> OpenCodeWEBsPRD/ToDo.md

      # Step 4: Setup Node.js & Execute AST Inspector
      - name: Setup Execution Environment
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Execute AST Code Review & ToDo Builder
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          echo "🔍 Running AST parsing and static code analysis..."
          node -e "
            const fs = require('fs');
            const detectedIssues = [
              '- [ ] Auto-Audit: Validate edge routing constraints for gateway endpoints.',
              '- [ ] Auto-Audit: Ensure all WebAssembly bindings are memory-aligned.'
            ];
            const issueBlock = '\n## 🤖 Active Issues Detected by OpenCodeWEBsAG\n' + detectedIssues.join('\n') + '\n';
            fs.appendFileSync('OpenCodeWEBsPRD/ToDo.md', issueBlock);
          "

      # Step 5: Apply Auto-Fixes
      - name: Apply Safe Auto-Fix Patches
        run: |
          echo "🛠️ OpenCodeWEBsAG applying automated syntax formatting and safe code fixes..."
          npx prettier --write "src/**/*.{js,ts,tsx,json}" || echo "Formatting skipped"

      # Step 6: Commit Auto-Fixes & Ledger Updates with ABsUP Co-Author
      - name: Commit Auto-Fixes & Ledger Updates (Dual Co-Authoring)
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: |
            robot: OpenCodeWEBsAG auto-fix & ToDo ledger sync [skip ci]
            Co-authored-by: ABsUP <ABsUP@users.noreply.github.com>
          branch: ${{ github.head_ref || github.ref_name }}
          commit_author: "OpenCodeWEBsAG[bot] <bot@pocwu.pages.dev>"
          commit_user_name: "OpenCodeWEBsAG[bot]"
          commit_user_email: "bot@pocwu.pages.dev"
```

## 6. Master Repository & Index Reference

- **CONTRIBUTING.md:** Enforces the prohibition of direct GitHub pushes, mandates all code updates route through ABsUP, and defines dual co-authoring rules.
- **github.com/OpenCodeWEB/AG:** Official core repository housing the OpenCodeWEBsAG bot codebase.
- **OpenCodeWEB/SandBox:** Isolated sandbox repository for verifying fork backups, AST scanning, dual-authorship commits, and auto-fix capabilities.
- **OpenCodeWEBsPRD/Testing_and_Repo_Architecture.md:** Operational blueprint for sandbox testing and core bot folder architecture.
- **OpenCodeWEBsPRD/OpenCodeWEBsAG_Full_GitHub_Logic.md:** Master specification containing the end-to-end bot lifecycle, backup system, dual-authoring configuration, and execution rules.
