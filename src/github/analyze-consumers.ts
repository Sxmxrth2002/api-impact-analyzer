import { listTypeScriptFiles } from "./list-ts-files.js";
import { fetchGitHubFile } from "./fetch-file.js";
import { trackResponseFields } from "../consumer-analyzer/response-tracker.js";
import { findMatchingEndpoint } from "../consumer-analyzer/endpoint-matcher.js";
import type { OpenAPIV3 } from "openapi-types";

export async function analyzeConsumers(
  installationId: number,
  repositoryFullName: string,
  headSha: string,
  spec: OpenAPIV3.Document,
  removedFields: { endpoint: string; field: string }[],
) {
  const files = await listTypeScriptFiles(
    installationId,
    repositoryFullName,
    headSha,
  );

  const impacts = [];

  for (const file of files) {
    const content = await fetchGitHubFile(
      installationId,
      repositoryFullName,
      file,
      headSha,
    );

    const usages = trackResponseFields(file, content);

    for (const usage of usages) {
      const matched = findMatchingEndpoint(usage.method, usage.url, spec);
      if (!matched) continue;

      const affected = removedFields.some(
        (change) =>
          change.endpoint === `${matched.method} ${matched.path}` &&
          change.field === usage.field,
      );

      if (affected) {
        impacts.push({...usage, file});
      }
    }
  }

  return impacts;
}
