import { describe, expect, it } from "vitest";
import { matchConsumerImpacts } from "../src/analyzer/impact-report.js";
import type { Finding } from "../src/analyzer/findings.js";
import type { ResponseFieldUsage } from "../src/consumer-analyzer/response-tracker.js";

describe("Response field host matching", () => {
  it("only reports usages from the correct API host", () => {
    const finding: Finding = {
      type: "RESPONSE_FIELD_REMOVED",
      severity: "BREAKING",
      endpoint: "GET /users/{id}",
      message: "Response field removed: name",
      details: { field: "name" },
    };

    const usages: ResponseFieldUsage[] = [
      {
        method: "GET",
        url: "https://api.example.com/users/123",
        file: "correct.ts",
        line: 10,
        field: "name",
        variable: "user",
      },
      {
        method: "GET",
        url: "https://other-api.com/users/123",
        file: "incorrect.ts",
        line: 20,
        field: "name",
        variable: "user",
      },
    ];

    const result = matchConsumerImpacts(
      finding,
      usages,
      "https://api.example.com",
    );

    expect(result.impactedConsumers).toHaveLength(1);
    expect(result.impactedConsumers[0].file).toBe("correct.ts");
  });
});
