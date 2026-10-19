import { readFileSync } from "node:fs";
import YAML from "yaml";
import { 
  detectRemovedEndpoints, 
  detectRemovedResponseFields, 
  detectResponseTypeChanges, 
  detectNewRequiredRequestFields, 
  detectRemovedResponseStatusCodes
} from "./analyzer/diff.js";

function getArgument(name: string): string {
  const index = process.argv.indexOf(name);

  if (index === -1 || !process.argv[index + 1]) {
    throw new Error(`Missing argument: ${name}`);
  }

  return process.argv[index + 1];
}

function main(): void {
  const beforePath = getArgument("--before");
  const afterPath = getArgument("--after");

  const oldSpec = YAML.parse(
    readFileSync(beforePath, "utf8")
  );

  const newSpec = YAML.parse(
    readFileSync(afterPath, "utf8")
  );

  const removedEndpoints = detectRemovedEndpoints(
    oldSpec,
    newSpec
  );

  const removedResponseFields = detectRemovedResponseFields(
    oldSpec,
    newSpec
  );

  console.log(
    `Removed endpoints: ${removedEndpoints.length}`
  );

  for (const endpoint of removedEndpoints) {
    console.log(`- ${endpoint}`);
  }

  console.log(
    `Removed response fields: ${removedResponseFields.length}`
  );

  for (const change of removedResponseFields) {
    console.log(`- ${change.endpoint} [${change.statusCode}] ` + `Removed field: ${change.field}`);
  }

  const typeChanges = detectResponseTypeChanges(
    oldSpec,
    newSpec
  );

  console.log(`Response type changes: ${typeChanges.length}`);

  for (const change of typeChanges) {
    console.log(
      `- ${change.endpoint} [${change.statusCode}] ` +
      `Field: ${change.field} ` +
      `(${change.oldType} → ${change.newType})`
    );
  }

  const requiredFields = detectNewRequiredRequestFields(
    oldSpec,
    newSpec
  );

  console.log(`New required request fields: ${requiredFields.length}`);

  for (const change of requiredFields) {
    console.log(
      `- ${change.endpoint} [${change.mediaType}] ` +
      `New required field: ${change.field}`
    );
  }

  const removedStatusCodes = detectRemovedResponseStatusCodes(
    oldSpec,
    newSpec
  );

  console.log(`Removed response status codes: ${removedStatusCodes.length}`);

  for (const change of removedStatusCodes) {
    console.log(
      `- ${change.endpoint} Removed status code: ${change.statusCode}`
    );
  }
}

try {
  main();
} catch (error) {
  console.error(
    error instanceof Error ? error.message : error
  );

  process.exitCode = 1;
}