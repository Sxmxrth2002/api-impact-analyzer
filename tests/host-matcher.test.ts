import { describe, it, expect } from "vitest";
import { matchApiEndpoint } from "../src/consumer-analyzer/endpoint-matcher.js";

describe("matchApiEndpoint", () => {
  it("matches requests from the correct host", () => {
    expect(
      matchApiEndpoint(
        "https://api.example.com/users/123",
        "https://api.example.com",
        "/users/{id}",
      ),
    ).toBe(true);
  });

  it("rejects requests from a different host", () => {
    expect(
      matchApiEndpoint(
        "https://another-api.com/users/123",
        "https://api.example.com",
        "/users/{id}",
      ),
    ).toBe(false);
  });

  it("supports API base paths", () => {
    expect(
      matchApiEndpoint(
        "https://api.example.com/v1/users/123",
        "https://api.example.com/v1",
        "/users/{id}",
      ),
    ).toBe(true);
  });
});
