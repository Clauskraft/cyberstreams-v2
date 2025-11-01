import { z } from 'zod';

/**
 * Zod validation schemas for API endpoints
 *
 * Provides type-safe input validation with detailed error messages
 */

// ==================================
// Common Schemas
// ==================================

export const PaginationSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
  offset: z
    .number()
    .int()
    .min(0, 'Offset must be non-negative')
    .default(0)
});

export const DateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
}).refine(
  (data) => {
    if (data.from && data.to) {
      return new Date(data.from) <= new Date(data.to);
    }
    return true;
  },
  {
    message: '"from" date must be before "to" date'
  }
);

// ==================================
// Search Endpoint
// ==================================

export const SearchQuerySchema = z.object({
  q: z
    .string()
    .min(1, 'Query cannot be empty')
    .max(200, 'Query cannot exceed 200 characters')
    .regex(
      /^[a-zA-Z0-9\s\-_:.@#$%&*()+=[\]{}|\\,<>/?!'"~`]+$/,
      'Query contains invalid characters'
    ),
  source: z
    .string()
    .regex(/^[a-zA-Z0-9\-_]+$/, 'Source ID must be alphanumeric')
    .optional()
    .default('all'),
  risk: z
    .enum(['critical', 'high', 'medium', 'low', 'informational'])
    .optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100))
    .default('20'),
  offset: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(0))
    .default('0')
}).refine(
  (data) => {
    if (data.from && data.to) {
      return new Date(data.from) <= new Date(data.to);
    }
    return true;
  },
  {
    message: 'from date must be before to date',
    path: ['from']
  }
);

// ==================================
// Authentication
// ==================================

export const ApiKeySchema = z
  .string()
  .min(20, 'API key too short')
  .max(100, 'API key too long')
  .regex(/^key_[a-zA-Z0-9_]+$/, 'Invalid API key format');

export const JWTSchema = z
  .string()
  .min(10, 'Token too short')
  .regex(/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/, 'Invalid JWT format');

// ==================================
// ML Service Integration
// ==================================

export const PredictionRequestSchema = z.object({
  document: z.object({
    id: z.string().optional(),
    title: z.string().max(500, 'Title too long'),
    content: z.string().min(1, 'Content required').max(50000, 'Content too long'),
    source_name: z.string().optional(),
    source_id: z.string().optional(),
    published_at: z.string().datetime().optional(),
    tags: z.array(z.string()).max(50, 'Too many tags').optional(),
    metadata: z.record(z.any()).optional()
  })
});

export const FeedbackSchema = z.object({
  documentId: z.string().min(1, 'Document ID required'),
  predictedLabel: z.enum(['critical', 'high', 'medium', 'low', 'informational']),
  actualLabel: z.enum(['critical', 'high', 'medium', 'low', 'informational']),
  userId: z.string().optional(),
  comment: z.string().max(1000, 'Comment too long').optional()
});

// ==================================
// Validation Helper
// ==================================

/**
 * Validate data against schema
 * Throws ValidationError with details on failure
 */
export function validate(schema, data) {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }));

      throw {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details
      };
    }
    throw error;
  }
}

/**
 * Fastify preHandler for validation
 */
export function validateQuery(schema) {
  return async (request, reply) => {
    try {
      request.validatedQuery = validate(schema, request.query);
    } catch (error) {
      return reply.code(error.statusCode || 400).send(error);
    }
  };
}

export function validateBody(schema) {
  return async (request, reply) => {
    try {
      request.validatedBody = validate(schema, request.body);
    } catch (error) {
      return reply.code(error.statusCode || 400).send(error);
    }
  };
}

export function validateParams(schema) {
  return async (request, reply) => {
    try {
      request.params = validate(schema, request.params);
    } catch (error) {
      return reply.code(error.statusCode || 400).send(error);
    }
  };
}