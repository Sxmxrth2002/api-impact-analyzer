import "dotenv/config";
import { Worker } from "bullmq";
import { redisConnection } from "../queue/connection.js";
import { ANALYSIS_QUEUE_NAME } from "../queue/analysis-queue.js";
import type { PullRequestJob } from "../server/webhook-types.js";

const worker = new Worker<PullRequestJob>(
  ANALYSIS_QUEUE_NAME,
  async (job) => {
    const { repositoryFullName, pullRequestNumber, baseSha, headSha } =
      job.data;

    console.log("Starting PR analysis:", {
      repository: repositoryFullName,
      pr: pullRequestNumber,
      baseSha,
      headSha,
    });

    // Placeholder: GitHub repository fetching and analysis
    // will be implemented in subsequent steps.

    console.log(`Analysis completed for PR #${pullRequestNumber}`);

    return {
      status: "completed",
      repository: repositoryFullName,
      pullRequestNumber,
    };
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
