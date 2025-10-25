import { describe, it, expect, beforeAll, afterAll } from "vitest";

/**
 * SMOKE TESTS: Happy Path Scenarios
 * 
 * Quick sanity checks that the system is alive and working:
 * - Health check passes
 * - Search returns results
 * - Activity stream connects
 * - Complete workflow: health → search → stream
 */

describe("Smoke Tests – Happy Path Scenarios", () => {
  let baseUrl = "http://localhost:8080";

  beforeAll(() => {
    console.log("🔥 Starting smoke tests – quick sanity checks");
  });

  // ============================================
  // Individual Endpoint Smoke Tests
  // ============================================

  it("health endpoint is alive (200 OK)", async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
    console.log("✅ Health check: ALIVE");
  });

  it("search endpoint returns results for valid query", async () => {
    const response = await fetch(`${baseUrl}/api/v1/search?q=security`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("hits");
    expect(Array.isArray(body.hits)).toBe(true);
    console.log(`✅ Search working: found ${body.total} results`);
  });

  it("activity stream connects (200 OK, SSE)", async () => {
    const response = await fetch(`${baseUrl}/api/v1/activity/stream`);
    expect(response.status).toBe(200);
    
    // Check for SSE headers
    const contentType = response.headers.get("content-type");
    expect(contentType).toMatch(/event-stream/);
    
    console.log("✅ Activity stream: connected");
  });

  // ============================================
  // Search Quality Smoke Tests
  // ============================================

  it("search returns documents with all required fields", async () => {
    const response = await fetch(`${baseUrl}/api/v1/search?q=test`);
    const body = await response.json();
    
    if (body.hits.length > 0) {
      const doc = body.hits[0];
      expect(doc).toHaveProperty("id");
      expect(doc).toHaveProperty("title");
      expect(doc).toHaveProperty("source_id");
      expect(doc).toHaveProperty("published_at");
      console.log(`✅ Documents have required fields`);
    }
  });

  it("search filtering by risk works", async () => {
    const response = await fetch(`${baseUrl}/api/v1/search?q=test&risk=critical`);
    expect(response.status).toBe(200);
    const body = await response.json();
    
    body.hits.forEach(doc => {
      expect(doc.risk).toBe("critical");
    });
    console.log(`✅ Risk filtering works`);
  });

  it("search pagination works (limit)", async () => {
    const response = await fetch(`${baseUrl}/api/v1/search?q=test&limit=2`);
    const body = await response.json();
    expect(body.hits.length).toBeLessThanOrEqual(2);
    console.log(`✅ Pagination works`);
  });

  // ============================================
  // Complete Workflow Smoke Tests
  // ============================================

  it("complete workflow: health → search → stream", async () => {
    console.log("🔄 Running complete workflow...");

    // Step 1: Check health
    const healthResp = await fetch(`${baseUrl}/api/v1/health`);
    expect(healthResp.status).toBe(200);
    const healthBody = await healthResp.json();
    expect(healthBody.status).toBe("ok");
    console.log("  1️⃣  Health check passed");

    // Step 2: Search for data
    const searchResp = await fetch(`${baseUrl}/api/v1/search?q=security`);
    expect(searchResp.status).toBe(200);
    const searchBody = await searchResp.json();
    expect(searchBody.hits).toBeDefined();
    expect(searchBody.hits.length).toBeGreaterThan(0);
    console.log(`  2️⃣  Search successful: ${searchBody.hits.length} results`);

    // Step 3: Connect to stream
    const streamResp = await fetch(`${baseUrl}/api/v1/activity/stream`);
    expect(streamResp.status).toBe(200);
    console.log("  3️⃣  Activity stream connected");

    console.log("✅ Complete workflow successful!");
  });

  // ============================================
  // Error Handling Smoke Tests
  // ============================================

  it("error handling: missing required parameter returns 400", async () => {
    const response = await fetch(`${baseUrl}/api/v1/search`);
    expect(response.status).toBe(400);
    console.log("✅ Error handling works (400 on missing param)");
  });

  it("error handling: graceful degradation on bad input", async () => {
    // Should not crash, should return error
    const response = await fetch(`${baseUrl}/api/v1/search?q=`);
    expect([400, 404]).toContain(response.status);
    console.log("✅ Graceful error handling");
  });

  // ============================================
  // Performance Smoke Tests
  // ============================================

  it("health endpoint responds quickly (<50ms)", async () => {
    const start = Date.now();
    await fetch(`${baseUrl}/api/v1/health`);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(50);
    console.log(`✅ Health check performance: ${duration}ms`);
  });

  it("search endpoint responds in acceptable time (<500ms)", async () => {
    const start = Date.now();
    await fetch(`${baseUrl}/api/v1/search?q=test`);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
    console.log(`✅ Search performance: ${duration}ms`);
  });

  afterAll(() => {
    console.log("🎉 Smoke tests complete!");
  });
});
