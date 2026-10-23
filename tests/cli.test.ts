import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";

function runCLI(args: string[]) {
  return spawnSync(
    process.execPath,
    ["--import", "tsx", "src/cli.ts", ...args],
    {
      encoding: "utf8",
      cwd: process.cwd(),
    },
  );
}

describe("CLI integration tests", () => {
  const before = "examples/old-api.yaml";
  const after = "examples/new-api.yaml";

  it("outputs valid JSON with expected findings", () => {
    const result = runCLI([
      "--before",
      before,
      "--after",
      after,
      "--format",
      "json",
    ]);

    expect(result.status).toBe(2);
    expect(result.stderr).toBe("");

    const report = JSON.parse(result.stdout);

    expect(report.summary).toEqual({
      total: 5,
      breaking: 3,
      warnings: 2,
    });

    expect(report.findings).toHaveLength(5);
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("returns exit code 0 for identical specifications", () => {
    const result = runCLI([
      "--before",
      before,
      "--after",
      before,
      "--format",
      "json",
    ]);

    expect(result.status).toBe(0);

    const report = JSON.parse(result.stdout);

    expect(report.summary.breaking).toBe(0);
    expect(report.findings).toEqual([]);
  });

  it("returns exit code 1 for missing files", () => {
    const result = runCLI(["--before", "missing.yaml", "--after", after]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Invalid OpenAPI specification");
  });

  it("rejects unsupported output formats", () => {
    const result = runCLI([
      "--before",
      before,
      "--after",
      after,
      "--format",
      "xml",
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Format must be 'text' or 'json'");
  });

  it("rejects missing required arguments", () => {
    const result = runCLI([]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Missing argument: --before");
  });
});
