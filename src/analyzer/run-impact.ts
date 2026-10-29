import path from "node:path";
import { loadOpenAPISpec } from "./spec-loader.js";
import { analyzeContract } from "./findings.js";
import { generateImpactReport } from "./impact-report.js";
import { trackResponseFields } from "../consumer-analyzer/response-tracker.js";
import { scanConsumer } from "../consumer-analyzer/scanner.js";

async function main() {
  // Load OpenAPI specifications
  const oldSpec = await loadOpenAPISpec(path.resolve("examples/old-api.yaml"));

  const newSpec = await loadOpenAPISpec(path.resolve("examples/new-api.yaml"));

  // Phase 1: Detect contract changes
  const findings = analyzeContract(oldSpec, newSpec);

  // Consumer source file
  const consumerFile = path.resolve("examples/consumer-service/userClient.ts");

  // Phase 2: Detect response field usage
  const usages = trackResponseFields(consumerFile);

  // Phase 2: Detect API calls
  const apiCalls = scanConsumer(consumerFile);

  // Generate impact report
  const report = generateImpactReport(findings, usages, apiCalls);

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
