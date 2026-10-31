import { describe, it, expect } from "vitest";
import { matchRequiredRequestFields } from "../src/analyzer/impact-report.js";
import type { Finding } from "../src/analyzer/findings.js";
import type { RequestPayloadUsage } from "../src/consumer-analyzer/request-tracker.js";

describe("matchRequiredRequestFields", () => {
  const finding: Finding = {
    type: "REQUEST_FIELD_REQUIRED",
    severity: "BREAKING",
    endpoint: "POST /users",
    message: "New required request field: email",
    details: { field: "email" },
  };

  const payloads: RequestPayloadUsage[] = [
    {
      method: "POST",
      url: "https://api.example.com/users",
      file: "userClient.ts",
      line: 10,
      fields: ["name"],
      isComplete: true,
    },
    {
      method: "POST",
      url: "https://api.example.com/users",
      file: "userClient.ts",
      line: 20,
      fields: ["name", "email"],
      isComplete: true,
    },
    {
      method: "PATCH",
      url: "https://api.example.com/users/123",
      file: "userClient.ts",
      line: 30,
      fields: ["name"],
      isComplete: true,
    },
  ];

  it("detects requests missing the required field", () => {
    const impacts = matchRequiredRequestFields(finding, payloads);

    expect(impacts).toHaveLength(1);
    expect(impacts[0].line).toBe(10);
    expect(impacts[0].missingField).toBe("email");
  });

  it("ignores requests that already contain the required field", () => {
    const impacts = matchRequiredRequestFields(finding, [payloads[1]]);

    expect(impacts).toHaveLength(0);
  });

  it("ignores requests with different HTTP methods", () => {
    const impacts = matchRequiredRequestFields(finding, [payloads[2]]);

    expect(impacts).toHaveLength(0);
  });

  it("ignores incomplete payloads to prevent false positives", () => {
    const impacts = matchRequiredRequestFields(finding, [
      {
        method: "POST",
        url: "https://api.example.com/users",
        file: "userClient.ts",
        line: 40,
        fields: ["name"],
        isComplete: false,
      },
    ]);

    expect(impacts).toHaveLength(0);
  });
});
