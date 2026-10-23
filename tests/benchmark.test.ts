import { describe, it, expect } from "vitest";
import { loadOpenAPISpec } from "../src/analyzer/spec-loader.js";
import { analyzeContract } from "../src/analyzer/findings.js";

describe("Analysis performance baseline", () => {
  it("measures contract analysis execution time", async () => {
    const [oldSpec, newSpec] = await Promise.all([
      loadOpenAPISpec("examples/old-api.yaml"),
      loadOpenAPISpec("examples/new-api.yaml"),
    ]);

    const iterations = 100;
    const durations: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();

      const findings = analyzeContract(oldSpec, newSpec);

      durations.push(performance.now() - start);

      expect(findings).toHaveLength(5);
    }

    durations.sort((a, b) => a - b);

    const average =
      durations.reduce((sum, value) => sum + value, 0) / iterations;

    const p95 = durations[Math.ceil(iterations * 0.95) - 1];

    console.log(`\nContract analysis benchmark (${iterations} runs)`);
    console.log(`Average: ${average.toFixed(3)} ms`);
    console.log(`P95: ${p95.toFixed(3)} ms`);

    expect(average).toBeGreaterThanOrEqual(0);
  });
});
