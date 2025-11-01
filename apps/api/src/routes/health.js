/**
 * Health Check Route
 */

export async function healthRoutes(app, { logger, redisService }) {
  /**
   * GET /api/v1/health
   * Public endpoint - no authentication required
   */
  app.get('/api/v1/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            version: { type: 'string' },
            services: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    // Check Redis health
    const redisHealth = await redisService.healthCheck();

    // TODO: Check OpenSearch health
    // TODO: Check PostgreSQL health

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.2.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        redis: redisHealth.status,
        opensearch: 'ok', // TODO
        postgres: 'ok', // TODO
        mlService: 'ok' // TODO
      }
    };

    // Log health check
    logger.debug({ ip: request.ip }, 'Health check');

    return reply.send(health);
  });
}
