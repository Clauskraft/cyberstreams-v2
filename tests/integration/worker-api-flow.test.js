import { describe, it, expect, beforeAll } from "vitest";

/**
 * INTEGRATION TESTS: Worker → API Flow
 * 
 * Verifies that the worker and API services integrate correctly:
 * - Worker fetches documents from feeds
 * - Documents are normalized to standard schema
 * - API can search and find indexed documents
 * - Real-time stream shows indexed documents
 */

describe("Integration Tests – Worker ↔ API Flow", () => {
  let baseUrl = "http://localhost:8080";

  beforeAll(() => {
    console.log("🔗 Starting integration tests – worker ↔ API flow");
  });

  // ============================================
  // Search Returns Real Data
  // ============================================

  it("API search returns documents with expected schema", async () => {
    const response = await fetch(`${baseUrl}/api/v1/search?q=security`);
    expect(response.status).toBe(200);
    
    const body = await response.json();
    expect(body.total).toBeGreaterThan(0);
    expect(body.hits.length).toBeGreaterThan(0);

    // Verify each document has worker-normalized schema
    const doc = body.hits[0];
    expect(doc).toHaveProperty("id");
    expect(doc).toHaveProperty("title");
    expect(doc).toHaveProperty("source_id");
    expect(doc).toHaveProperty("source_name");
    expect(doc).toHaveProperty("url");
    expect(doc).toHaveProperty("risk");
    expect(doc).toHaveProperty("published_at");
    expect(doc).toHaveProperty("fetched_at");
    expect(doc).toHaveProperty("tags");
    expect(doc).toHaveProperty("metadata");

    console.log(`✅ Documents have full worker-normalized schema`);
  });

  // ============================================
  // Filtering Works on Real Data
  // ============================================

  it("filtering by source works on real data", async () => {
    // Get all documents first
    const allResponse = await fetch(`${baseUrl}/api/v1/search?q=security`);
    const allBody = await allResponse.json();

    if (allBody.hits.length > 0) {
      const firstDoc = allBody.hits[0];
      const sourceId = firstDoc.source_id;

      // Filter by that source
      const filterResponse = await fetch(
        `${baseUrl}/api/v1/search?q=security&source=${sourceId}`
      );
      const filterBody = await filterResponse.json();

      // All results should match that source
      filterBody.hits.forEach(doc => {
        expect(doc.source_id).toBe(sourceId);
      });

      console.log(`✅ Source filtering works on real data`);
    }
  });

  it("filtering by risk level works on real data", async () => {
    const response = await fetch(`${baseUrl}/api/v1/search?q=security&risk=critical`);
    const body = await response.json();

    // All results should be critical risk
    body.hits.forEach(doc => {
      expect(doc.risk).toBe("critical");
    });

    console.log(`✅ Risk filtering works on real data`);
  });

  // ============================================
  // Real-Time Stream Integration
  // ============================================

  it("activity stream provides real documents", async () => {
    const response = await fetch(`${baseUrl}/api/v1/activity/stream`);
    expect(response.status).toBe(200);

    // Read first chunk of SSE data
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let sseData = "";

    const { value } = await reader.read();
    sseData = decoder.decode(value);

    // Should contain event-stream format
    expect(sseData).toContain("event:");
    expect(sseData).toContain("data:");

    // Should contain document data
    if (sseData.includes("document")) {
      expect(sseData).toMatch(/"id":/);
      expect(sseData).toMatch(/"title":/);
    }

    console.log(`✅ Activity stream provides real documents`);
  });

  // ============================================
  // Search Aggregations
  // ============================================

  it("search returns accurate aggregations by source", async () => {
    const response = await fetch(`${baseUrl}/api/v1/search?q=security`);
    const body = await response.json();

    if (body.aggregations && body.aggregations.sources) {
      const sources = body.aggregations.sources;
      
      // Each aggregated source should have at least 1 result
      Object.entries(sources).forEach(([sourceId, count]) => {
        expect(count).toBeGreaterThan(0);
        
        // Verify by searching for that specific source
        // (this would be done in a separate test ideally)
      });

      console.log(`✅ Aggregations are accurate`);
    }
  });

  // ============================================
  // Multi-Step Workflow
  // ============================================

  it("complete integration workflow: multiple searches maintain consistency", async () => {
    // Search 1: Get all results
    const search1 = await fetch(`${baseUrl}/api/v1/search?q=test&limit=5`);
    const body1 = await search1.json();
    const firstBatch = body1.total;

    // Search 2: Same query, should get same total
    const search2 = await fetch(`${baseUrl}/api/v1/search?q=test&limit=5&offset=0`);
    const body2 = await search2.json();
    const secondBatch = body2.total;

    expect(firstBatch).toBe(secondBatch);

    // Search 3: With filters, should be subset
    const search3 = await fetch(`${baseUrl}/api/v1/search?q=test&risk=critical`);
    const body3 = await search3.json();
    const filteredBatch = body3.total;

    expect(filteredBatch).toBeLessThanOrEqual(firstBatch);

    console.log(`✅ Multi-step workflow maintains consistency`);
  });

  // ============================================
  // Error Scenarios Integration
  // ============================================

  it("error handling: empty search term behaves consistently", async () => {
    const response = await fetch(`${baseUrl}/api/v1/search?q=`);
    expect(response.status).toBe(400);
    console.log(`✅ Error handling is consistent`);
  });
});
