/**
 * Local end-to-end test of worker/src/repos.ts against the real GitHub API.
 * Creates a throwaway repo in the OpenCodeWEB org, verifies it, then deletes it.
 *
 * Run: npx tsx test-repos-e2e.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { handleCreateRepo } from "./src/repos.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PEM = readFileSync(resolve(__dirname, "../gateway/opencodeweb-pkcs8.pem"), "utf8").trim();

const env = {
  APP_ID: "4460111",
  PRIVATE_KEY: PEM,
  INSTALLATION_ID: "150684882", // OpenCodeWEB org
  INTERNAL_GATEWAY_TOKEN: "local-test-token",
  // No AG_TOKENS_KV in local test -> explicit installationId used
};

const repoName = `ocw-e2e-${Date.now()}`;
console.log(`\n=== Creating repo: OpenCodeWEB/${repoName} ===\n`);

const request = new Request("https://worker/repos", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Gateway-Token": "local-test-token" },
  body: JSON.stringify({
    owner: "OpenCodeWEB",
    name: repoName,
    description: "Temporary E2E test repo — auto-deleted",
    private: true,
    autoInit: false,
    installationId: "150684882",
  }),
});

const response = await handleCreateRepo(env, request);
const body = await response.json();
console.log("Status:", response.status);
console.log("Body:", JSON.stringify(body, null, 2));

if (response.status !== 201 || !body.ok) {
  console.error("\n!!! CREATION FAILED — aborting cleanup");
  process.exit(1);
}

// ── Cleanup: delete the test repo via GitHub API ────────────────── //
console.log("\n=== Cleaning up: deleting test repo ===\n");
import { generateAppJwt, getInstallationToken } from "../src/auth/github.ts";

const jwt = await generateAppJwt({ appId: "4418346", privateKey: PEM, installationId: "149676194" });
const { token } = await getInstallationToken(jwt, "149676194");

const del = await fetch(`https://api.github.com/repos/OpenCodeWEB/${repoName}`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "OpenCodeWEBsAG/1.0",
  },
});
console.log("Delete status:", del.status, del.status === 204 ? "(ok)" : `(${await del.text()})`);
console.log(del.status === 204 ? "\n✅ E2E PASS — repo created and cleaned up" : "\n⚠️ Repo created but cleanup failed — delete manually");
