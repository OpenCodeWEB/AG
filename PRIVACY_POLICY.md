# Privacy Policy for OpenCodeWEB

**Effective Date:** July 29, 2026

OpenCodeWEB ("we", "bot", "service") is committed to protecting the privacy and security of your repositories.

### 1. Data Collection
OpenCodeWEB processes source code, commit metadata, and execution triggers solely to perform automated AST auditing, static code analysis, and snapshot backups. 

### 2. Data Storage & Retention
- We do **not** store your repository code on external servers.
- All operations execute in isolated ephemeral CI/CD environments (GitHub Actions / Cloudflare Workers).
- Temporary access tokens are short-lived and automatically invalidated following workflow completion.

### 3. Third-Party Sharing
We do not sell, share, or monetize repository data or metadata. Data processing occurs strictly within the authorized GitHub Organization boundary (`OpenCodeWEB`).

### 4. Contact & Opt-Out
Users can revoke bot access at any time via GitHub App Settings -> Installed GitHub Apps -> OpenCodeWEB -> Uninstall.
