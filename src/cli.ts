import { loadOpenAPISpec } from "./analyzer/spec-loader.js";
import { analyzeContract } from "./analyzer/findings.js";

function getArgument(name: string): string {
  const index = process.argv.indexOf(name);

  if (index === -1 || !process.argv[index + 1]) {
    throw new Error(`Missing argument: ${name}`);
  }

  return process.argv[index + 1];
}

async function main(): Promise<void> {
  const beforePath = getArgument("--before");
  const afterPath = getArgument("--after");

  const oldSpec = await loadOpenAPISpec(beforePath);
  const newSpec = await loadOpenAPISpec(afterPath);

  const findings = analyzeContract(oldSpec, newSpec);

  const breaking = findings.filter(
    (finding) => finding.severity === "BREAKING"
  );

  const warnings = findings.filter(
    (finding) => finding.severity === "WARNING"
  );

  console.log("\nAPI Contract Analysis");
  console.log("=====================");
  console.log(`Breaking changes: ${breaking.length}`);
  console.log(`Warnings: ${warnings.length}`);

  for (const finding of findings) {
    console.log(
      `\n[${finding.severity}] ${finding.endpoint}`
    );

    console.log(`  ${finding.message}`);

    for (const [key, value] of Object.entries(finding.details)) {
      console.log(`  ${key}: ${value}`);
    }
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : String(error)
  );
  process.exitCode = 1;
});