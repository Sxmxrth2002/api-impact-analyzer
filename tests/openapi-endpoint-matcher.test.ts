import { describe, it, expect } from "vitest";
import type { OpenAPIV3 } from "openapi-types";
import { findMatchingEndpoint } from "../src/consumer-analyzer/endpoint-matcher.js";

const spec: OpenAPIV3.Document = {
  openapi: "3.0.0",
  info: {
    title: "Test API",
    version: "1.0.0",
  },
  paths: {
    "/users/{id}": {
      get: {
        responses: {
          "200": { description: "Success" },
        },
      },
    },
    "/users": {
      post: {
        responses: {
          "201": { description: "Created" },
        },
      },
    },
  },
};

describe("OpenAPI Endpoint Matching", () => {
  it("matches a GET request with a path parameter", () => {
    expect(
      findMatchingEndpoint(
        "GET",
        "https://api.example.com/users/123",
        spec
      )
    ).toEqual({
      method: "GET",
      path: "/users/{id}",
    });
  });

  it("matches POST requests", () => {
    expect(
      findMatchingEndpoint(
        "POST",
        "https://api.example.com/users",
        spec
      )
    ).toEqual({
      method: "POST",
      path: "/users",
    });
  });

  it("ignores query parameters", () => {
    expect(
      findMatchingEndpoint(
        "GET",
        "https://api.example.com/users/123?expand=true",
        spec
      )?.path
    ).toBe("/users/{id}");
  });

  it("rejects an unsupported HTTP method", () => {
    expect(
      findMatchingEndpoint(
        "DELETE",
        "https://api.example.com/users/123",
        spec
      )
    ).toBeUndefined();
  });

  it("rejects unknown endpoints", () => {
    expect(
      findMatchingEndpoint(
        "GET",
        "https://api.example.com/orders/123",
        spec
      )
    ).toBeUndefined();
  });

  it("rejects malformed URLs", () => {
    expect(
      findMatchingEndpoint("GET", "not-a-url", spec)
    ).toBeUndefined();
  });
});

describe("OpenAPI Server Validation", () => {
  const serverSpec: OpenAPIV3.Document = {
    ...spec,
    servers: [
      { url: "https://api.example.com/v1" },
    ],
  };

  it("matches the correct host and base path", () => {
    expect(
      findMatchingEndpoint(
        "GET",
        "https://api.example.com/v1/users/123",
        serverSpec
      )
    ).toEqual({
      method: "GET",
      path: "/users/{id}",
    });
  });

  it("rejects requests to a different host", () => {
    expect(
      findMatchingEndpoint(
        "GET",
        "https://payments.example.com/v1/users/123",
        serverSpec
      )
    ).toBeUndefined();
  });

  it("rejects requests with a different base path", () => {
    expect(
      findMatchingEndpoint(
        "GET",
        "https://api.example.com/v2/users/123",
        serverSpec
      )
    ).toBeUndefined();
  });

  it("rejects partial base path matches", () => {
    expect(
      findMatchingEndpoint(
        "GET",
        "https://api.example.com/v1extra/users/123",
        serverSpec
      )
    ).toBeUndefined();
  });
});

describe("Endpoint Specificity", () => {
  const ambiguousSpec: OpenAPIV3.Document = {
    ...spec,
    paths: {
      "/users/{id}": {
        get: {
          responses: {
            "200": { description: "Success" },
          },
        },
      },
      "/users/me": {
        get: {
          responses: {
            "200": { description: "Success" },
          },
        },
      },
    },
  };

  it("prioritizes static paths over dynamic paths", () => {
    expect(
      findMatchingEndpoint(
        "GET",
        "https://api.example.com/users/me",
        ambiguousSpec
      )?.path
    ).toBe("/users/me");
  });

  it("matches dynamic paths when no static match exists", () => {
    expect(
      findMatchingEndpoint(
        "GET",
        "https://api.example.com/users/123",
        ambiguousSpec
      )?.path
    ).toBe("/users/{id}");
  });

  it("matches the correct HTTP method", () => {
    expect(
      findMatchingEndpoint(
        "POST",
        "https://api.example.com/users/me",
        ambiguousSpec
      )
    ).toBeUndefined();
  });
});