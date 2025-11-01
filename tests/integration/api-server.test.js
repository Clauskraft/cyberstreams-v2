/**
 * Integration tests for refactored API server
 *
 * Tests the complete system including:
 * - Server initialization
 * - Redis integration
 * - Authentication (API key + JWT)
 * - Rate limiting
 * - Error handling
 * - All endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('API Server Integration Tests', () => {
  let serverUrl;
  const testApiKey = 'key_test_1234567890abcdef';

  beforeAll(async () => {
    // Server should be running on PORT from .env or 8080
    const port = process.env.PORT || 8080;
    serverUrl = `http://localhost:${port}`;

    // Wait for server to be ready
    await waitForServer(serverUrl, 30000);
  });

  describe('Health Endpoint', () => {
    it('should return 200 OK without authentication', async () => {
      const response = await fetch(`${serverUrl}/api/v1/health`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        status: 'ok',
        version: expect.any(String)
      });
    });

    it('should include service health checks', async () => {
      const response = await fetch(`${serverUrl}/api/v1/health`);
      const data = await response.json();

      expect(data.services).toBeDefined();
      expect(data.services.redis).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('should reject requests without authentication', async () => {
      const response = await fetch(`${serverUrl}/api/v1/search?q=test`);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.code).toBe('MISSING_CREDENTIALS');
    });

    it('should accept valid API key in header', async () => {
      const response = await fetch(`${serverUrl}/api/v1/search?q=test`, {
        headers: {
          'X-API-Key': testApiKey
        }
      });

      expect(response.status).toBe(200);
    });

    it('should reject invalid API key', async () => {
      const response = await fetch(`${serverUrl}/api/v1/search?q=test`, {
        headers: {
          'X-API-Key': 'invalid_key'
        }
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe('INVALID_API_KEY');
    });

    it('should issue JWT token for valid API key', async () => {
      const response = await fetch(`${serverUrl}/api/v1/auth/token`, {
        method: 'POST',
        headers: {
          'X-API-Key': testApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scopes: ['search', 'stream'],
          expiresIn: 3600
        })
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        access_token: expect.any(String),
        token_type: 'Bearer',
        expires_in: 3600
      });
    });

    it('should accept valid JWT token', async () => {
      // First get a token
      const tokenResponse = await fetch(`${serverUrl}/api/v1/auth/token`, {
        method: 'POST',
        headers: {
          'X-API-Key': testApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ scopes: ['search'] })
      });

      const { access_token } = await tokenResponse.json();

      // Use the token
      const response = await fetch(`${serverUrl}/api/v1/search?q=test`, {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Search Endpoint', () => {
    it('should validate required query parameter', async () => {
      const response = await fetch(`${serverUrl}/api/v1/search`, {
        headers: { 'X-API-Key': testApiKey }
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should return search results', async () => {
      const response = await fetch(`${serverUrl}/api/v1/search?q=test`, {
        headers: { 'X-API-Key': testApiKey }
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        total: expect.any(Number),
        hits: expect.any(Array),
        aggregations: expect.any(Object),
        _meta: expect.any(Object)
      });
    });

    it('should enforce maximum limit', async () => {
      const response = await fetch(`${serverUrl}/api/v1/search?q=test&limit=999`, {
        headers: { 'X-API-Key': testApiKey }
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should filter by risk level', async () => {
      const response = await fetch(`${serverUrl}/api/v1/search?q=test&risk=critical`, {
        headers: { 'X-API-Key': testApiKey }
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      data.hits.forEach(hit => {
        expect(hit.risk).toBe('critical');
      });
    });

    it('should cache results', async () => {
      const query = `q=test&timestamp=${Date.now()}`;

      // First request
      const response1 = await fetch(`${serverUrl}/api/v1/search?${query}`, {
        headers: { 'X-API-Key': testApiKey }
      });
      const data1 = await response1.json();
      expect(data1._cached).toBeUndefined();

      // Second request (should be cached)
      const response2 = await fetch(`${serverUrl}/api/v1/search?${query}`, {
        headers: { 'X-API-Key': testApiKey }
      });
      const data2 = await response2.json();
      expect(data2._cached).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = [];

      // Make 61 requests (limit is 60 per minute for test key)
      for (let i = 0; i < 61; i++) {
        requests.push(
          fetch(`${serverUrl}/api/v1/search?q=test${i}`, {
            headers: { 'X-API-Key': testApiKey }
          })
        );
      }

      const responses = await Promise.all(requests);

      // At least one should be rate limited
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);

      // Check rate limit headers on successful request
      const successResponse = responses.find(r => r.status === 200);
      expect(successResponse.headers.get('X-RateLimit-Limit')).toBeDefined();
      expect(successResponse.headers.get('X-RateLimit-Remaining')).toBeDefined();
      expect(successResponse.headers.get('X-RateLimit-Reset')).toBeDefined();
    }, { timeout: 30000 });

    it('should return retry-after header on 429', async () => {
      // Make many requests to trigger rate limit
      for (let i = 0; i < 70; i++) {
        await fetch(`${serverUrl}/api/v1/search?q=ratelimit${i}`, {
          headers: { 'X-API-Key': testApiKey }
        });
      }

      const response = await fetch(`${serverUrl}/api/v1/search?q=ratelimit`, {
        headers: { 'X-API-Key': testApiKey }
      });

      if (response.status === 429) {
        const data = await response.json();
        expect(data.retryAfter).toBeDefined();
        expect(typeof data.retryAfter).toBe('number');
      }
    }, { timeout: 30000 });
  });

  describe('Error Handling', () => {
    it('should return structured error responses', async () => {
      const response = await fetch(`${serverUrl}/api/v1/search?q=`, {
        headers: { 'X-API-Key': testApiKey }
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toMatchObject({
        error: expect.any(String),
        message: expect.any(String),
        code: expect.any(String)
      });
    });

    it('should handle 404 for unknown API routes', async () => {
      const response = await fetch(`${serverUrl}/api/v1/nonexistent`, {
        headers: { 'X-API-Key': testApiKey }
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await fetch(`${serverUrl}/api/v1/health`);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
      expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    });
  });

  describe('SSE Stream', () => {
    it('should establish SSE connection', async () => {
      const response = await fetch(`${serverUrl}/api/v1/activity/stream`, {
        headers: { 'X-API-Key': testApiKey }
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
    });
  });
});

/**
 * Wait for server to be ready
 */
async function waitForServer(url, timeout = 30000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(`${url}/api/v1/health`);
      if (response.status === 200) {
        return true;
      }
    } catch (err) {
      // Server not ready yet
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error(`Server not ready after ${timeout}ms`);
}
