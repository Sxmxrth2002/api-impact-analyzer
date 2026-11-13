import { fetchSpecVersions } from "./fetch-specs.js";
import { loadOpenAPISpecFromString } from "../analyzer/spec-loader.js";
import {
  detectRemovedEndpoints,
  detectRemovedResponseFields,
  detectResponseTypeChanges,
  detectNewRequiredRequestFields,
  detectRemovedResponseStatusCodes,
} from "../analyzer/diff.js";
import { analyzeConsumers } from "./analyze-consumers.js";

export async function analyzePullRequest(
  installationId: number,
  repositoryFullName: string,
  specPath: string,
  baseSha: string,
  headSha: string,
) {
  const { oldSpec: oldYaml, newSpec: newYaml } = await fetchSpecVersions(
    installationId,
    repositoryFullName,
    specPath,
    baseSha,
    headSha,
  );

  const [oldSpec, newSpec] = await Promise.all([
    loadOpenAPISpecFromString(oldYaml),
    loadOpenAPISpecFromString(newYaml),
  ]);

  const removedResponseFields = detectRemovedResponseFields(oldSpec, newSpec);

  const impactedConsumers = await analyzeConsumers(
    installationId,
    repositoryFullName,
    headSha,
    oldSpec,
    removedResponseFields,
  );

  return {
    removedEndpoints: detectRemovedEndpoints(oldSpec, newSpec),
    removedResponseFields,
    impactedConsumers,
    responseTypeChanges: detectResponseTypeChanges(oldSpec, newSpec),
    newRequiredRequestFields: detectNewRequiredRequestFields(oldSpec, newSpec),
    removedStatusCodes: detectRemovedResponseStatusCodes(oldSpec, newSpec),
  };
}
