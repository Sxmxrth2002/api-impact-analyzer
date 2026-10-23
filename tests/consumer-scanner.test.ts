import { describe, it, expect } from "vitest";
import { scanConsumer } from "../src/consumer-analyzer/scanner.js";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function scanCode(code: string) {
  const directory = mkdtempSync(join(tmpdir(), "api-scanner-"));
  const filePath = join(directory, "consumer.ts");

  try {
    writeFileSync(filePath, code);
    return scanConsumer(filePath);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("Consumer API Scanner", () => {
  it("detects fetch GET requests", () => {
    const results = scanCode(`
      fetch("https://api.example.com/users/123");
    `);

    expect(results).toHaveLength(1);
    expect(results[0].method).toBe("GET");
    expect(results[0].url).toBe("https://api.example.com/users/123");
  });

  it("detects fetch POST requests", () => {
    const results = scanCode(`
      fetch("https://api.example.com/users", {
        method: "POST"
      });
    `);

    expect(results[0].method).toBe("POST");
  });

  it("detects axios.get requests", () => {
    const results = scanCode(`
      axios.get("https://api.example.com/users/123");
    `);

    expect(results[0].method).toBe("GET");
  });

  it("detects axios.patch requests", () => {
    const results = scanCode(`
      axios.patch("https://api.example.com/users/123", {});
    `);

    expect(results[0].method).toBe("PATCH");
  });

  it("detects axios config-object requests", () => {
    const results = scanCode(`
      axios({
        method: "DELETE",
        url: "https://api.example.com/users/123"
      });
    `);

    expect(results[0].method).toBe("DELETE");
  });

  it("ignores unrelated function calls", () => {
    const results = scanCode(`
      console.log("Hello");
      JSON.stringify({ name: "Samarth" });
    `);

    expect(results).toHaveLength(0);
  });

  it("ignores dynamic URLs", () => {
    const results = scanCode(`
      const url = "https://api.example.com/users";
      fetch(url);
    `);

    expect(results).toHaveLength(0);
  });

  it("records file path and line number", () => {
    const results = scanCode('fetch("https://api.example.com/users");');

    expect(results[0].file).toContain("consumer.ts");
    expect(results[0].line).toBe(1);
  });
});
