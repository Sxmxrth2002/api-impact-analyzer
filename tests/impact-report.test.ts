import { describe, it, expect } from "vitest";
import { matchConsumerImpacts } from "../src/analyzer/impact-report.js";
import type { Finding } from "../src/analyzer/findings.js";
import type { ResponseFieldUsage } from "../src/consumer-analyzer/response-tracker.js";
import { matchRemovedEndpointCalls } from "../src/analyzer/impact-report.js";
import type { ApiCall } from "../src/consumer-analyzer/scanner.js";

describe("Impact Report Matcher", () => {
  const finding: Finding = {
    type: "RESPONSE_FIELD_REMOVED",
    severity: "BREAKING",
    endpoint: "GET /users/{id}",
    message: "Response field removed: name",
    details: {
      statusCode: "200",
      mediaType: "application/json",
      field: "name",
    },
  };

  const usages: ResponseFieldUsage[] = [
    {
      method: "GET",
      url: "https://api.example.com/users/123",
      variable: "user",
      field: "name",
      file: "userClient.ts",
      line: 10,
    },
    {
      method: "GET",
      url: "https://api.example.com/users/456",
      variable: "user",
      field: "email",
      file: "userClient.ts",
      line: 20,
    },
    {
      method: "POST",
      url: "https://api.example.com/users/123",
      variable: "user",
      field: "name",
      file: "otherClient.ts",
      line: 30,
    },
    {
      method: "GET",
      url: "https://api.example.com/products/123",
      variable: "product",
      field: "name",
      file: "productClient.ts",
      line: 40,
    },
  ];

  it("matches only consumers accessing the removed response field", () => {
    const result = matchConsumerImpacts(finding, usages);

    expect(result.severity).toBe("BREAKING");
    expect(result.method).toBe("GET");
    expect(result.endpoint).toBe("/users/{id}");
    expect(result.change).toBe("Response field removed: name");

    expect(result.impactedConsumers).toEqual([
      {
        file: "userClient.ts",
        line: 10,
        field: "name",
        variable: "user",
      },
    ]);
  });

  it("returns no impacted consumers when the field is unused", () => {
    const result = matchConsumerImpacts(
      {
        ...finding,
        details: {
          ...finding.details,
          field: "age",
        },
      },
      usages,
    );

    expect(result.impactedConsumers).toEqual([]);
  });

  it("matches response type changes using the same field-level logic", () => {
    const result = matchConsumerImpacts(
      {
        ...finding,
        type: "RESPONSE_TYPE_CHANGED",
        message: "Response field type changed: name",
        details: {
          ...finding.details,
          oldType: "string",
          newType: "integer",
        },
      },
      usages,
    );

    expect(result.impactedConsumers).toHaveLength(1);
    expect(result.impactedConsumers[0].line).toBe(10);
  });

  it("detects consumers calling a removed endpoint", () => {
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
        file: "userClient.ts",
        line: 5,
      },
      {
        method: "GET",
        url: "https://api.example.com/users/456",
        file: "userClient.ts",
        line: 20,
      },
      {
        method: "POST",
        url: "https://api.example.com/users/123",
        file: "userClient.ts",
        line: 30,
      },
      {
        method: "GET",
        url: "https://api.example.com/products/123",
        file: "productClient.ts",
        line: 40,
      },
    ];

    const result = matchRemovedEndpointCalls(finding, apiCalls);

    expect(result).toHaveLength(2);

    expect(result.map((call) => call.line)).toEqual([5, 20]);

    expect(result.every((call) => call.method === "GET")).toBe(true);
  });
});
