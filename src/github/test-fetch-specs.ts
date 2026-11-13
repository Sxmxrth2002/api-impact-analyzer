import "dotenv/config";
import { getInstallationClient } from "./auth.js";
import { fetchSpecVersions } from "./fetch-specs.js";

const installationId = Number(process.env.GITHUB_INSTALLATION_ID);
const repositoryFullName = "Sxmxrth2002/api-impact-analyzer";
const prNumber = 1; // Replace with your actual PR number
const specPath = "examples/old-api.yaml"; // Must exist in both revisions

const [owner, repo] = repositoryFullName.split("/");
const octokit = await getInstallationClient(installationId);

const { data: pr } = await octokit.rest.pulls.get({
  owner,
  repo,
  pull_number: prNumber,
});

const { oldSpec, newSpec } = await fetchSpecVersions(
  installationId,
  repositoryFullName,
  specPath,
  pr.base.sha,
  pr.head.sha,
);

console.log("Base SHA:", pr.base.sha);
console.log("Head SHA:", pr.head.sha);
console.log("Old spec length:", oldSpec.length);
console.log("New spec length:", newSpec.length);
