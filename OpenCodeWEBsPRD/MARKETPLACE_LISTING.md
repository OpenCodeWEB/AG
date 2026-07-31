# 🚀 OpenCodeWEBsAG — GitHub Marketplace Listing Specification

## 1. Marketplace Metadata & Overview

| Attribute | Specification Value |
| :--- | :--- |
| **App Name** | `OpenCodeWEBsAG` |
| **Short Description** | Autonomous universal code auditor, pre-mutation backup engine, & dynamic co-authoring bot. |
| **Categories** | Code Quality, Workflow Automation, CI/CD |
| **Target Audience** | Open-source maintainers, polyglot engineering teams, and automated SaaS workflows. |
| **Supported Languages** | **Universal / Unlimited** (Any language supported by standard AST parsers & containerized toolchains) |
| **Primary URL** | `https://pocwu.pages.dev/AG` |
| **Source Repository** | `https://github.com/OpenCodeWEB/AG` |

---

## 2. Marketplace Detailed Description (Copy-Paste Ready)

### 🤖 What is OpenCodeWEBsAG?

**OpenCodeWEBsAG** is an enterprise-grade autonomous AI coding agent designed to inspect, audit, format, and safely repair any codebase regardless of programming language without risking repository integrity.

Operating under strict pre-mutation backup rules, OpenCodeWEBsAG ensures that no code is altered without first creating an immutable snapshot restore point.

### ✨ Key Features

- **🌐 Universal / Unlimited Language Support:** Fully adaptable to any language, runtime, or framework (TypeScript, JavaScript, Rust, Go, Python, C/C++, Zig, Java, Kotlin, Swift, Ruby, PHP, Shell, Docker, and beyond).
- **🛡️ Pre-Mutation Snapshot Engine:** Automatically generates encrypted public forks or immutable snapshot branches (`backup/opencode-ag-{timestamp}`) prior to executing any code modifications.
- **✍️ Dynamic Multi-Author Commit Standard:** Automatically attributes commits to `ABsUP` as Primary Author, `OpenCodeWEBsAG[bot]` as Co-Author, and dynamically captures the active triggering user (`${{ github.actor }}`).
- **🔍 AST Code Audit & Ledger:** Inspects code syntax trees for errors, security flaws, and type mismatches, appending structured tasks to `OpenCodeWEBsPRD/ToDo.md`.
- **⚡ Universal Build Verification:** Seamlessly executes language-agnostic build scripts, static linters, and custom verification suites across all runtime environments.
- **🚫 Direct Push Enforcement:** Mandates structured workflow routing through the `ABsUP` engine, preventing unauthorized direct branch pushes.

---

## 3. Recommended Permissions & Events

When registering your GitHub App, configure the following granular permissions:

### Repository Permissions

- **Contents:** `Read & write` (For committing auto-fixes and backup branches)
- **Pull Requests:** `Read & write` (For opening self-healing PRs)
- **Issues:** `Read & write` (For posting AST audit summaries)
- **Workflows:** `Read & write` (For running CI/CD automation pipelines)

### Event Subscriptions

- `Push`
- `Pull Request`
- `Workflow Dispatch`

---

## 4. Legal & Compliance Documents

### 🔒 Privacy Policy (`PRIVACY_POLICY.md`)

```markdown
# Privacy Policy for OpenCodeWEBsAG

**Effective Date:** July 29, 2026

OpenCodeWEBsAG ("we", "bot", "service") is committed to protecting the privacy and security of your repositories.

### 1. Data Collection
OpenCodeWEBsAG processes source code, commit metadata, and execution triggers solely to perform automated AST auditing, static code analysis, and snapshot backups. 

### 2. Data Storage & Retention
- We do **not** store your repository code on external servers.
- All operations execute in isolated ephemeral CI/CD environments (GitHub Actions / Cloudflare Workers).
- Temporary access tokens are short-lived and automatically invalidated following workflow completion.

### 3. Third-Party Sharing
We do not sell, share, or monetize repository data or metadata. Data processing occurs strictly within the authorized GitHub Organization boundary (`OpenCodeWEB`).

### 4. Contact & Opt-Out
Users can revoke bot access at any time via GitHub App Settings -> Installed GitHub Apps -> OpenCodeWEBsAG -> Uninstall.
```

### 📜 Terms of Service (`TERMS.md`)

```markdown
# Terms of Service for OpenCodeWEBsAG

**Effective Date:** July 29, 2026

By installing and authorizing OpenCodeWEBsAG, you agree to the following terms:

### 1. License & Usage
OpenCodeWEBsAG is granted permission to inspect repository contents, generate snapshot backup branches (`backup/opencode-ag-*`), and submit automated commits using the configured dual/triple co-authorship syntax.

### 2. Limitation of Liability
OpenCodeWEBsAG is provided "as is" without warranty of any kind. While the bot enforces mandatory pre-mutation snapshots prior to code modifications, the maintainers are not liable for unintended code mutations or build failures.

### 3. Acceptable Use
You agree not to use OpenCodeWEBsAG to distribute malicious code, execute unauthorized crypto mining, or bypass security boundaries outside your designated organization scope.
```

### 📄 MIT License (`LICENSE`)

```text
MIT License

Copyright (c) 2026 OpenCodeWEB & ABsUP Engine

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 5. Screenshot & Media Requirements

For the Marketplace listing, provide the following media assets:

| Asset | Specification | Content |
|-------|--------------|---------|
| **Logo** | 120×120px PNG | AG icon (blue gradient, white "AG" text) |
| **Screenshot 1** | 1200×900px | AG Dashboard — Gateway status, hero section |
| **Screenshot 2** | 1200×900px | Feature cards — Pre-Mutation, Co-Authoring, Languages |
| **Screenshot 3** | 1200×900px | Architecture table — Ecosystem components |
| **Screenshot 4** | 1200×900px | Privacy/ToS/License footer area |
| **Screenshot 5** (optional) | 1200×900px | Worker health endpoint JSON response |

---

## 6. Branding & Visual Guidelines

- **Primary Color:** `#2563eb` (Blue 600)
- **Secondary Gradient:** `#2563eb → #1e40af`
- **Dark Background:** `#0b0f19`
- **Font:** Inter (system-ui fallback)
- **Glass UI:** Backdrop blur, semi-transparent cards
- **Typography:** White headings, gray-400 body text, blue-400 accents

All listing media should maintain the dark theme aesthetic consistent with `pocwu.pages.dev/AG`.
