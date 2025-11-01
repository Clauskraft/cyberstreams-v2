import { SearchQuerySchema, validateQuery } from '../models/schemas.js';
import { requirePermission } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Search Routes
 */

export async function searchRoutes(app, { logger, searchService, redisService }) {
  /**
   * GET /api/v1/search
   * Search threat intelligence documents
   */
  app.get('/api/v1/search', {
    preHandler: [
      requirePermission('search'),
      validateQuery(SearchQuerySchema)
    ],
    schema: {
      description: 'Search threat intelligence documents',
      tags: ['search'],
      security: [{ apiKey: [] }, { bearer: [] }],
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Search query' },
          source: { type: 'string', description: 'Filter by source' },
          risk: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'informational'] },
          from: { type: 'string', format: 'date-time' },
          to: { type: 'string', format: 'date-time' },
          limit: { type: 'integer', minimum: 1, maximum: 100 },
          offset: { type: 'integer', minimum: 0 }
        },
        required: ['q']
      }
    }
  }, asyncHandler(async (request, reply) => {
    const query = request.validatedQuery;

    // Check cache first
    const cacheKey = `search:${JSON.stringify(query)}`;
    const cached = await redisService.getCached(cacheKey);

    if (cached) {
      logger.debug({ query }, 'Search cache hit');
      return reply.send({
        ...cached,
        _cached: true
      });
    }

    // Perform search
    const results = await searchService.search(query);

    // Cache results for 5 minutes
    await redisService.cache(cacheKey, results, 300);

    // Log search
    logger.info({
      userId: request.user.userId,
      query: query.q,
      results: results.total
    }, 'Search executed');

    return reply.send(results);
  }));
}
