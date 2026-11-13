import { getInstallationClient } from "./auth.js";

export async function completeAnalysisCheck(
  installationId: number,
  repositoryFullName: string,
  checkRunId: number,
  breakingChanges: number,
  impactedConsumers: number,
) {
  const [owner, repo] = repositoryFullName.split("/");
  const octokit = await getInstallationClient(installationId);

  return octokit.rest.checks.update({
    owner,
    repo,
    check_run_id: checkRunId,
    status: "completed",
    conclusion: breakingChanges > 0 ? "failure" : "success",
    completed_at: new Date().toISOString(),
    output: {
      title: "API Contract Impact Analysis",
      summary: `Breaking changes: ${breakingChanges}\nImpacted consumers: ${impactedConsumers}`,
    },
  });
}
