import { Queue } from "bullmq";
import { redisConnection } from "./connection.js";
import type { PullRequestJob } from "../server/webhook-types.js";

export const ANALYSIS_QUEUE_NAME = "pr-analysis";

export const analysisQueue = new Queue<PullRequestJob>(ANALYSIS_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});
