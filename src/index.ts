/**
 * OpenCodeWEB — Autonomous Polyglot AI Agent
 *
 * Main entry point. Orchestrates the full lifecycle:
 *   1. Token validation/refresh
 *   2. Pre-mutation backup creation
 *   3. AST code audit
 *   4. Auto-repair with dual authorship commit
 */

export {
  exchangeCode,
  refreshAccessToken,
  ensureValidToken,
} from "./auth/token-refresh.js";
export type { TokenPayload, TokenStore } from "./auth/token-refresh.js";

export {
  generateAppJwt,
  getInstallationToken,
  verifyWebhookSignature,
} from "./auth/github.js";
export type { GitHubAppConfig, InstallationToken } from "./auth/github.js";

export { createBackup, recordBackup } from "./backup/fork-engine.js";
export type { BackupResult } from "./backup/fork-engine.js";

export { scanFiles, issuesToLedger } from "./scanner/ast-inspector.js";
export type { DetectedIssue, ScanResult } from "./scanner/ast-inspector.js";

export {
  applyAutoFixes,
  buildCommitMessage,
  createFixBranchName,
} from "./fixer/auto-repair.js";
export type { FixResult } from "./fixer/auto-repair.js";
