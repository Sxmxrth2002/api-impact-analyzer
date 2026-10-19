import { loadOpenAPISpec } from "./analyzer/spec-loader.js";
import { analyzeContract } from "./analyzer/findings.js";
import type { Finding } from "./analyzer/findings.js";

function getArgument(name: string): string {
  const index = process.argv.indexOf(name);

  if (
    index === -1 ||
    !process.argv[index + 1] ||
    process.argv[index + 1].startsWith("--")
  ) {
    throw new Error(`Missing argument: ${name}`);
  }

  return process.argv[index + 1];
}

interface AnalysisReport {
  summary: {
    total: number;
    breaking: number;
    warnings: number;
  };
  findings: Finding[];
  durationMs: number;
}

async function main(): Promise<void> {
  const beforePath = getArgument("--before");
  const afterPath = getArgument("--after");

  const format = process.argv.includes("--format")
    ? getArgument("--format")
    : "text";

  if (format !== "text" && format !== "json") {
    throw new Error("Format must be 'text' or 'json'");
  }

  const start = performance.now();

  const [oldSpec, newSpec] = await Promise.all([
    loadOpenAPISpec(beforePath),
    loadOpenAPISpec(afterPath),
  ]);

  const findings = analyzeContract(oldSpec, newSpec);

  const durationMs = Number(
    (performance.now() - start).toFixed(2)
  );

  const report: AnalysisReport = {
    summary: {
      total: findings.length,
      breaking: findings.filter(
        (finding) => finding.severity === "BREAKING"
      ).length,
      warnings: findings.filter(
        (finding) => finding.severity === "WARNING"
      ).length,
    },
    findings,
    durationMs,
  };

  if (format === "json") {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log("\nAPI Contract Analysis");
    console.log("=====================");
    console.log(`Breaking changes: ${report.summary.breaking}`);
    console.log(`Warnings: ${report.summary.warnings}`);

    for (const finding of findings) {
      console.log(
        `\n[${finding.severity}] ${finding.endpoint}`
      );
      console.log(`  ${finding.message}`);

      for (const [key, value] of Object.entries(finding.details)) {
        console.log(`  ${key}: ${value}`);
      }
    }

    console.log(`\nAnalysis time: ${durationMs} ms`);
  }
  if (report.summary.breaking > 0) {
    process.exitCode = 2;
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : String(error)
  );

  process.exitCode = 1;
});
