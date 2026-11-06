import { describe, it, expect } from "vitest";
import path from "node:path";
import { trackRequestPayloads } from "../src/consumer-analyzer/request-tracker.js";

describe("Request payload mutation tracking", () => {
  it("marks mutated payloads as incomplete", () => {
    const filePath = path.resolve("tests/fixtures/mutable-payload.ts");

    const results = trackRequestPayloads(filePath);

    expect(results).toHaveLength(1);
    expect(results[0].fields).toEqual(["name"]);
    expect(results[0].isComplete).toBe(false);
  });

  it("marks Object.assign mutated payloads as incomplete", () => {
    const filePath = path.resolve("tests/fixtures/object-assign-payload.ts");

    const results = trackRequestPayloads(filePath);

    expect(results).toHaveLength(1);
    expect(results[0].fields).toEqual(["name"]);
    expect(results[0].isComplete).toBe(false);
  });

  it("marks aliased payloads as incomplete", () => {
    const filePath = path.resolve("tests/fixtures/aliased-payload.ts");

    const results = trackRequestPayloads(filePath);

    expect(results).toHaveLength(1);
    expect(results[0].fields).toEqual(["name"]);
    expect(results[0].isComplete).toBe(false);
  });

  it("marks payloads passed to other functions as incomplete", () => {
    const filePath = path.resolve("tests/fixtures/function-payload.ts");

    const results = trackRequestPayloads(filePath);

    expect(results).toHaveLength(1);
    expect(results[0].fields).toEqual(["name"]);
    expect(results[0].isComplete).toBe(false);
  });

  it("marks payloads with deleted properties as incomplete", () => {
    const filePath = path.resolve("tests/fixtures/deleted-payload.ts");

    const results = trackRequestPayloads(filePath);

    expect(results).toHaveLength(1);
    expect(results[0].fields).toEqual(["name", "email"]);
    expect(results[0].isComplete).toBe(false);
  });

  it("marks bracket-notation mutations as incomplete", () => {
    const filePath = path.resolve("tests/fixtures/bracket-payload.ts");

    const results = trackRequestPayloads(filePath);

    expect(results).toHaveLength(1);
    expect(results[0].fields).toEqual(["name"]);
    expect(results[0].isComplete).toBe(false);
  });
});
