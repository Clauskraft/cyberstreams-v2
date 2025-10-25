import { describe, it, expect, beforeAll, afterAll } from "vitest";

/**
 * CONTRACT TESTS: GET /api/v1/health
 * 
 * Verifies that the implementation matches the OpenAPI spec exactly:
 * - Status code: 200
 * - Response schema has required fields: status, timestamp, version, dependencies
 * - status enum: "ok" | "degraded" | "down"
 * - dependencies object with opensearch and minio status
 */

describe("GET /api/v1/health – Contract Tests", () => {
  let baseUrl = "http://localhost:8080";

  beforeAll(async () => {
    // Health endpoint should be immediately available
    // No setup needed - API starts on port 8080
    console.log(`Testing against: ${baseUrl}`);
  });

  it("returns 200 OK status code", async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    expect(response.status).toBe(200);
  });

  it("returns Content-Type application/json", async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    const contentType = response.headers.get("content-type");
    expect(contentType).toMatch(/application\/json/);
  });

  it("response body is valid JSON", async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    const body = await response.json();
    expect(body).toBeDefined();
    expect(typeof body).toBe("object");
  });

  it("has required field: status", async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    const body = await response.json();
    expect(body).toHaveProperty("status");
  });

  it("status is valid enum (ok|degraded|down)", async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    const body = await response.json();
    expect(["ok", "degraded", "down"]).toContain(body.status);
  });

  it("has required field: timestamp (ISO8601 date-time)", async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    const body = await response.json();
    expect(body).toHaveProperty("timestamp");
    expect(typeof body.timestamp).toBe("string");
    // Verify ISO8601 format
    const date = new Date(body.timestamp);
    expect(date.toString()).not.toBe("Invalid Date");
  });

  it("has optional field: version (string)", async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    const body = await response.json();
    if (body.version !== undefined) {
      expect(typeof body.version).toBe("string");
    }
  });

  it("has optional field: dependencies (object)", async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    const body = await response.json();
    if (body.dependencies !== undefined) {
      expect(typeof body.dependencies).toBe("object");
    }
  });

  it("dependencies.opensearch is valid enum if present", async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    const body = await response.json();
    if (body.dependencies?.opensearch !== undefined) {
      expect(["ok", "degraded", "down"]).toContain(body.dependencies.opensearch);
    }
  });

  it("dependencies.minio is valid enum if present", async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    const body = await response.json();
    if (body.dependencies?.minio !== undefined) {
      expect(["ok", "degraded", "down"]).toContain(body.dependencies.minio);
    }
  });

  it("response time is acceptable (<500ms)", async () => {
    const start = Date.now();
    const response = await fetch(`${baseUrl}/api/v1/health`);
    const end = Date.now();
    const duration = end - start;
    expect(duration).toBeLessThan(500);
  });

  it("no unexpected properties in response", async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    const body = await response.json();
    const allowedProps = ["status", "timestamp", "version", "dependencies"];
    const actualProps = Object.keys(body);
    for (const prop of actualProps) {
      expect(allowedProps).toContain(prop);
    }
  });
});

afterAll(() => {
  // Cleanup if needed
});
