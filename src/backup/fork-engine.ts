/**
 * Pre-Mutation Backup Engine
 *
 * Creates safe restore points before any code mutation.
 *
 * Policy (repo-wide): for every repository, backups are always stored as a
 * new branch pointing at the `main` branch HEAD inside the SAME repository.
 * Separate backup repositories are NEVER created.
 */
export interface BackupResult {
  type: "branch";
  name: string;
  url: string;
  sha: string;
  timestamp: string;
}

import { githubFetch } from "../github-api.js";

const GITHUB_API = "https://api.github.com";

/**
 * Create a pre-mutation backup branch for the target repository.
 */
export async function createBackup(
  token: string,
  owner: string,
  repo: string,
  timestamp: string,
): Promise<BackupResult> {
  return createBackupBranch(token, owner, repo, timestamp);
}

/**
 * Create a backup branch off the default branch (`main`) HEAD,
 * storing the snapshot inside the repository itself.
 */
async function createBackupBranch(
  token: string,
  owner: string,
  repo: string,
  timestamp: string,
): Promise<BackupResult> {
  const branchName = `backup/opencode-${repo}-${timestamp}`;

  // Get default branch HEAD
  const repoInfo = await getRepoInfo(token, owner, repo);
  const defaultBranch = repoInfo.default_branch;

  // Get the latest commit SHA on the default branch
  const refResp = await githubFetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "OpenCodeWEB/1.0",
      },
    },
  );

  if (!refResp.ok) {
    throw new Error(`Failed to get HEAD ref: ${refResp.status}`);
  }

  const refData = (await refResp.json()) as { object: { sha: string } };
  const sha = refData.object.sha;

  // Create new branch from that SHA
  const branchResp = await githubFetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/refs`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "OpenCodeWEB/1.0",
      },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha,
      }),
    },
  );

  if (!branchResp.ok) {
    throw new Error(`Branch creation failed: ${branchResp.status}`);
  }

  return {
    type: "branch",
    name: branchName,
    url: `https://github.com/${owner}/${repo}/tree/${branchName}`,
    sha,
    timestamp,
  };
}

/**
 * Get information about a repository.
 */
async function getRepoInfo(
  token: string,
  owner: string,
  repo: string,
): Promise<{ default_branch: string }> {
  const resp = await githubFetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "OpenCodeWEB/1.0",
    },
  });

  if (!resp.ok) {
    throw new Error(`Failed to get repo info: ${resp.status}`);
  }

  return (await resp.json()) as { default_branch: string };
}

/**
 * Record the backup result in the ToDo ledger.
 */
export function recordBackup(backup: BackupResult): string {
  const entry = [
    "",
    `### 🛡️ Backup Snapshot`,
    `- **Type:** \`${backup.type}\``,
    `- **Name:** \`${backup.name}\``,
    `- **URL:** ${backup.url}`,
    `- **Base SHA:** \`${backup.sha}\``,
    `- **Timestamp:** \`${backup.timestamp}\``,
    "",
  ].join("\n");

  return entry;
}
