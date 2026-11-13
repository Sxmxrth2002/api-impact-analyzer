import "dotenv/config";
import { getInstallationClient } from "./auth.js";
import { analysisQueue } from "../queue/analysis-queue.js";
import type { PullRequestJob } from "../server/webhook-types.js";

const installationId = Number(process.env.GITHUB_INSTALLATION_ID);
const repositoryFullName = "Sxmxrth2002/api-impact-analyzer";
const pullRequestNumber = 1;

const [owner, repo] = repositoryFullName.split("/");
const octokit = await getInstallationClient(installationId);

const { data: pr } = await octokit.rest.pulls.get({
  owner,
  repo,
  pull_number: pullRequestNumber,
});

const { data: repository } = await octokit.rest.repos.get({
  owner,
  repo,
});

const payload: PullRequestJob = {
  installationId,
  repositoryId: repository.id,
  repositoryFullName,
  pullRequestNumber,
  baseSha: pr.base.sha,
  headSha: pr.head.sha,
};

const job = await analysisQueue.add("analyze-pr", payload, {
  jobId: `${repository.id}-${pullRequestNumber}-${pr.head.sha}`,
});

console.log("Queued job:", job.id);

await analysisQueue.close();
process.exit(0);
