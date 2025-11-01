/**
 * Global Error Handler Middleware
 *
 * Provides consistent error responses and logging
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error types
export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class RateLimitError extends AppError {
  constructor(message, retryAfter) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.retryAfter = retryAfter;
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service) {
    super(`${service} is currently unavailable`, 503, 'SERVICE_UNAVAILABLE');
  }
}

/**
 * Register global error handler with Fastify
 */
export function registerErrorHandler(app, logger) {
  app.setErrorHandler(async (error, request, reply) => {
    // Log error with context
    const errorContext = {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code
      },
      request: {
        id: request.id,
        method: request.method,
        url: request.url,
        userId: request.user?.userId,
        ip: request.ip
      }
    };

    // Different log levels based on error type
    if (error.statusCode >= 500) {
      logger.error(errorContext, 'Server error occurred');
    } else if (error.statusCode >= 400) {
      logger.warn(errorContext, 'Client error occurred');
    } else {
      logger.info(errorContext, 'Request error occurred');
    }

    // Handle operational vs programming errors
    if (error.isOperational === false && error.statusCode >= 500) {
      // Programming error - don't expose details
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        requestId: request.id,
        timestamp: new Date().toISOString()
      });
    }

    // Operational error - safe to send details
    const response = {
      error: error.name || 'Error',
      message: error.message,
      code: error.code,
      requestId: request.id,
      timestamp: new Date().toISOString()
    };

    // Add details for validation errors
    if (error.details) {
      response.details = error.details;
    }

    // Add retry-after for rate limit errors
    if (error.retryAfter) {
      response.retryAfter = error.retryAfter;
      reply.header('Retry-After', error.retryAfter);
    }

    return reply.code(error.statusCode || 500).send(response);
  });

  // Handle 404s for undefined routes
  app.setNotFoundHandler(async (request, reply) => {
    logger.warn({
      request: {
        id: request.id,
        method: request.method,
        url: request.url
      }
    }, 'Route not found');

    return reply.code(404).send({
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
      requestId: request.id,
      timestamp: new Date().toISOString()
    });
  });
}

/**
 * Async error wrapper for route handlers
 * Ensures promise rejections are caught and sent to error handler
 */
export function asyncHandler(fn) {
  return async (request, reply) => {
    try {
      await fn(request, reply);
    } catch (error) {
      // Convert to AppError if not already
      if (!(error instanceof AppError)) {
        throw new AppError(
          error.message || 'An error occurred',
          error.statusCode || 500,
          error.code || 'INTERNAL_ERROR'
        );
      }
      throw error;
    }
  };
}
