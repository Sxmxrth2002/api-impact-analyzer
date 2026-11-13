import { getInstallationClient } from "./auth.js";

export async function createAnalysisCheck(
  installationId: number,
  repositoryFullName: string,
  headSha: string,
) {
  const [owner, repo] = repositoryFullName.split("/");
  const octokit = await getInstallationClient(installationId);

  return octokit.rest.checks.create({
    owner,
    repo,
    name: "API Contract Impact Analysis",
    head_sha: headSha,
    status: "in_progress",
  });
}