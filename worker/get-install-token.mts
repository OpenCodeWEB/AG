/**
 * Generate a GitHub App installation token for the OpenCodeWEB org
 * and print it to stdout (used to push workflow commits).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { generateAppJwt, getInstallationToken } from "../src/auth/github.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PEM = readFileSync(resolve(__dirname, "../gateway/opencodeweb-pkcs8.pem"), "utf8").trim();
const installationId = process.argv[2] ?? "150684882"; // OpenCodeWEB org

const jwt = await generateAppJwt({ appId: "4460111", privateKey: PEM, installationId });
const { token, expires_at } = await getInstallationToken(jwt, installationId);
console.log(token);
console.error(`Token expires: ${expires_at}`);
