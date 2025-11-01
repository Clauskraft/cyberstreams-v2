import { requirePermission } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * SSE Stream Routes
 */

export async function streamRoutes(app, { logger, redisService }) {
  const SSE_CHANNEL = 'cyberstreams:activity';

  /**
   * GET /api/v1/activity/stream
   * Server-Sent Events stream for real-time threat updates
   */
  app.get('/api/v1/activity/stream', {
    preHandler: [requirePermission('stream')],
    schema: {
      description: 'Real-time activity stream (SSE)',
      tags: ['stream'],
      security: [{ apiKey: [] }, { bearer: [] }]
    }
  }, asyncHandler(async (request, reply) => {
    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable nginx buffering
    });

    const clientId = request.user.id;

    logger.info({ clientId }, 'SSE client connected');

    // Send initial connection event
    reply.raw.write(`event: connected\n`);
    reply.raw.write(`data: ${JSON.stringify({
      message: 'Connected to Cyberstreams activity stream',
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Subscribe to Redis pub/sub
    const messageHandler = (message) => {
      try {
        reply.raw.write(`event: threat\n`);
        reply.raw.write(`data: ${JSON.stringify(message)}\n\n`);
      } catch (error) {
        logger.error({ error, clientId }, 'Failed to send SSE message');
      }
    };

    await redisService.subscribe(SSE_CHANNEL, messageHandler);

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      try {
        reply.raw.write(`:heartbeat\n\n`);
      } catch (error) {
        clearInterval(heartbeat);
      }
    }, 30000); // Every 30 seconds

    // Handle client disconnect
    request.raw.on('close', () => {
      clearInterval(heartbeat);
      logger.info({ clientId }, 'SSE client disconnected');
    });

    // Keep connection open
    await new Promise((resolve) => {
      request.raw.on('close', resolve);
    });
  }));

  /**
   * POST /api/v1/activity/publish
   * Publish event to activity stream (admin only)
   */
  app.post('/api/v1/activity/publish', {
    preHandler: [requirePermission('admin')],
    schema: {
      description: 'Publish event to activity stream',
      tags: ['stream'],
      security: [{ apiKey: [] }, { bearer: [] }],
      body: {
        type: 'object',
        required: ['type', 'data'],
        properties: {
          type: { type: 'string' },
          data: { type: 'object' }
        }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { type, data } = request.body;

    const event = {
      type,
      data,
      timestamp: new Date().toISOString(),
      publishedBy: request.user.userId
    };

    // Publish to Redis
    await redisService.publish(SSE_CHANNEL, event);

    logger.info({ type, userId: request.user.userId }, 'Event published to stream');

    return reply.send({
      success: true,
      message: 'Event published'
    });
  }));
}
