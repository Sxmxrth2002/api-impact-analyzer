import { describe, it, expect } from "vitest";
import { matchEndpoint } from "../src/consumer-analyzer/endpoint-matcher.js";

describe("Endpoint Matcher", () => {
  it("matches identical paths", () => {
    expect(matchEndpoint("/users", "/users")).toBe(true);
  });

  it("matches dynamic path parameters", () => {
    expect(matchEndpoint("/users/123", "/users/{id}")).toBe(true);
  });

  it("matches multiple path parameters", () => {
    expect(
      matchEndpoint(
        "/users/123/orders/456",
        "/users/{userId}/orders/{orderId}",
      ),
    ).toBe(true);
  });

  it("rejects different paths", () => {
    expect(matchEndpoint("/posts/123", "/users/{id}")).toBe(false);
  });

  it("rejects different segment counts", () => {
    expect(matchEndpoint("/users/123/posts", "/users/{id}")).toBe(false);
  });

  it("does not treat partial segments as parameters", () => {
    expect(matchEndpoint("/users/123", "/users/user-{id}")).toBe(false);
  });
});
