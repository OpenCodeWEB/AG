/**
 * Pre-Mutation Backup Fork Engine
 *
 * Creates safe restore points before any code mutation:
 * - Public repos: forks to a backup namespace via API
 * - Private repos: creates an immutable snapshot branch
 */

export interface BackupResult {
  type: "fork" | "snapshot-branch";
  name: string;
  url: string;
  sha: string;
  timestamp: string;
}

import { githubFetch } from "../github-api.js";

const GITHUB_API = "https://api.github.com";

/**
 * Create a pre-mutation backup for the target repository.
 */
export async function createBackup(
  token: string,
  owner: string,
  repo: string,
  timestamp: string,
): Promise<BackupResult> {
  // Check repository visibility
  const repoInfo = await getRepoInfo(token, owner, repo);
  const isPrivate = repoInfo.private;

  if (isPrivate) {
    return createSnapshotBranch(token, owner, repo, timestamp);
  } else {
    return createFork(token, owner, repo, timestamp);
  }
}

/**
 * Fork a public repository into the backup namespace.
 */
async function createFork(
  token: string,
  owner: string,
  repo: string,
  timestamp: string,
): Promise<BackupResult> {
  const resp = await githubFetch(`${GITHUB_API}/repos/${owner}/${repo}/forks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "OpenCodeWEBsAG/1.0",
    },
    body: JSON.stringify({
      name: `${repo}-backup-${timestamp}`,
      default_branch_only: true,
    }),
  });

  if (!resp.ok) {
    throw new Error(
      `Fork creation failed: ${resp.status} ${await resp.text()}`,
    );
  }

  const data = (await resp.json()) as {
    full_name: string;
    html_url: string;
    default_branch: string;
  };

  return {
    type: "fork",
    name: data.full_name,
    url: data.html_url,
    sha: timestamp,
    timestamp,
  };
}

/**
 * Create an immutable snapshot branch for a private repository.
 */
async function createSnapshotBranch(
  token: string,
  owner: string,
  repo: string,
  timestamp: string,
): Promise<BackupResult> {
  const branchName = `backup/opencode-ag-${timestamp}`;

  // Get default branch HEAD
  const repoInfo = await getRepoInfo(token, owner, repo);
  const defaultBranch = repoInfo.default_branch;

  // Get the latest commit SHA on the default branch
  const refResp = await githubFetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "OpenCodeWEBsAG/1.0",
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
        "User-Agent": "OpenCodeWEBsAG/1.0",
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
    type: "snapshot-branch",
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
): Promise<{ private: boolean; default_branch: string }> {
  const resp = await githubFetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "OpenCodeWEBsAG/1.0",
    },
  });

  if (!resp.ok) {
    throw new Error(`Failed to get repo info: ${resp.status}`);
  }

  return (await resp.json()) as { private: boolean; default_branch: string };
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
