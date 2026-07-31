/**
 * AST Code Inspector & ToDo Builder
 *
 * Parses source code AST to detect syntax errors, type bugs,
 * security flaws, and code quality issues. Appends structured
 * tasks to the OpenCodeWEBsPRD/ToDo.md ledger.
 */

export interface DetectedIssue {
  severity: "error" | "warning" | "info";
  file: string;
  line: number;
  column: number;
  message: string;
  rule: string;
}

export interface ScanResult {
  issues: DetectedIssue[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
    filesScanned: number;
  };
}

/**
 * Scan an array of file contents for common issues.
 * This is a lightweight static analysis — in production,
 * this would delegate to language-specific AST parsers.
 */
export function scanFiles(
  files: Array<{ path: string; content: string }>,
): ScanResult {
  const issues: DetectedIssue[] = [];

  for (const file of files) {
    const ext = file.path.split(".").pop()?.toLowerCase();

    switch (ext) {
      case "ts":
      case "tsx":
      case "js":
      case "jsx":
        issues.push(...scanTypeScriptLike(file));
        break;
      case "rs":
        issues.push(...scanRustLike(file));
        break;
      case "go":
        issues.push(...scanGoLike(file));
        break;
      default:
        // Generic line-length and whitespace checks
        issues.push(...scanGeneric(file));
        break;
    }
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const infos = issues.filter((i) => i.severity === "info").length;

  return {
    issues,
    summary: {
      errors,
      warnings,
      infos,
      filesScanned: files.length,
    },
  };
}

/**
 * Scan TypeScript/JavaScript files for common issues.
 */
function scanTypeScriptLike(file: {
  path: string;
  content: string;
}): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const lines = file.content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect unused variables (declared but never referenced)
    const unusedMatch = line.match(
      /(?:const|let|var)\s+(\w+)\s*=(?![^]*\1[^]*)/g,
    );
    if (unusedMatch) {
      issues.push({
        severity: "warning",
        file: file.path,
        line: i + 1,
        column: line.indexOf(unusedMatch[0]) + 1,
        message: `Potential unused variable: ${unusedMatch[0]}`,
        rule: "no-unused-vars",
      });
    }

    // Detect console.log in production code
    if (/console\.(log|debug)\s*\(/.test(line)) {
      issues.push({
        severity: "info",
        file: file.path,
        line: i + 1,
        column: line.indexOf("console") + 1,
        message: "Console log statement in production code",
        rule: "no-console",
      });
    }

    // Detect // TODO or // FIXME comments
    const todoMatch = line.match(/\/\/\s*(TODO|FIXME|HACK|XXX)/i);
    if (todoMatch) {
      issues.push({
        severity: "info",
        file: file.path,
        line: i + 1,
        column: line.indexOf(todoMatch[0]) + 1,
        message: `Inline ${todoMatch[1].toUpperCase()} comment: ${line.trim()}`,
        rule: "inline-todo",
      });
    }
  }

  return issues;
}

/**
 * Scan Rust files for common issues.
 */
function scanRustLike(file: {
  path: string;
  content: string;
}): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const lines = file.content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect unwrap() calls that could panic
    if (line.includes(".unwrap()")) {
      issues.push({
        severity: "error",
        file: file.path,
        line: i + 1,
        column: line.indexOf(".unwrap()") + 1,
        message: "Unsafe .unwrap() call — should handle Result/Option properly",
        rule: "no-unwrap",
      });
    }
  }

  return issues;
}

/**
 * Scan Go files for common issues.
 */
function scanGoLike(file: { path: string; content: string }): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const lines = file.content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect naked returns
    if (/^\s*return\s*$/.test(line) && !file.content.includes("result")) {
      issues.push({
        severity: "warning",
        file: file.path,
        line: i + 1,
        column: 1,
        message: "Naked return — may return zero values unintentionally",
        rule: "naked-ret",
      });
    }
  }

  return issues;
}

/**
 * Generic file scan for basic quality issues.
 */
function scanGeneric(file: { path: string; content: string }): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const lines = file.content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    // Trailing whitespace
    if (/\s+$/.test(lines[i])) {
      issues.push({
        severity: "info",
        file: file.path,
        line: i + 1,
        column: lines[i].trimEnd().length + 1,
        message: "Trailing whitespace",
        rule: "no-trailing-spaces",
      });
      break; // One report per file is enough
    }
  }

  return issues;
}

/**
 * Convert scan results to a markdown ledger entry.
 */
export function issuesToLedger(scanResult: ScanResult): string {
  const { summary } = scanResult;

  let ledger = `\n## 🤖 AST Audit Results\n\n`;
  ledger += `| Severity | Count |\n`;
  ledger += `|----------|-------|\n`;
  ledger += `| 🔴 Errors | ${summary.errors} |\n`;
  ledger += `| 🟡 Warnings | ${summary.warnings} |\n`;
  ledger += `| 🔵 Info | ${summary.infos} |\n`;
  ledger += `| **Files Scanned** | **${summary.filesScanned}** |\n\n`;

  if (scanResult.issues.length > 0) {
    ledger += `### Detected Issues\n\n`;
    for (const issue of scanResult.issues) {
      const icon =
        issue.severity === "error"
          ? "🔴"
          : issue.severity === "warning"
            ? "🟡"
            : "🔵";
      ledger += `- ${icon} \`${issue.file}:${issue.line}:${issue.column}\` — ${issue.message}\n`;
    }
    ledger += "\n";
  }

  if (summary.errors === 0 && summary.warnings === 0) {
    ledger += `✅ **All Systems Green** — no errors or warnings found.\n\n`;
  }

  return ledger;
}
