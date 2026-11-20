import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { resolve } from "node:path";
import { database } from "../db/client.js";

const app = Fastify({ logger: true });
const positiveId = { type: "integer", minimum: 1, maximum: 2147483647 };

app.addHook("onClose", () => database.$disconnect());

app.get<{ Querystring: { before?: number } }>(
  "/api/analyses",
  {
    schema: {
      querystring: { type: "object", properties: { before: positiveId } },
    },
  },
  async ({ query }, reply) => {
    reply.header("Cache-Control", "no-store");
    const pageSize = 25;
    const records = await database.analysis.findMany({
      where: query.before ? { id: { lt: query.before } } : {},
      orderBy: { id: "desc" },
      take: pageSize + 1,
      select: {
        id: true,
        repositoryFullName: true,
        pullRequestNumber: true,
        headSha: true,
        breakingChanges: true,
        impactedConsumers: true,
        createdAt: true,
      },
    });
    const analyses = records.slice(0, pageSize);
    return {
      analyses,
      nextBefore: records.length > pageSize ? analyses.at(-1)!.id : null,
    };
  },
);

app.get<{ Params: { id: number } }>(
  "/api/analyses/:id",
  {
    schema: {
      params: {
        type: "object",
        required: ["id"],
        properties: { id: positiveId },
      },
    },
  },
  async ({ params }, reply) => {
    reply.header("Cache-Control", "no-store");
    const analysis = await database.analysis.findUnique({
      where: { id: params.id },
    });
    return analysis ?? reply.code(404).send({ error: "Analysis not found" });
  },
);

await app.register(fastifyStatic, { root: resolve("dist/dashboard") });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => void app.close());
}

try {
  await app.listen({ host: "127.0.0.1", port: 3001 });
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exitCode = 1;
}
