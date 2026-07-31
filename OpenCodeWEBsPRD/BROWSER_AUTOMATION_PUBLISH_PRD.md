# 🤖 Autonomous Browser Execution PRD: GitHub Marketplace Publishing

## 1. Executive Summary & Objective

This document defines the execution protocol for **OpenCodeWEBsAG Agent** to autonomously navigate, populate, and publish the `OpenCodeWEBsAG` GitHub App on the GitHub Marketplace via headless browser control.

### 📌 Target Destination URLs

- **App Configuration:** `https://github.com/apps/opencodewebsag`
- **Marketplace Listing Editor:** `https://github.com/marketplace/opencodewebsag/edit`
- **Primary Service URL:** `https://pocwu.pages.dev/AG`
- **Source Repository:** `https://github.com/OpenCodeWEB/AG`

---

## 2. Autonomous Agent Execution Flowchart

```text
[ Agent Browser Session Started ]
               │
               ▼
[ Navigate to: github.com/marketplace/opencodewebsag/edit ]
               │
               ▼
[ Fill Metadata: App Name, URLs, Unlimited Languages ]
               │
               ▼
[ Inject Legal Docs: Privacy Policy, Terms, MIT License ]
               │
               ▼
[ Configure Pricing Plan: Free Tier Enabled ]
               │
               ▼
[ Upload Branding Assets & Screenshots ]
               │
               ▼
[ Click: "Save Draft" -> "Submit for Review / Publish" ]
```

---

## 3. Automation Task Breakdown & Field Injection Data

The OpenCodeWEBsAG agent must fill the web forms using the exact parameters specified below:

### 3.1 General Information Form Injection

| Form Field ID / Label | Automation Value / Input Content |
|---|---|
| App Name | `OpenCodeWEBsAG` |
| Very Short Description | Autonomous universal code auditor, pre-mutation backup engine, & dynamic co-authoring bot. |
| Primary URL | `https://pocwu.pages.dev/AG` |
| Category 1 | Code Quality |
| Category 2 | Workflow Automation |
| Supported Languages | Universal / Unlimited |

### 3.2 Detailed Description Markdown Injection

```markdown
### 🤖 What is OpenCodeWEBsAG?

OpenCodeWEBsAG is an enterprise-grade autonomous AI coding agent designed to inspect, audit, format, and safely repair any codebase regardless of programming language without risking repository integrity.

### ✨ Key Features

- **🌐 Universal / Unlimited Language Support:** Adaptable to any language or framework (TypeScript, Rust, Go, Python, C/C++, Zig, Java, Shell, Docker, and beyond).
- **🛡️ Pre-Mutation Snapshot Engine:** Automatically creates snapshot branches (`backup/opencode-ag-{timestamp}`) before executing code mutations.
- **✍️ Dynamic Multi-Author Commit Standard:** Attributes commits to `ABsUP` as Primary Author, `OpenCodeWEBsAG[bot]` as Co-Author, and dynamically captures the triggering user (`${{ github.actor }}`).
- **🔍 AST Code Audit & Ledger:** Inspects syntax trees and updates structured tasks in `OpenCodeWEBsPRD/ToDo.md`.
```

---

## 4. Browser Agent Safety & Step-by-Step Actions

### Step 1: Authentication & Navigation Verification

- **Action:** Open browser context and verify active session for ABsUP / OpenCodeWEB.
- **Target URL:** `https://github.com/marketplace/opencodewebsag/edit`
- **Assertion:** Verify input element `#marketplace_listing_name` or equivalent form container is visible.

### Step 2: Form Population & Text Injection

- **Action:** Clear existing input buffers and inject text payloads into respective input boxes for Name, URLs, Category tags, and Descriptions.
- **Assertion:** Verify character counts are within GitHub UI limits.

### Step 3: Legal Policy Linking / Document Injection

- **Action:** Link or paste content for PRIVACY_POLICY.md and TERMS.md into designated fields.
- **Privacy Policy URL:** `https://pocwu.pages.dev/AG/privacy` (or embedded text)
- **Terms of Service URL:** `https://pocwu.pages.dev/AG/terms` (or embedded text)

### Step 4: Asset Upload & Plan Selection

- **Action:**
  - Select Free Plan option under Pricing configuration.
  - Upload primary logo asset (290×290).
  - Upload screenshot assets showcasing `backup/opencode-ag-*` snapshots and `Co-authored-by` commit logs.

### Step 5: Final Review & Submission

- **Action:** Locate and click the `#save_listing_draft` button, wait for DOM reload, and trigger `#submit_listing_button`.
- **Log Entry:** Append publication status timestamp to `OpenCodeWEBsPRD/ToDo.md`.

---

## 5. Verification & Rollback Protocol

- **DOM Snapshot Verification:** Agent captures a DOM snapshot after clicking Submit.
- **Success Criterion:** URL redirects to `https://github.com/marketplace/apps/opencodewebsag` or displays status "In Review" / "Published".
- **Failure Handling:** If form validation fails, agent must capture browser logs, log missing field errors in `OpenCodeWEBsPRD/ToDo.md`, and execute pre-mutation restore point rollback.
