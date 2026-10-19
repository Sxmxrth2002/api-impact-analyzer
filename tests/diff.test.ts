
import { describe, it, expect } from "vitest";
import { detectRemovedEndpoints, detectRemovedResponseFields, detectResponseTypeChanges } from "../src/analyzer/diff.js";

describe("OpenAPI Contract Diff Engine", () => {

  it("detects a removed endpoint", () => {
    const oldSpec = {
      paths: {
        "/users": {
          get: {},
          post: {}
        }
      }
    };

    const newSpec = {
      paths: {
        "/users": {
          get: {}
        }
      }
    };

    const result = detectRemovedEndpoints(oldSpec, newSpec);

    expect(result).toEqual(["POST /users"]);
  });

  it("returns no changes when endpoints are identical", () => {
    const spec = {
      paths: {
        "/users": {
          get: {}
        }
      }
    };

    expect(detectRemovedEndpoints(spec, spec)).toEqual([]);
  });

  it("does not flag newly added endpoints", () => {
    const oldSpec = {
      paths: {
        "/users": {
          get: {}
        }
      }
    };

    const newSpec = {
      paths: {
        "/users": {
          get: {},
          post: {}
        }
      }
    };

    expect(detectRemovedEndpoints(oldSpec, newSpec)).toEqual([]);
  });

  it("detects multiple removed endpoints", () => {
    const oldSpec = {
      paths: {
        "/users": {
          get: {},
          delete: {}
        },
        "/orders": {
          post: {}
        }
      }
    };

    const newSpec = {
      paths: {
        "/users": {
          get: {}
        }
      }
    };

    const result = detectRemovedEndpoints(oldSpec, newSpec);

    expect(result).toHaveLength(2);
    expect(result).toContain("DELETE /users");
    expect(result).toContain("POST /orders");
  });

  it("handles empty API specifications", () => {
    expect(detectRemovedEndpoints({}, {})).toEqual([]);
  });

  it("detects all methods when a path is removed", () => {
    const oldSpec = {
      paths: {
        "/users": {
          get: {},
          post: {},
          delete: {}
        }
      }
    };

    const newSpec = {
      paths: {}
    };

    const result = detectRemovedEndpoints(oldSpec, newSpec);

    expect(result).toHaveLength(3);
    expect(result).toContain("GET /users");
    expect(result).toContain("POST /users");
    expect(result).toContain("DELETE /users");
  });


  it("detects a removed response field", () => {
  const oldSpec = {
      paths: {
      "/users": {
          get: {
          responses: {
              "200": {
              content: {
                  "application/json": {
                  schema: {
                      type: "object",
                      properties: {
                      id: { type: "integer" },
                      name: { type: "string" },
                      },
                  },
                  },
              },
              },
          },
          },
      },
      },
  };

  const newSpec = structuredClone(oldSpec);
  delete (newSpec.paths["/users"].get.responses["200"]
      .content["application/json"].schema.properties as
      Record<string, unknown>).name;

  const result = detectRemovedResponseFields(oldSpec, newSpec);

  expect(result).toEqual([
      {
      endpoint: "GET /users",
      statusCode: "200",
      mediaType: "application/json",
      field: "name",
      },
  ]);
  });

  it("does not flag newly added response fields", () => {
  const oldSpec = {
      paths: {
      "/users": {
          get: {
          responses: {
              "200": {
              content: {
                  "application/json": {
                  schema: {
                      type: "object",
                      properties: {
                      id: { type: "integer" },
                      },
                  },
                  },
              },
              },
          },
          },
      },
      },
  };

  const newSpec = structuredClone(oldSpec);
  Object.assign(
      newSpec.paths["/users"].get.responses["200"]
      .content["application/json"].schema.properties,
      { name: { type: "string" } }
  );

  expect(detectRemovedResponseFields(oldSpec, newSpec)).toEqual([]);
  });

  it("does not report fields from removed endpoints", () => {
  const oldSpec = {
      paths: {
      "/users": {
          get: {
          responses: {
              "200": {
              content: {
                  "application/json": {
                  schema: {
                      type: "object",
                      properties: {
                      name: { type: "string" },
                      },
                  },
                  },
              },
              },
          },
          },
      },
      },
  };

  expect(
      detectRemovedResponseFields(oldSpec, { paths: {} })
  ).toEqual([]);
  });


  it("detects a response field type change", () => {
    const oldSpec = {
      paths: {
        "/users": {
          get: {
            responses: {
              "200": {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const newSpec = structuredClone(oldSpec);

    newSpec.paths["/users"].get.responses["200"]
      .content["application/json"].schema.properties.id.type = "string";

    const result = detectResponseTypeChanges(oldSpec, newSpec);

    expect(result).toEqual([
      {
        endpoint: "GET /users",
        statusCode: "200",
        mediaType: "application/json",
        field: "id",
        oldType: "integer",
        newType: "string",
      },
    ]);
  });

  it("does not flag unchanged response field types", () => {
    const spec = {
      paths: {
        "/users": {
          get: {
            responses: {
              "200": {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    expect(detectResponseTypeChanges(spec, spec)).toEqual([]);
  });

  it("does not report removed fields as type changes", () => {
    const oldSpec = {
      paths: {
        "/users": {
          get: {
            responses: {
              "200": {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const newSpec = structuredClone(oldSpec);

    delete (
      newSpec.paths["/users"].get.responses["200"]
        .content["application/json"].schema.properties as
        Record<string, unknown>
    ).id;

    expect(detectResponseTypeChanges(oldSpec, newSpec)).toEqual([]);
  });

  it("detects multiple response field type changes", () => {
    const oldSpec = {
      paths: {
        "/users": {
          get: {
            responses: {
              "200": {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        id: { type: "integer" },
                        active: { type: "boolean" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const newSpec = structuredClone(oldSpec);

    const properties = newSpec.paths["/users"].get.responses["200"]
      .content["application/json"].schema.properties;

    properties.id.type = "string";
    properties.active.type = "integer";

    const result = detectResponseTypeChanges(oldSpec, newSpec);

    expect(result).toHaveLength(2);
    expect(result.map(change => change.field)).toEqual([
      "id",
      "active",
    ]);
  });

});