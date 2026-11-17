import { getInstallationClient } from "./auth.js";

export async function completeAnalysisCheck(
  installationId: number,
  repositoryFullName: string,
  checkRunId: number,
  breakingChanges: number,
  impactedConsumers: number,
  aiExplanation?: string,
) {
  const [owner, repo] = repositoryFullName.split("/");
  const octokit = await getInstallationClient(installationId);

  const summary = [
    `Breaking changes: ${breakingChanges}`,
    `Impacted consumers: ${impactedConsumers}`,
  ].join("\n");

  return octokit.rest.checks.update({
    owner,
    repo,
    check_run_id: checkRunId,
    status: "completed",
    conclusion: breakingChanges > 0 ? "failure" : "success",
    completed_at: new Date().toISOString(),
    output: {
      title: "API Contract Impact Analysis",
      summary,
      ...(aiExplanation
        ? { text: `## AI-Powered Explanation\n\n${aiExplanation}` }
        : {}),
    },
  });
}
