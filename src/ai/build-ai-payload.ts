import type { analyzePullRequest } from "../github/analyze-pr.js";

type AnalysisResult = Awaited<ReturnType<typeof analyzePullRequest>>;

export function buildAiPayload(result: AnalysisResult) {
  return {
    removedEndpoints: result.removedEndpoints,
    removedResponseFields: result.removedResponseFields,
    responseTypeChanges: result.responseTypeChanges,
    newRequiredRequestFields: result.newRequiredRequestFields,
    impactedConsumers: result.impactedConsumers
      .slice(0, 10)
      .map((consumer) => ({
        file: consumer.file.split(/[/\\]/).pop(),
        line: consumer.line,
        field: consumer.field,
      })),
  };
}
