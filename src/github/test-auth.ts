import { getInstallationClient } from "./auth.js";

const installationId = Number(process.env.GITHUB_INSTALLATION_ID);

if (!Number.isSafeInteger(installationId) || installationId <= 0) {
  throw new Error("Invalid GITHUB_INSTALLATION_ID");
}

const octokit = await getInstallationClient(installationId);

const response = await octokit.request("GET /installation/repositories");

console.log(
  "Accessible repositories:",
  response.data.repositories.map((repo) => repo.full_name),
);
