import "dotenv/config";
import { Worker } from "bullmq";
import { redisConnection } from "../queue/connection.js";
import { ANALYSIS_QUEUE_NAME } from "../queue/analysis-queue.js";
import type { PullRequestJob } from "../server/webhook-types.js";
import { analyzePullRequest } from "../github/analyze-pr.js";
import { createAnalysisCheck } from "../github/create-check.js";
import { completeAnalysisCheck } from "../github/complete-check.js";

const worker = new Worker<PullRequestJob>(
  ANALYSIS_QUEUE_NAME,
  async (job) => {
    const {
      installationId,
      repositoryFullName,
      pullRequestNumber,
      baseSha,
      headSha,
    } = job.data;

    console.log(`Analyzing PR #${pullRequestNumber}`);

    const check = await createAnalysisCheck(
      installationId,
      repositoryFullName,
      headSha,
    );

    try {
      const result = await analyzePullRequest(
        installationId,
        repositoryFullName,
        "examples/old-api.yaml",
        baseSha,
        headSha,
      );

      const breakingChanges =
        result.removedEndpoints.length +
        result.removedResponseFields.length +
        result.responseTypeChanges.length +
        result.newRequiredRequestFields.length;

      await completeAnalysisCheck(
        installationId,
        repositoryFullName,
        check.data.id,
        breakingChanges,
        result.impactedConsumers.length,
      );

      console.log("PR analysis result:", JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      await completeAnalysisCheck(
        installationId,
        repositoryFullName,
        check.data.id,
        1,
        0,
      );

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  },
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error);
});

worker.on("error", (error) => {
  console.error("Worker error:", error);
});

console.log("PR analysis worker started");
