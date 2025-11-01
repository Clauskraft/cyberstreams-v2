/**
 * Cyberstreams API Server v0.2.0
 *
 * Modular, scalable, production-ready API server
 */

import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import jwt from 'jsonwebtoken';

// Services
import RedisService from './services/redisService.js';
import ApiKeyStore from './services/apiKeyStore.js';
import SearchService from './services/searchService.js';
import OpenSearchService from './services/opensearchService.js';

// Middleware
import { registerErrorHandler, asyncHandler, AppError } from './middleware/errorHandler.js';
import { authenticateRequest, requirePermission } from './middleware/auth.js';
import { checkRateLimit } from './middleware/rateLimit.js';

// Routes
import { healthRoutes } from './routes/health.js';
import { searchRoutes } from './routes/search.js';
import { streamRoutes } from './routes/stream.js';
import { threatActorRoutes } from './routes/threat-actor.js';

// Utils
import logger from './utils/logger.js';
import { config, validateConfig } from './utils/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize services
 */
async function initializeServices(logger) {
  logger.info('Initializing services...');

  // Initialize Redis
  const redisService = new RedisService({
    url: config.redisUrl,
    logger
  });

  await redisService.connect();
  logger.info({ url: config.redisUrl }, 'Redis connected');

  // Initialize API key store
  const apiKeyStore = new ApiKeyStore({ logger });

  // Initialize search service
  const searchService = new SearchService({ logger });

  // Initialize OpenSearch service
  const opensearchService = new OpenSearchService({ logger });
  await opensearchService.connect();

  return {
    redisService,
    apiKeyStore,
    searchService,
    opensearchService
  };
}

/**
 * Configure Fastify instance
 */
function createApp(logger) {
  const app = Fastify({
    logger,
    requestIdLogLabel: 'requestId',
    disableRequestLogging: false,
    bodyLimit: config.maxRequestBodySize,
    connectionTimeout: config.requestTimeout,
    keepAliveTimeout: 70000 // Longer than typical LB timeout
  });

  // Request decorators
  app.decorateRequest('user', null);
  app.decorateRequest('apiKey', null);
  app.decorateRequest('validatedQuery', null);
  app.decorateRequest('validatedBody', null);

  return app;
}

/**
 * Register middleware
 */
async function registerMiddleware(app, services) {
  const { logger, redisService, apiKeyStore } = services;

  // Security headers
  app.register(async (fastify) => {
    fastify.addHook('onSend', async (request, reply) => {
      reply.header('X-Content-Type-Options', 'nosniff');
      reply.header('X-Frame-Options', 'DENY');
      reply.header('X-XSS-Protection', '1; mode=block');
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      reply.header('Content-Security-Policy', "default-src 'self'");
    });
  });

  // CORS (if needed)
  if (config.corsOrigin !== '*') {
    app.register(import('@fastify/cors'), {
      origin: config.corsOrigin,
      credentials: true
    });
  }

  // Request logging
  app.addHook('onRequest', async (request, reply) => {
    logger.info({
      method: request.method,
      url: request.url,
      ip: request.ip
    }, 'Request received');
  });

  // Authentication (skip for static assets and public routes)
  app.addHook('onRequest', async (request, reply) => {
    await authenticateRequest(request, reply, redisService, apiKeyStore);
  });

  // Rate limiting (skip for health and static assets)
  app.addHook('preHandler', async (request, reply) => {
    const path = request.url.split('?')[0];

    if (!path.startsWith('/api/') || path === '/api/v1/health') {
      return;
    }

    await checkRateLimit(request, reply, redisService);
  });

  logger.info('Middleware registered');
}

/**
 * Register routes
 */
async function registerRoutes(app, services) {
  const { logger, redisService, searchService, apiKeyStore, opensearchService } = services;

  // API routes
  await healthRoutes(app, { logger, redisService });
  await searchRoutes(app, { logger, searchService, redisService });
  await streamRoutes(app, { logger, redisService });
  
  // CRUD routes
  if (opensearchService && opensearchService.isAvailable()) {
    await threatActorRoutes(app, { logger, opensearchService });
  }

  // Token exchange endpoint
  app.post('/api/v1/auth/token', {
    preHandler: [requirePermission('search')],
    schema: {
      description: 'Exchange API key for JWT token',
      tags: ['auth'],
      security: [{ apiKey: [] }],
      body: {
        type: 'object',
        properties: {
          scopes: {
            type: 'array',
            items: { type: 'string' },
            default: ['search', 'stream']
          },
          expiresIn: {
            type: 'integer',
            minimum: 60,
            maximum: 86400,
            default: 3600
          }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { scopes = ['search', 'stream'], expiresIn = 3600 } = request.body || {};

    const token = jwt.sign(
      {
        userId: request.user.userId,
        scopes,
        type: 'jwt-token'
      },
      config.jwtSecret,
      { expiresIn }
    );

    logger.info({
      userId: request.user.userId,
      scopes,
      expiresIn
    }, 'JWT token issued');

    return reply.send({
      access_token: token,
      token_type: 'Bearer',
      expires_in: expiresIn
    });
  }));

  logger.info('Routes registered');
}

/**
 * Serve static frontend
 */
async function serveFrontend(app, logger) {
  const webDistPath = path.resolve(__dirname, '../../web/dist');

  await app.register(fastifyStatic, {
    root: webDistPath,
    prefix: '/',
    wildcard: true // Let fastify-static handle 404s and serve index.html for SPA
  });

  // Note: fastify-static handles SPA fallback automatically with wildcard: true
  // API 404s will be handled by the error handler

  logger.info({ path: webDistPath }, 'Frontend served');
}

/**
 * Setup graceful shutdown
 */
function setupGracefulShutdown(app, services, logger) {
  const shutdown = async (signal) => {
    logger.info({ signal }, 'Shutdown signal received');

    try {
      // Close Fastify server (stops accepting new connections)
      await app.close();
      logger.info('Fastify server closed');

      // Close services
      if (services.redisService) {
        await services.redisService.disconnect();
        logger.info('Redis disconnected');
      }

      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.fatal({ reason, promise }, 'Unhandled promise rejection');
    process.exit(1);
  });
}

/**
 * Main server initialization
 */
async function start() {
  let app;
  let services;

  try {
    // Validate configuration
    validateConfig();

    // Logger already imported
    logger.info({
      version: '0.2.0',
      environment: config.nodeEnv,
      port: config.port
    }, 'Starting Cyberstreams API Server');

    // Initialize services
    services = await initializeServices(logger);

    // Create Fastify app
    app = createApp(logger);

    // Register global error handler
    registerErrorHandler(app, logger);

    // Register middleware
    await registerMiddleware(app, { logger, ...services });

    // Register routes
    await registerRoutes(app, { logger, ...services });

    // Serve frontend
    await serveFrontend(app, logger);

    // Setup graceful shutdown
    setupGracefulShutdown(app, services, logger);

    // Start listening
    await app.listen({
      port: config.port,
      host: config.host
    });

    logger.info({
      port: config.port,
      host: config.host
    }, '✅ Cyberstreams API Server started successfully');

    // Log test credentials in development
    if (config.nodeEnv === 'development') {
      console.log('\n📋 DEVELOPMENT CREDENTIALS:');
      console.log('   Test API Key: key_test_1234567890abcdef');
      console.log('   Demo API Key: key_demo_abcdef1234567890');
      console.log('\n🔗 ENDPOINTS:');
      console.log(`   Health:  http://localhost:${config.port}/api/v1/health`);
      console.log(`   Search:  http://localhost:${config.port}/api/v1/search?q=test`);
      console.log(`   Stream:  http://localhost:${config.port}/api/v1/activity/stream`);
      console.log(`   Token:   POST http://localhost:${config.port}/api/v1/auth/token`);
      console.log('\n🔐 TESTING:');
      console.log(`   curl -H "X-API-Key: key_test_1234567890abcdef" http://localhost:${config.port}/api/v1/search?q=test\n`);
    }

  } catch (err) {
    if (logger) {
      logger.fatal({ err }, 'Failed to start server');
    } else {
      console.error('Failed to start server:', err);
    }
    process.exit(1);
  }
}

// Start server
start();
