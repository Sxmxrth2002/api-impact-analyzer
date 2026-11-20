import type { analyzePullRequest } from "../github/analyze-pr.js";
import type { PullRequestJob } from "../server/webhook-types.js";
import { database } from "./client.js";

export async function saveAnalysis(
  job: PullRequestJob,
  result: Awaited<ReturnType<typeof analyzePullRequest>>,
  breakingChanges: number,
  aiExplanation: string | undefined,
) {
  const revision = {
    repositoryId: String(job.repositoryId),
    pullRequestNumber: job.pullRequestNumber,
    baseSha: job.baseSha,
    headSha: job.headSha,
  };

  const findings = {
    repositoryFullName: job.repositoryFullName,
    breakingChanges,
    impactedConsumers: result.impactedConsumers.length,
    result: {
      ...result,
      removedResponseFields: result.removedResponseFields.map((change) => ({
        ...change,
      })),
      responseTypeChanges: result.responseTypeChanges.map((change) => ({
        ...change,
      })),
      newRequiredRequestFields: result.newRequiredRequestFields.map(
        (change) => ({ ...change }),
      ),
      removedStatusCodes: result.removedStatusCodes.map((change) => ({
        ...change,
      })),
    },
  };

  await database.analysis.upsert({
    where: { repositoryId_pullRequestNumber_baseSha_headSha: revision },
    create: { ...revision, ...findings, aiExplanation },
    update: { ...findings, aiExplanation },
  });
}
