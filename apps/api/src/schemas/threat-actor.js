import { z } from 'zod';

/**
 * Zod schemas for ThreatActor
 */
const threatActorBaseSchema = z.object({
  id: z.string().cuid().describe('Unique identifier'),
  createdAt: z.date().describe('Creation timestamp'),
  updatedAt: z.date().describe('Last update timestamp'),
  name: z.string().describe('name field'),
  risk: z.number().describe('risk field'),
  aliases: z.array(z.string()).describe('aliases field'),
  ttps: z.array(z.string()).describe('ttps field'),
  firstSeen: z.string().datetime().describe('firstSeen field'),
});

// Schema for creation (POST) - omit auto-generated fields
export const createThreatActorSchema = threatActorBaseSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    createdAt: z.date().optional().default(() => new Date()),
    updatedAt: z.date().optional().default(() => new Date())
  });

// Schema for update (PUT/PATCH)
export const updateThreatActorSchema = createThreatActorSchema.partial();

// Schema for response (GET)
export const threatActorReplySchema = threatActorBaseSchema;

// Schema for list response
export const listThreatActorReplySchema = z.array(threatActorReplySchema);

// Schema for URL parameters
export const threatActorParamsSchema = z.object({
  id: z.string().cuid().describe('Document ID')
});

// Schema for query parameters
export const threatActorQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc')
});
