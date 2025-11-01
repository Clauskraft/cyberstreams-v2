import {
  createThreatActorSchema,
  updateThreatActorSchema,
  threatActorReplySchema,
  listThreatActorReplySchema,
  threatActorParamsSchema,
  threatActorQuerySchema
} from '../schemas/threat-actor.js';
import { requirePermission } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateBody, validateQuery, validateParams } from '../models/schemas.js';

/**
 * ThreatActor CRUD Routes
 */
export async function threatActorRoutes(app, { logger, opensearchService }) {
  const index = 'threat-actors';
  
  // Create (POST)
  app.post(`/api/v1/threat-actors`, {
    preHandler: [
      requirePermission('write'),
      validateBody(createThreatActorSchema)
    ],
    schema: {
      tags: ['ThreatActor'],
      summary: `Create a new ThreatActor`,
      body: createThreatActorSchema,
      response: {
        201: threatActorReplySchema
      }
    }
  }, asyncHandler(async (request, reply) => {
    const document = {
      ...request.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await opensearchService.create(index, document);
    
    logger.info({ id: result.id, index }, 'ThreatActor created');
    
    return reply.code(201).send({
      id: result.id,
      ...document
    });
  }));

  // Read all (GET)
  app.get(`/api/v1/threat-actors`, {
    preHandler: [
      requirePermission('read'),
      validateQuery(threatActorQuerySchema)
    ],
    schema: {
      tags: ['ThreatActor'],
      summary: `List all ThreatActors`,
      response: {
        200: listThreatActorReplySchema
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { limit = 20, offset = 0 } = request.query;

    const results = await opensearchService.search(index, {
      query: { match_all: {} },
      size: limit,
      from: offset
    });

    return reply.send(results.hits);
  }));

  // Read one (GET by ID)
  app.get(`/api/v1/threat-actors/:id`, {
    preHandler: [
      requirePermission('read'),
      validateParams(threatActorParamsSchema)
    ],
    schema: {
      tags: ['ThreatActor'],
      summary: `Get a ThreatActor by ID`,
      params: threatActorParamsSchema,
      response: {
        200: threatActorReplySchema,
        404: { type: 'null' }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { id } = request.params;

    const document = await opensearchService.get(index, id);
    
    if (!document) {
      return reply.code(404).send({ error: 'Not found' });
    }

    return reply.send(document);
  }));

  // Update (PUT)
  app.put(`/api/v1/threat-actors/:id`, {
    preHandler: [
      requirePermission('write'),
      validateParams(threatActorParamsSchema),
      validateBody(updateThreatActorSchema)
    ],
    schema: {
      tags: ['ThreatActor'],
      summary: `Update a ThreatActor`,
      params: threatActorParamsSchema,
      body: updateThreatActorSchema,
      response: {
        200: threatActorReplySchema,
        404: { type: 'null' }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { id } = request.params;

    const updates = {
      ...request.body,
      updatedAt: new Date()
    };

    const result = await opensearchService.update(index, id, updates);
    
    logger.info({ id, index }, 'ThreatActor updated');

    const document = await opensearchService.get(index, id);
    return reply.send(document);
  }));

  // Delete (DELETE)
  app.delete(`/api/v1/threat-actors/:id`, {
    preHandler: [
      requirePermission('delete'),
      validateParams(threatActorParamsSchema)
    ],
    schema: {
      tags: ['ThreatActor'],
      summary: `Delete a ThreatActor`,
      params: threatActorParamsSchema,
      response: {
        204: { type: 'null' },
        404: { type: 'null' }
      }
    }
  }, asyncHandler(async (request, reply) => {
    const { id } = request.params;

    const deleted = await opensearchService.delete(index, id);
    
    if (!deleted) {
      return reply.code(404).send({ error: 'Not found' });
    }

    logger.info({ id, index }, 'ThreatActor deleted');
    
    return reply.code(204).send();
  }));
}
