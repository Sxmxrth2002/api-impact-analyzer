import { describe, it, expect } from "vitest";
import { loadOpenAPISpec } from "../src/analyzer/spec-loader.js";
import { analyzeContract } from "../src/analyzer/findings.js";

describe("OpenAPI specification loader", () => {
  it("loads and resolves schema references", async () => {
    const spec = await loadOpenAPISpec("examples/old-api.yaml");

    const paths = spec.paths as Record<string, any>;

    const schema =
      paths["/users/{id}"].get.responses["200"].content["application/json"]
        .schema;

    expect(schema.properties.name.type).toBe("string");
  });

  it("detects changes in referenced schemas", async () => {
    const oldSpec = await loadOpenAPISpec("examples/old-api.yaml");

    const newSpec = await loadOpenAPISpec("examples/new-api.yaml");

    const findings = analyzeContract(oldSpec, newSpec);

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "RESPONSE_FIELD_REMOVED",
          endpoint: "GET /users/{id}",
        }),
        expect.objectContaining({
          type: "RESPONSE_TYPE_CHANGED",
          endpoint: "GET /users/{id}",
        }),
      ]),
    );
  });

  it("rejects missing specification files", async () => {
    await expect(
      loadOpenAPISpec("examples/nonexistent.yaml"),
    ).rejects.toThrow();
  });
});
