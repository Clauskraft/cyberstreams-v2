import { RateLimitError } from './errorHandler.js';

/**
 * Rate Limiting Middleware (Redis-backed)
 *
 * Distributed rate limiting using Redis sorted sets
 */

const RATE_LIMIT_EXEMPT_ROUTES = ['/api/v1/health'];

/**
 * Rate limiting middleware
 */
export async function checkRateLimit(request, reply, redisService) {
  // Skip rate limiting for exempt routes
  const path = request.url.split('?')[0];
  if (RATE_LIMIT_EXEMPT_ROUTES.includes(path)) {
    return;
  }

  // Skip if no user context (should not happen after auth)
  if (!request.user) {
    return;
  }

  const identifier = request.user.id;
  const limits = request.user.rateLimits;

  try {
    // Check rate limit via Redis
    const result = await redisService.checkRateLimit(identifier, limits);

    if (!result.allowed) {
      // Set rate limit headers
      reply.header('X-RateLimit-Limit', result.limit);
      reply.header('X-RateLimit-Remaining', result.remaining);
      reply.header('Retry-After', result.retryAfter);

      throw new RateLimitError(
        `Rate limit exceeded: ${result.limit} requests per ${result.window}`,
        result.retryAfter
      );
    }

    // Set rate limit headers for successful requests
    reply.header('X-RateLimit-Limit', result.limit);
    reply.header('X-RateLimit-Remaining', result.remaining);
    reply.header('X-RateLimit-Reset', result.reset);

    // Log if using fallback (Redis error)
    if (result.fallback) {
      request.log.warn(
        { identifier },
        'Rate limiting using fallback - Redis unavailable'
      );
    }

  } catch (error) {
    // If it's a RateLimitError, re-throw it
    if (error instanceof RateLimitError) {
      throw error;
    }

    // For other errors, log and fail open (allow request)
    request.log.error(
      { error, identifier },
      'Rate limit check failed - allowing request'
    );
  }
}

/**
 * Custom rate limit for specific endpoints
 */
export function customRateLimit(rpm, rph = rpm * 60, rpd = rph * 24) {
  return async (request, reply, redisService) => {
    if (!request.user) {
      return;
    }

    const identifier = request.user.id;
    const customLimits = { rpm, rph, rpd };

    const result = await redisService.checkRateLimit(identifier, customLimits);

    if (!result.allowed) {
      reply.header('X-RateLimit-Limit', result.limit);
      reply.header('X-RateLimit-Remaining', result.remaining);
      reply.header('Retry-After', result.retryAfter);

      throw new RateLimitError(
        `Rate limit exceeded: ${result.limit} requests per ${result.window}`,
        result.retryAfter
      );
    }

    reply.header('X-RateLimit-Limit', result.limit);
    reply.header('X-RateLimit-Remaining', result.remaining);
    reply.header('X-RateLimit-Reset', result.reset);
  };
}
