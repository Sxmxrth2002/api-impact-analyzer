import "dotenv/config";
import { getInstallationClient } from "./auth.js";
import { analyzePullRequest } from "./analyze-pr.js";

const installationId = Number(process.env.GITHUB_INSTALLATION_ID);
const repositoryFullName = "Sxmxrth2002/api-impact-analyzer";
const prNumber = 1;
const specPath = "examples/old-api.yaml";

const [owner, repo] = repositoryFullName.split("/");

const octokit = await getInstallationClient(installationId);

const { data: pr } = await octokit.rest.pulls.get({
  owner,
  repo,
  pull_number: prNumber,
});

const result = await analyzePullRequest(
  installationId,
  repositoryFullName,
  specPath,
  pr.base.sha,
  pr.head.sha,
);

console.log(JSON.stringify(result, null, 2));
