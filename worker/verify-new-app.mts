/**
 * Verify the OpenCodeWEB (opencodeweb) GitHub App credentials:
 *   1. JWT signed with gateway/opencodeweb-pkcs8.pem as app 4460111
 *   2. GET /app                  → proves the key belongs to the app
 *   3. POST /app/installations/150684882/access_tokens → proves installation + shows permissions
 *   4. GET /installation/repositories → shows what the new app can see
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { generateAppJwt, getInstallationToken } from "../src/auth/github.js";
import { githubFetch } from "../src/github-api.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const APP_ID = "4460111";
const INSTALLATION_ID = "150684882";
const PEM = readFileSync(
  resolve(__dirname, "../gateway/opencodeweb-pkcs8.pem"),
  "utf8",
).trim();

const jwt = await generateAppJwt({ appId: APP_ID, privateKey: PEM, installationId: INSTALLATION_ID });

// 2. GET /app
const appResp = await githubFetch("https://api.github.com/app", {
  headers: { Authorization: `Bearer ${jwt}` },
});
const app = await appResp.json();
console.log("APP:", JSON.stringify({ id: app.id, slug: app.slug, name: app.name }, null, 0));

// 3. Installation access token
const { token, permissions, repositorySelection } = await getInstallationToken(jwt, INSTALLATION_ID);
console.log("INSTALL:", JSON.stringify({ installationId: INSTALLATION_ID, repositorySelection, permissions }, null, 0));

// 4. Repositories visible to the new app
const reposResp = await githubFetch(
  `https://api.github.com/installation/repositories?per_page=100`,
  { headers: { Authorization: `Bearer ${token}` } },
);
const repos = await reposResp.json();
console.log("REPOS:", (repos.repositories ?? []).map((r: any) => `${r.full_name} (${r.default_branch})`).join(", "));
