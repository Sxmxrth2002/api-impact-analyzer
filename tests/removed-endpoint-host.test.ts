import { describe, expect, it } from "vitest";
import { matchRemovedEndpointCalls } from "../src/analyzer/impact-report.js";
import type { Finding } from "../src/analyzer/findings.js";
import type { ApiCall } from "../src/consumer-analyzer/scanner.js";

describe("Removed endpoint host matching", () => {
  it("matches only calls to the correct API host", () => {
    const finding: Finding = {
      type: "ENDPOINT_REMOVED",
      severity: "BREAKING",
      endpoint: "GET /users/{id}",
      message: "Endpoint removed: GET /users/{id}",
      details: {},
    };

    const apiCalls: ApiCall[] = [
      {
        method: "GET",
        url: "https://api.example.com/users/123",
        file: "correct.ts",
        line: 10,
      },
      {
        method: "GET",
        url: "https://other-api.com/users/123",
        file: "incorrect.ts",
        line: 20,
      },
    ];

    const impacts = matchRemovedEndpointCalls(
      finding,
      apiCalls,
      "https://api.example.com",
    );

    expect(impacts).toHaveLength(1);
    expect(impacts[0].file).toBe("correct.ts");
  });
});
