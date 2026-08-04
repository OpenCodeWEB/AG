#!/usr/bin/env tsx
/**
 * OpenCodeWEB AST Code Audit Runner
 *
 * Scans all source files in the project, detects issues,
 * and appends them to the ToDo.md ledger.
 *
 * Usage: npx tsx scripts/run-audit.ts
 */

import { readFileSync, readdirSync, appendFileSync } from "node:fs";
import { join, extname } from "node:path";
import { scanFiles, issuesToLedger } from "../src/scanner/ast-inspector.js";

const SRC_DIR = "src";
const EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx",
  ".rs", ".go",
  ".mjs", ".cjs",
]);

interface FileEntry {
  path: string;
  content: string;
}

function walk(dir: string): FileEntry[] {
  const results: FileEntry[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (EXTENSIONS.has(ext)) {
        results.push({ path: full, content: readFileSync(full, "utf-8") });
      }
    }
  }
  return results;
}

function main(): void {
  const files = walk(SRC_DIR);

  if (files.length === 0) {
    console.log("No scannable source files found.");
    return;
  }

  console.log(`Scanning ${files.length} files...`);
  const scanResult = scanFiles(files);
  const { errors, warnings, infos, filesScanned } = scanResult.summary;

  console.log(`Scanned ${filesScanned} files:`);
  console.log(`  Errors:   ${errors}`);
  console.log(`  Warnings: ${warnings}`);
  console.log(`  Info:     ${infos}`);

  if (scanResult.issues.length === 0) {
    console.log("No issues detected.");
    return;
  }

  const ledger = issuesToLedger(scanResult);
  const toDoPath = "OpenCodeWEBsPRD/ToDo.md";
  try {
    appendFileSync(toDoPath, "\n## Active Issues Detected by OpenCodeWEB\n" + ledger + "\n");
    console.log(`Appended ${scanResult.issues.length} issues to ${toDoPath}`);
  } catch {
    // Directory or file may not exist yet
    console.log(`Issues found (${scanResult.issues.length}) but could not write to ${toDoPath}`);
  }

  // Print summary for workflow logs
  for (const issue of scanResult.issues.slice(0, 20)) {
    const icon = issue.severity === "error" ? "🔴" : issue.severity === "warning" ? "🟡" : "🔵";
    console.log(`  ${icon} ${issue.file}:${issue.line}:${issue.column} — ${issue.message}`);
  }
  if (scanResult.issues.length > 20) {
    console.log(`  ... and ${scanResult.issues.length - 20} more issues`);
  }
}

main();
