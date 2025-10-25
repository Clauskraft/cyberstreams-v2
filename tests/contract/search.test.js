import { describe, it, expect, beforeAll } from "vitest";

/**
 * CONTRACT TESTS: GET /api/v1/search
 * 
 * Verifies that the implementation matches the OpenAPI spec exactly:
 * - Query parameter 'q' is required
 * - Response schema: { total, hits[], aggregations }
 * - Filters: source, risk, from, to, limit, offset
 * - Status codes: 200 OK, 400 Bad Request, 503 Service Unavailable
 */

describe("GET /api/v1/search – Contract Tests", () => {
  let baseUrl = "http://localhost:8080";

  beforeAll(() => {
    console.log(`Testing search endpoint: ${baseUrl}`);
  });

  // ============================================
  // Required Parameter Tests
  // ============================================

  it("returns 400 when 'q' parameter is missing", async () => {
    const response = await fetch(`${baseUrl}/api/v1/search`);
    expect(response.status).toBe(400);
  });

  it("returns 400 when 'q' parameter is empty string", async () => {
    const response = await fetch(`${baseUrl}/api/v1/search?q=`);
    expect(response.status).toBe(400);
  });

  it("returns 200 when 'q' parameter is provided", async () => {
    const response = await fetch(`${baseUrl}/api/v1/search?q=security`);
    expect(response.status).toBe(200);
  });

  // ============================================
  // Response Schema Tests
  // ============================================

  it("response is valid JSON", async () => {
    const response = await fetch(`${baseUrl}/api/v1/search?q=test`);
    const body = await response.json();
    expect(body).toBeDefined();
    expect(typeof body).toBe("object");
  });

  it("has required field: total (number)", async () => {
    const response = await fetch(`${baseUrl}/api/v1/search?q=test`);
    const body = await response.json();
    expect(body).toHaveProperty("total");
    expect(typeof body.total).toBe("number");
    expect(body.total).toBeGreaterThanOrEqual(0);
  });

  it("has required field: hits (array of Documents)", async () => {
    const response = await fetch(`${baseUrl}/api/v1/search?q=test`);
    const body = await response.json();
    expect(body).toHaveProperty("hits");
    expect(Array.isArray(body.hits)).toBe(true);
  });

  it("has optional field: aggregations (object)", async () => {
    const response = await fetch(`${baseUrl}/api/v1/search?q=test`);
    const body = await response.json();
    if (body.aggregations !== undefined) {
      expect(typeof body.aggregations).toBe("object");
    }
  });

  // ============================================
  // Document Schema Tests (hits array items)
  // ============================================

  it("each document has required field: id (string)", async () => {
    const response = await fetch(`${baseUrl}/api/v1/search?q=test`);
    const body = await response.json();
    body.hits.forEach(doc => {
      expect(doc).toHaveProperty("id");
      expect(typeof doc.id).toBe("string");
    });
  });

  it("each document has required field: title (string)", async () => {
    const response = await fetch(`${baseUrl}/api/v1/search?q=test`);
    const body = await response.json();
    body.hits.forEach(doc => {
      expect(doc).toHaveProperty("title");
      expect(typeof doc.title).toBe("string");
    });
  });

  it("each document has required field: source_id (string)", async () => {
    const response = await fetch(`${baseUrl}/api/v1/search?q=test`);
    const body = await response.json();
    body.hits.forEach(doc => {
      expect(doc).toHaveProperty("source_id");
      expect(typeof doc.source_id).toBe("string");
    });
  });

  it("each document has required field: published_at (ISO8601 date-time)", async () => {
    const response = await fetch(`${baseUrl}/api/v1/search?q=test`);
    const body = await response.json();
    body.hits.forEach(doc => {
      expect(doc).toHaveProperty("published_at");
      const date = new Date(doc.published_at);
      expect(date.toString()).not.toBe("Invalid Date");
    });
  });

  it("each document has optional fields: content, source_name, url, risk, fetched_at, tags, metadata", async () => {
    const response = await fetch(`${baseUrl}/api/v1/search?q=test`);
    const body = await response.json();
    body.hits.forEach(doc => {
      // Optional fields should be typed correctly if present
      if (doc.content !== undefined) expect(typeof doc.content).toBe("string");
      if (doc.source_name !== undefined) expect(typeof doc.source_name).toBe("string");
      if (doc.url !== undefined) expect(typeof doc.url).toBe("string");
      if (doc.risk !== undefined) expect(["low", "medium", "high", "critical"]).toContain(doc.risk);
      if (doc.fetched_at !== undefined) {
        const date = new Date(doc.fetched_at);
        expect(date.toString()).not.toBe("Invalid Date");
      }
      if (doc.tags !== undefined) expect(Array.isArray(doc.tags)).toBe(true);
      if (doc.metadata !== undefined) expect(typeof doc.metadata).toBe("object");
    });
  });

  // ============================================
  // Filter Parameter Tests
  // ============================================

  it("source filter (rss, darkweb, commercial, all) works", async () => {
    for (const source of ["rss", "darkweb", "commercial", "all"]) {
      const response = await fetch(`${baseUrl}/api/v1/search?q=test&source=${source}`);
      expect(response.status).toBeOneOf([200, 400]);
    }
  });

  it("risk filter (low, medium, high, critical) works", async () => {
    for (const risk of ["low", "medium", "high", "critical"]) {
      const response = await fetch(`${baseUrl}/api/v1/search?q=test&risk=${risk}`);
      expect(response.status).toBe(200);
    }
  });

  it("limit parameter (1-100) is respected", async () => {
    const response = await fetch(`${baseUrl}/api/v1/search?q=test&limit=5`);
    const body = await response.json();
    expect(body.hits.length).toBeLessThanOrEqual(5);
  });

  it("offset parameter skips documents correctly", async () => {
    const response1 = await fetch(`${baseUrl}/api/v1/search?q=test&offset=0&limit=10`);
    const body1 = await response1.json();
    const firstId = body1.hits[0]?.id;

    const response2 = await fetch(`${baseUrl}/api/v1/search?q=test&offset=1&limit=10`);
    const body2 = await response2.json();
    const secondFirstId = body2.hits[0]?.id;

    if (body1.total >= 2) {
      expect(firstId).not.toBe(secondFirstId);
    }
  });

  // ============================================
  // Date Range Filter Tests
  // ============================================

  it("from parameter (ISO8601) accepts valid dates", async () => {
    const date = new Date();
    const isoDate = date.toISOString();
    const response = await fetch(`${baseUrl}/api/v1/search?q=test&from=${encodeURIComponent(isoDate)}`);
    expect(response.status).toBe(200);
  });

  it("to parameter (ISO8601) accepts valid dates", async () => {
    const date = new Date();
    const isoDate = date.toISOString();
    const response = await fetch(`${baseUrl}/api/v1/search?q=test&to=${encodeURIComponent(isoDate)}`);
    expect(response.status).toBe(200);
  });

  // ============================================
  // Response Metadata Tests
  // ============================================

  it("total matches number of results when no pagination", async () => {
    const response = await fetch(`${baseUrl}/api/v1/search?q=test&limit=1000`);
    const body = await response.json();
    if (body.total <= 1000) {
      expect(body.hits.length).toBe(body.total);
    }
  });

  it("response time is acceptable (<1000ms)", async () => {
    const start = Date.now();
    const response = await fetch(`${baseUrl}/api/v1/search?q=test`);
    const end = Date.now();
    expect(end - start).toBeLessThan(1000);
  });
});

// Helper for matching one of multiple values
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    return {
      pass,
      message: () => `expected ${received} to be one of ${expected.join(", ")}`
    };
  }
});
