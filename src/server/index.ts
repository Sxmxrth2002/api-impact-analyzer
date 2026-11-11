import Fastify from "fastify";
import { createHmac, timingSafeEqual } from "node:crypto";
import "dotenv/config";
import { extractPullRequestJob } from "./webhook-types.js";

const app = Fastify({
  logger: true,
});

const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

if (!webhookSecret) {
  throw new Error("GITHUB_WEBHOOK_SECRET is missing");
}

app.addContentTypeParser(
  "application/json",
  { parseAs: "buffer" },
  (request, body, done) => {
    done(null, body);
  },
);

app.post("/webhooks/github", async (request, reply) => {
  const signature = request.headers["x-hub-signature-256"];

  if (typeof signature !== "string") {
    return reply.code(401).send({ error: "Missing signature" });
  }

  const rawBody = request.body as Buffer;

  const expectedSignature =
    "sha256=" +
    createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    return reply.code(401).send({ error: "Invalid signature" });
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return reply.code(400).send({
      error: "Invalid JSON payload",
    });
  }

  const event = request.headers["x-github-event"];

  if (event !== "pull_request") {
    return reply.code(200).send({
      message: "Event ignored",
    });
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("action" in payload) ||
    typeof payload.action !== "string"
  ) {
    return reply.code(400).send({
      error: "Invalid pull request payload",
    });
  }

  const supportedActions = new Set(["opened", "synchronize", "reopened"]);

  if (!supportedActions.has(payload.action)) {
    return reply.code(200).send({
      message: "Action ignored",
    });
  }

  const job = extractPullRequestJob(payload);

  if (!job) {
    return reply.code(400).send({
      error: "Invalid pull request metadata",
    });
  }

  app.log.info(
    {
      repository: job.repositoryFullName,
      pr: job.pullRequestNumber,
      baseSha: job.baseSha,
      headSha: job.headSha,
      installationId: job.installationId,
    },
    "Validated pull request event",
  );

  return reply.code(200).send({
    message: "Webhook verified",
  });
});

async function start() {
  try {
    await app.listen({
      port: 3000,
      host: "127.0.0.1",
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
