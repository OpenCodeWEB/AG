/**
 * Shared GitHub REST API fetch helper.
 *
 * Injects the required per-request API version header
 * (`X-GitHub-Api-Version: 2022-11-28`) into every GitHub API call,
 * and a default User-Agent when the caller did not set one.
 *
 * See SYSTEM_UPGRADE_SPEC.md — "Per-Request Header Injection".
 */

export const GITHUB_API_VERSION = "2022-11-28";

export async function githubFetch(
  url: string | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("X-GitHub-Api-Version", GITHUB_API_VERSION);
  if (!headers.has("User-Agent")) {
    headers.set("User-Agent", "OpenCodeWEB/1.0");
  }
  return fetch(url, { ...init, headers });
}
