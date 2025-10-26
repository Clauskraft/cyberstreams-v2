import Fastify from "fastify";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const app = Fastify({ logger: true });
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key-change-in-production";

// ============================================
// MOCK API KEY STORE (Replace with DB in production)
// ============================================
const mockApiKeys = {
  "key_test_1234567890abcdef": {
    id: "key-1",
    name: "Test Key",
    userId: "user-1",
    permissions: ["search", "stream"],
    rateLimitRpm: 60,
    rateLimitRph: 3600,
    rateLimitRpd: 86400,
    isRevoked: false,
    createdAt: new Date(),
    lastUsedAt: null
  },
  "key_demo_abcdef1234567890": {
    id: "key-2",
    name: "Demo Key",
    userId: "user-2",
    permissions: ["search", "stream"],
    rateLimitRpm: 300,
    rateLimitRph: 18000,
    rateLimitRpd: Infinity,
    isRevoked: false,
    createdAt: new Date(),
    lastUsedAt: null
  }
};

// Mock API key usage tracking (in-memory, replace with Redis in production)
const apiKeyUsage = new Map();

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================
async function authenticateRequest(request, reply) {
  // Health endpoint is public (no authentication required)
  if (request.url === "/api/v1/health") {
    return;
  }

  let apiKey = null;
  let token = null;

  // Try API Key first (X-API-Key header)
  if (request.headers["x-api-key"]) {
    apiKey = request.headers["x-api-key"];
  }

  // Try JWT second (Authorization: Bearer header)
  if (request.headers.authorization) {
    const auth = request.headers.authorization;
    if (auth.startsWith("Bearer ")) {
      token = auth.substring(7);
    }
  }

  // Validate API Key
  if (apiKey) {
    const keyData = mockApiKeys[apiKey];
    if (!keyData || keyData.isRevoked) {
      return reply.code(401).send({
        error: "Unauthorized",
        message: "Invalid or revoked API key",
        code: "INVALID_API_KEY"
      });
    }
    
    // Store in request for later use
    request.user = {
      type: "api-key",
      id: keyData.id,
      userId: keyData.userId,
      permissions: keyData.permissions,
      rateLimits: {
        rpm: keyData.rateLimitRpm,
        rph: keyData.rateLimitRph,
        rpd: keyData.rateLimitRpd
      }
    };
    request.apiKey = apiKey;
    return;
  }

  // Validate JWT Token
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      request.user = {
        type: "jwt",
        ...decoded,
        permissions: decoded.scopes || ["search", "stream"],
        rateLimits: {
          rpm: 60,
          rph: 3600,
          rpd: 86400
        }
      };
      return;
    } catch (err) {
      return reply.code(401).send({
        error: "Unauthorized",
        message: "Invalid or expired JWT token",
        code: "INVALID_TOKEN"
      });
    }
  }

  // No authentication provided
  return reply.code(401).send({
    error: "Unauthorized",
    message: "Missing X-API-Key or Authorization header",
    code: "MISSING_CREDENTIALS"
  });
}

// ============================================
// RATE LIMITING MIDDLEWARE
// ============================================
async function checkRateLimit(request, reply) {
  // Health endpoint is not rate limited
  if (request.url === "/api/v1/health") {
    return;
  }

  if (!request.user) return;

  const identifier = request.user.id;
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  const oneHourAgo = now - 3600000;
  const oneDayAgo = now - 86400000;

  // Initialize tracking if not exists
  if (!apiKeyUsage.has(identifier)) {
    apiKeyUsage.set(identifier, []);
  }

  const usage = apiKeyUsage.get(identifier);

  // Remove old entries outside tracking window
  const filteredUsage = usage.filter(timestamp => timestamp > oneDayAgo);
  apiKeyUsage.set(identifier, filteredUsage);

  // Count requests in current windows
  const requestsLastMinute = filteredUsage.filter(t => t > oneMinuteAgo).length;
  const requestsLastHour = filteredUsage.filter(t => t > oneHourAgo).length;
  const requestsLastDay = filteredUsage.length;

  // Check limits
  const { rpm, rph, rpd } = request.user.rateLimits;

  if (requestsLastMinute >= rpm) {
    return reply.code(429).send({
      error: "Too Many Requests",
      message: `Rate limit exceeded: ${rpm} requests per minute`,
      retryAfter: Math.ceil((filteredUsage[0] + 60000 - now) / 1000)
    });
  }

  if (requestsLastHour >= rph) {
    return reply.code(429).send({
      error: "Too Many Requests",
      message: `Rate limit exceeded: ${rph} requests per hour`,
      retryAfter: Math.ceil((filteredUsage[0] + 3600000 - now) / 1000)
    });
  }

  if (rpd !== Infinity && requestsLastDay >= rpd) {
    return reply.code(429).send({
      error: "Too Many Requests",
      message: `Rate limit exceeded: ${rpd} requests per day`,
      retryAfter: Math.ceil((filteredUsage[0] + 86400000 - now) / 1000)
    });
  }

  // Add current request
  filteredUsage.push(now);
  apiKeyUsage.set(identifier, filteredUsage);

  // Set rate limit headers
  reply.header("X-RateLimit-Limit", rpm);
  reply.header("X-RateLimit-Remaining", rpm - requestsLastMinute - 1);
  reply.header("X-RateLimit-Reset", Math.ceil((filteredUsage[0] + 60000) / 1000));
}

// ============================================
// PERMISSION CHECK
// ============================================
function requirePermission(endpoint) {
  return async (request, reply) => {
    if (!request.user || !request.user.permissions.includes(endpoint)) {
      reply.code(403).send({
        error: "Forbidden",
        message: `API key does not have permission for ${endpoint}`,
        code: "INSUFFICIENT_PERMISSIONS"
      });
    }
  };
}

// ============================================
// SECURITY HEADERS MIDDLEWARE
// ============================================
app.register(async (fastify) => {
  fastify.addHook("onSend", async (request, reply) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("X-XSS-Protection", "1; mode=block");
    reply.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    reply.header("Content-Security-Policy", "default-src 'self'");
  });
});

app
  .decorateRequest("user", null)
  .decorateRequest("apiKey", null);

app.addHook("onRequest", async (request, reply) => {
  await authenticateRequest(request, reply);
});

app.addHook("preHandler", async (request, reply) => {
  await checkRateLimit(request, reply);
});

// ============================================
// MOCK DATABASE OF DOCUMENTS
// ============================================
const mockDocuments = [
  {
    id: "doc-1",
    title: "CVE-2025-12345 – Critical RCE in OpenSSL",
    content: "A critical remote code execution vulnerability was discovered in OpenSSL affecting versions 3.0.0 through 3.0.8.",
    source_id: "nvd-feed",
    source_name: "National Vulnerability Database",
    url: "https://nvd.nist.gov/vuln/detail/CVE-2025-12345",
    risk: "critical",
    published_at: "2025-10-24T10:00:00Z",
    fetched_at: "2025-10-25T22:40:00Z",
    tags: ["rce", "critical", "openssl"],
    metadata: { cvss_score: 9.8, affected_versions: ["3.0.0-3.0.8"] }
  },
  {
    id: "doc-2",
    title: "CISA Alert – Increase in Ransomware Activity",
    content: "CISA is warning of increased ransomware attacks targeting healthcare organizations. Organizations should implement defensive measures.",
    source_id: "cisa-alerts",
    source_name: "CISA Alerts and Advisories",
    url: "https://cisa.gov/alerts/2025-10-25",
    risk: "high",
    published_at: "2025-10-25T08:30:00Z",
    fetched_at: "2025-10-25T22:40:00Z",
    tags: ["ransomware", "healthcare", "critical-infrastructure"],
    metadata: { attack_vectors: ["phishing", "compromised-credentials"] }
  },
  {
    id: "doc-3",
    title: "Zero-Day SQL Injection in Django ORM",
    content: "Security researchers discovered a zero-day SQL injection vulnerability in Django's ORM layer that could allow attackers to bypass authentication.",
    source_id: "reddit-netsec",
    source_name: "Reddit r/netsec",
    url: "https://reddit.com/r/netsec/comments/...",
    risk: "critical",
    published_at: "2025-10-25T14:00:00Z",
    fetched_at: "2025-10-25T22:40:00Z",
    tags: ["sql-injection", "django", "zero-day"],
    metadata: { affected_versions: ["3.0-4.2"], patch_available: false }
  }
];

// Track connected SSE clients
const sseClients = new Set();

// ============================================
// AUDIT LOGGING
// ============================================
function auditLog(action, details) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    action,
    ...details
  }));
}

// ============================================
// Health Check Endpoint (PUBLIC - no auth)
// ============================================
app.get("/api/v1/health", async (request, reply) => {
  auditLog("health_check", { ip: request.ip });
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
    security: "enabled",
    authentication: "api-key-jwt",
    dependencies: {
      opensearch: "ok",
      minio: "ok"
    }
  };
});

// ============================================
// Search Endpoint (PROTECTED)
// ============================================
app.get("/api/v1/search", { preHandler: requirePermission("search") }, async (request, reply) => {
  const { q, source = "all", risk, from, to, limit = 20, offset = 0 } = request.query;

  // Validate required parameter
  if (!q) {
    return reply.code(400).send({
      error: "Bad Request",
      message: "Search query 'q' is required"
    });
  }

  // Audit log search
  auditLog("search_request", {
    userId: request.user.userId,
    query: q,
    filters: { source, risk }
  });

  // Filter documents
  let results = mockDocuments.filter(doc => {
    const matchesQuery = doc.title.toLowerCase().includes(q.toLowerCase()) ||
                        doc.content.toLowerCase().includes(q.toLowerCase()) ||
                        doc.tags.some(tag => tag.toLowerCase().includes(q.toLowerCase()));

    if (!matchesQuery) return false;
    if (source !== "all" && doc.source_id !== source) return false;
    if (risk && doc.risk !== risk) return false;
    if (from && new Date(doc.published_at) < new Date(from)) return false;
    if (to && new Date(doc.published_at) > new Date(to)) return false;

    return true;
  });

  // Calculate aggregations
  const aggregations = {
    sources: {},
    risks: {}
  };

  results.forEach(doc => {
    aggregations.sources[doc.source_id] = (aggregations.sources[doc.source_id] || 0) + 1;
    aggregations.risks[doc.risk] = (aggregations.risks[doc.risk] || 0) + 1;
  });

  const total = results.length;
  const pageResults = results.slice(offset, offset + parseInt(limit));

  return {
    total,
    hits: pageResults,
    aggregations,
    _meta: {
      limit: parseInt(limit),
      offset,
      took_ms: 45
    }
  };
});

// ============================================
// Activity Stream (PROTECTED - SSE)
// ============================================
app.get("/api/v1/activity/stream", { preHandler: requirePermission("stream") }, async (request, reply) => {
  auditLog("stream_connect", { userId: request.user.userId });

  reply.header("Content-Type", "text/event-stream");
  reply.header("Cache-Control", "no-cache");
  reply.header("Connection", "keep-alive");

  const stream = reply.raw;

  // Send heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    stream.write(`event: heartbeat\n`);
    stream.write(`data: {"timestamp":"${new Date().toISOString()}"}\n\n`);
  }, 30000);

  // Send initial documents
  mockDocuments.forEach(doc => {
    stream.write(`event: document\n`);
    stream.write(`data: ${JSON.stringify(doc)}\n\n`);
  });

  // Handle client disconnect
  stream.on("close", () => {
    clearInterval(heartbeat);
    sseClients.delete(stream);
    auditLog("stream_disconnect", { userId: request.user.userId });
  });

  sseClients.add(stream);
});

// ============================================
// TOKEN EXCHANGE ENDPOINT (Protected with API Key)
// ============================================
app.post("/api/v1/auth/token", { preHandler: requirePermission("search") }, async (request, reply) => {
  const { scopes = ["search", "stream"], expiresIn = 3600 } = request.body || {};

  // Generate JWT token
  const token = jwt.sign(
    {
      userId: request.user.userId,
      scopes,
      type: "jwt-token"
    },
    JWT_SECRET,
    { expiresIn }
  );

  auditLog("token_issued", {
    userId: request.user.userId,
    scopes,
    expiresIn
  });

  return {
    access_token: token,
    token_type: "Bearer",
    expires_in: expiresIn
  };
});

// ============================================
// Start Server
// ============================================
const start = async () => {
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`✅ API Server v0.2.0 listening on port ${PORT}`);
    console.log(`\n📋 AUTHENTICATION ENABLED:`);
    console.log(`   Test API Key: key_test_1234567890abcdef`);
    console.log(`   Demo API Key: key_demo_abcdef1234567890`);
    console.log(`\n🔗 ENDPOINTS:`);
    console.log(`   Health (PUBLIC):   http://localhost:${PORT}/api/v1/health`);
    console.log(`   Search (PROTECTED): http://localhost:${PORT}/api/v1/search?q=test`);
    console.log(`   Stream (PROTECTED): http://localhost:${PORT}/api/v1/activity/stream`);
    console.log(`   Token Exchange:     POST http://localhost:${PORT}/api/v1/auth/token`);
    console.log(`\n🔐 TESTING:`);
    console.log(`   curl -H "X-API-Key: key_test_1234567890abcdef" http://localhost:${PORT}/api/v1/search?q=test`);
    console.log(`   Or: curl -H "Authorization: Bearer <jwt-token>" http://localhost:${PORT}/api/v1/search?q=test\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
