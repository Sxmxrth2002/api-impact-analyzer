import { describe, it, expect } from "vitest";
import { trackResponseFields } from "../src/consumer-analyzer/response-tracker.js";
import path from "node:path";

describe("Response Field Tracker", () => {
  const filePath = path.resolve("examples/consumer-service/userClient.ts");

  const results = trackResponseFields(filePath);

  it("should detect fields from fetch response.json()", () => {
    const fields = results.filter((result) =>
      result.url.endsWith("/users/123"),
    );

    expect(fields).toHaveLength(1);
    expect(fields[0].method).toBe("GET");
    expect(fields[0].variable).toBe("user");
    expect(fields[0].field).toBe("name");
  });

  it("should detect fields from Axios response.data", () => {
    const fields = results.filter((result) =>
      result.url.endsWith("/users/456"),
    );

    expect(fields).toHaveLength(2);

    expect(fields.map((field) => field.field).sort()).toEqual([
      "email",
      "name",
    ]);
  });

  it("should detect destructured response fields", () => {
    const fields = results.filter((result) =>
      result.url.endsWith("/users/789"),
    );

    expect(fields).toHaveLength(2);

    expect(fields.map((field) => field.field).sort()).toEqual([
      "email",
      "name",
    ]);

    expect(fields.every((field) => field.variable === "user")).toBe(true);
  });

  it("should detect direct Axios destructuring", () => {
    const fields = results.filter((result) =>
      result.url.endsWith("/users/999"),
    );

    expect(fields).toHaveLength(2);

    expect(fields.map((field) => field.field).sort()).toEqual([
      "email",
      "name",
    ]);

    expect(fields.every((field) => field.variable === "data")).toBe(true);
  });

  it("should correctly associate fields with their API requests", () => {
    const user123 = results.filter((result) =>
      result.url.endsWith("/users/123"),
    );

    const user456 = results.filter((result) =>
      result.url.endsWith("/users/456"),
    );

    expect(user123.map((result) => result.field)).toEqual(["name"]);

    expect(user456.map((result) => result.field).sort()).toEqual([
      "email",
      "name",
    ]);
  });

  it("should include valid file paths and line numbers", () => {
    for (const result of results) {
      expect(result.file).toBe(filePath);
      expect(result.line).toBeGreaterThan(0);
    }
  });
});
