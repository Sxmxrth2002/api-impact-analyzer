import path from "node:path";
import { loadOpenAPISpec } from "./spec-loader.js";
import { analyzeContract } from "./findings.js";
import { generateImpactReport } from "./impact-report.js";
import { trackResponseFields } from "../consumer-analyzer/response-tracker.js";
import { scanConsumer } from "../consumer-analyzer/scanner.js";
import { trackRequestPayloads } from "../consumer-analyzer/request-tracker.js";
import { findTypeScriptFiles } from "../consumer-analyzer/file-scanner.js";

async function main() {
  // Load OpenAPI specifications
  const oldSpec = await loadOpenAPISpec(path.resolve("examples/old-api.yaml"));

  const newSpec = await loadOpenAPISpec(path.resolve("examples/new-api.yaml"));

  // Get the API server URL for host-aware matching
  const serverUrl = oldSpec.servers?.[0]?.url;

  if (!serverUrl) {
    throw new Error("OpenAPI server URL is missing");
  }

  // Phase 1: Detect contract changes
  const findings = analyzeContract(oldSpec, newSpec);

  // Discover all TypeScript consumer files
  const consumerDirectory = path.resolve("examples/consumer-service");

  const consumerFiles = findTypeScriptFiles(consumerDirectory);

  // Phase 2: Analyze consumer code
  const usages = consumerFiles.flatMap((file) => trackResponseFields(file));

  const apiCalls = consumerFiles.flatMap((file) => scanConsumer(file));

  const payloads = consumerFiles.flatMap((file) => trackRequestPayloads(file));

  // Generate consolidated impact report
  const report = generateImpactReport(
    findings,
    usages,
    apiCalls,
    payloads,
    serverUrl,
  );

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
