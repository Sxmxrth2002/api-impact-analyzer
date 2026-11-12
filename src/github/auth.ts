import "dotenv/config";
import { readFileSync } from "node:fs";
import { App } from "octokit";

const appId = process.env.GITHUB_APP_ID;
const privateKeyPath = process.env.GITHUB_PRIVATE_KEY_PATH;

if (!appId || !privateKeyPath) {
  throw new Error("Missing GitHub App credentials");
}

const privateKey = readFileSync(privateKeyPath, "utf8");

export const githubApp = new App({
  appId,
  privateKey,
});

export async function getInstallationClient(installationId: number) {
  return githubApp.getInstallationOctokit(installationId);
}
