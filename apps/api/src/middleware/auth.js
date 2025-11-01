import jwt from 'jsonwebtoken';
import { AuthenticationError, AuthorizationError } from './errorHandler.js';

/**
 * Authentication Middleware
 *
 * Supports both API keys and JWT tokens
 */

const JWT_SECRET = process.env.JWT_SECRET;
const PUBLIC_API_ROUTES = ['/api/v1/health'];

// Validate JWT secret at startup
if (!JWT_SECRET || JWT_SECRET === 'dev-secret-key-change-in-production') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL: JWT_SECRET must be set to a strong secret in production');
  }
  console.warn('⚠️  WARNING: Using default JWT secret - DO NOT use in production!');
}

/**
 * Main authentication middleware
 */
export async function authenticateRequest(request, reply, redisService, apiKeyStore) {
  // Extract path without query string
  const path = request.url.split('?')[0];

  // Skip auth for static assets and public API routes
  if (!path.startsWith('/api/') || PUBLIC_API_ROUTES.includes(path)) {
    return;
  }

  // Extract credentials from headers or query params
  const { apiKey, token } = extractCredentials(request);

  // Try API Key authentication first
  if (apiKey) {
    await authenticateWithApiKey(request, reply, apiKey, apiKeyStore, redisService);
    return;
  }

  // Try JWT authentication
  if (token) {
    await authenticateWithJWT(request, reply, token);
    return;
  }

  // No authentication provided
  throw new AuthenticationError('Missing X-API-Key or Authorization header');
}

/**
 * Extract credentials from request
 */
function extractCredentials(request) {
  let apiKey = null;
  let token = null;

  // Extract from headers
  if (request.headers['x-api-key']) {
    apiKey = request.headers['x-api-key'];
  }

  if (request.headers.authorization) {
    const auth = request.headers.authorization;
    if (auth.startsWith('Bearer ')) {
      token = auth.substring(7);
    }
  }

  // Fallback to query params (less secure, for compatibility)
  if (!apiKey && request.query) {
    const queryKeys = ['apiKey', 'api_key', 'apikey', 'key'];
    for (const key of queryKeys) {
      if (request.query[key]) {
        apiKey = request.query[key];
        break;
      }
    }
  }

  if (!token && request.query) {
    const tokenKeys = ['token', 'jwt', 'access_token', 'bearer'];
    for (const key of tokenKeys) {
      if (request.query[key]) {
        token = request.query[key];
        break;
      }
    }
  }

  return { apiKey, token };
}

/**
 * Authenticate using API key
 */
async function authenticateWithApiKey(request, reply, apiKey, apiKeyStore, redisService) {
  // Try cache first
  const cacheKey = `apikey:${apiKey}`;
  let keyData = await redisService.getCached(cacheKey);

  // If not in cache, fetch from store
  if (!keyData) {
    keyData = await apiKeyStore.getApiKey(apiKey);
    if (keyData) {
      // Cache for 5 minutes
      await redisService.cache(cacheKey, keyData, 300);
    }
  }

  // Validate key
  if (!keyData || keyData.isRevoked) {
    throw new AuthenticationError('Invalid or revoked API key');
  }

  // Store user context
  request.user = {
    type: 'api-key',
    id: keyData.id,
    userId: keyData.userId,
    permissions: keyData.permissions || ['search', 'stream'],
    rateLimits: {
      rpm: keyData.rateLimitRpm || 60,
      rph: keyData.rateLimitRph || 3600,
      rpd: keyData.rateLimitRpd || 86400
    }
  };

  request.apiKey = apiKey;

  // Update last used timestamp (async, don't wait)
  apiKeyStore.updateLastUsed(apiKey).catch(err => {
    request.log.error({ err, apiKey }, 'Failed to update API key last used');
  });
}

/**
 * Authenticate using JWT token
 */
async function authenticateWithJWT(request, reply, token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    request.user = {
      type: 'jwt',
      id: decoded.sub,
      userId: decoded.sub,
      email: decoded.email,
      permissions: decoded.scopes || ['search', 'stream'],
      rateLimits: {
        rpm: decoded.rpm || 60,
        rph: decoded.rph || 3600,
        rpd: decoded.rpd || 86400
      }
    };

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AuthenticationError('JWT token has expired');
    } else if (err.name === 'JsonWebTokenError') {
      throw new AuthenticationError('Invalid JWT token');
    } else {
      throw new AuthenticationError('JWT verification failed');
    }
  }
}

/**
 * Permission check middleware factory
 */
export function requirePermission(permission) {
  return async (request, reply) => {
    if (!request.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (!request.user.permissions.includes(permission)) {
      throw new AuthorizationError(`Missing required permission: ${permission}`);
    }
  };
}

/**
 * Require admin role
 */
export function requireAdmin(request, reply) {
  if (!request.user) {
    throw new AuthenticationError('Authentication required');
  }

  if (!request.user.permissions.includes('admin')) {
    throw new AuthorizationError('Admin access required');
  }
}
