/**
 * Self-Healing Auto-Repair Engine
 *
 * Applies automated fixes for common issues detected by the AST scanner.
 * Operates on isolated `fix/opencode-ag-*` branches and commits
 * with dual authorship (ABsUP + OpenCodeWEBsAG).
 */

import type { DetectedIssue } from "../scanner/ast-inspector.js";

export interface FixResult {
  file: string;
  fixApplied: string;
  success: boolean;
  error?: string;
}

const CO_AUTHOR =
  "Co-authored-by: OpenCodeWEBsAG <ID+OpenCodeWEBsAG@users.noreply.github.com>";
const COMMIT_AUTHOR = "ABsUP <ABsUP@users.noreply.github.com>";

/**
 * Attempt to auto-fix detected issues in the given file content.
 * Returns the fixed content and a list of applied fixes.
 */
export function applyAutoFixes(
  filePath: string,
  content: string,
  issues: DetectedIssue[],
): { fixedContent: string; fixes: FixResult[] } {
  let fixedContent = content;
  const fixes: FixResult[] = [];

  // Filter issues relevant to this file
  const fileIssues = issues.filter((i) => i.file === filePath);

  for (const issue of fileIssues) {
    const fix = tryFixIssue(filePath, fixedContent, issue);
    if (fix) {
      fixedContent = fix.fixedContent;
      fixes.push(fix.fixResult);
    }
  }

  return { fixedContent, fixes };
}

/**
 * Try to fix a single issue.
 */
function tryFixIssue(
  filePath: string,
  content: string,
  issue: DetectedIssue,
): { fixedContent: string; fixResult: FixResult } | null {
  const lines = content.split("\n");
  const lineIndex = issue.line - 1;

  if (lineIndex < 0 || lineIndex >= lines.length) {
    return null;
  }

  const line = lines[lineIndex];

  switch (issue.rule) {
    case "no-trailing-spaces": {
      lines[lineIndex] = line.replace(/\s+$/, "");
      return {
        fixedContent: lines.join("\n"),
        fixResult: {
          file: filePath,
          fixApplied: `Trimmed trailing whitespace on line ${issue.line}`,
          success: true,
        },
      };
    }

    case "no-console": {
      // Replace console.log/debug with a noop or comment them
      lines[lineIndex] = line.replace(
        /console\.(log|debug)\s*\(/g,
        "// console.$1(",
      );
      return {
        fixedContent: lines.join("\n"),
        fixResult: {
          file: filePath,
          fixApplied: `Commented out console.${line.match(/console\.(log|debug)/)?.[1] ?? "log"} on line ${issue.line}`,
          success: true,
        },
      };
    }

    case "no-unwrap": {
      // Comment out the .unwrap() and add a suggestion
      lines[lineIndex] = line.replace(
        /\.unwrap\(\)/g,
        "/* .unwrap() — TODO: handle error properly */",
      );
      return {
        fixedContent: lines.join("\n"),
        fixResult: {
          file: filePath,
          fixApplied: `Flagged unsafe .unwrap() on line ${issue.line}`,
          success: true,
        },
      };
    }

    default:
      return null;
  }
}

/**
 * Generate a commit message with proper dual authorship.
 */
export function buildCommitMessage(
  fixes: FixResult[],
  branchName: string,
): string {
  const fixCount = fixes.filter((f) => f.success).length;
  const failCount = fixes.filter((f) => !f.success).length;

  const lines: string[] = [
    `robot: OpenCodeWEBsAG auto-repair (${fixCount} fix${fixCount !== 1 ? "es" : ""}) [skip ci]`,
    "",
    `Branch: ${branchName}`,
    "",
  ];

  if (fixCount > 0) {
    lines.push("### Fixes Applied");
    for (const fix of fixes) {
      if (fix.success) {
        lines.push(`- ✅ ${fix.fixApplied}`);
      }
    }
    lines.push("");
  }

  if (failCount > 0) {
    lines.push("### Failed Fixes");
    for (const fix of fixes) {
      if (!fix.success) {
        lines.push(`- ❌ ${fix.file}: ${fix.error}`);
      }
    }
    lines.push("");
  }

  lines.push(CO_AUTHOR);

  return lines.join("\n");
}

/**
 * Create a fix branch name for the given timestamp.
 */
export function createFixBranchName(timestamp: string): string {
  return `fix/opencode-ag-${timestamp}`;
}

export { CO_AUTHOR, COMMIT_AUTHOR };
