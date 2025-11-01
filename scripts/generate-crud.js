#!/usr/bin/env node
/**
 * CRUD Endpoint Generator
 * 
 * Generates complete CRUD endpoints for Cyberstreams V2
 * Following the Golden Path architecture.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const modelArg = args.find(arg => arg.startsWith('--model='))?.split('=')[1];
const fieldsArg = args.find(arg => arg.startsWith('--fields='))?.split('=')[1];

if (!modelArg || !fieldsArg) {
  console.error('Usage: node generate-crud.js --model=ThreatActor --fields="name:string,risk:number,aliases:string[]"');
  process.exit(1);
}

// Parse model and fields
const model = modelArg;
const fields = parseFields(fieldsArg);

// Generate files
async function generate() {
  console.log(`\n🚀 Generating CRUD for: ${model}`);
  console.log(`Fields: ${Object.keys(fields).join(', ')}\n`);

  // Generate schema file
  await generateSchema(model, fields);
  console.log('✅ Generated schema');

  // Generate route file
  await generateRoutes(model, fields);
  console.log('✅ Generated routes');

  // Generate OpenSearch template
  await generateOpenSearchTemplate(model, fields);
  console.log('✅ Generated OpenSearch template');

  // Generate OpenAPI additions
  await generateOpenAPIAdditions(model, fields);
  console.log('✅ Generated OpenAPI additions');

  // Generate next steps
  await generateNextSteps(model);
  console.log('✅ Generated NEXT_STEPS.md');

  console.log(`\n🎉 CRUD generation complete for ${model}!\n`);
}

/**
 * Parse field string into structured object
 */
function parseFields(fieldsString) {
  const fields = {};
  const parts = fieldsString.split(',');

  for (const part of parts) {
    const [name, type] = part.trim().split(':');
    if (!name || !type) continue;

    const fieldInfo = {
      type: parseType(type),
      zodType: mapToZodType(type),
      openSearchType: mapToOpenSearchType(type),
      openAPIType: mapToOpenAPIType(type)
    };

    fields[name] = fieldInfo;
  }

  return fields;
}

/**
 * Parse type string
 */
function parseType(typeString) {
  // Remove array brackets if present
  const cleanType = typeString.replace(/\[\]$/, '');
  const isArray = typeString.endsWith('[]');
  
  return { base: cleanType, isArray };
}

/**
 * Map type to Zod schema
 */
function mapToZodType(typeString) {
  const { base, isArray } = parseType(typeString);
  
  const zodTypes = {
    string: 'z.string()',
    number: 'z.number()',
    integer: 'z.number().int()',
    boolean: 'z.boolean()',
    date: 'z.string().datetime()',
    cuid: 'z.string().cuid()',
    email: 'z.string().email()',
    url: 'z.string().url()'
  };

  let zodType = zodTypes[base] || 'z.string()';
  
  if (isArray) {
    zodType = `z.array(${zodType})`;
  }
  
  return zodType;
}

/**
 * Map type to OpenSearch type
 */
function mapToOpenSearchType(typeString) {
  const { base, isArray } = parseType(typeString);
  
  if (isArray) {
    return 'keyword';
  }

  const types = {
    string: 'keyword',
    number: 'integer',
    integer: 'integer',
    float: 'float',
    boolean: 'boolean',
    date: 'date',
    email: 'keyword',
    url: 'keyword',
    text: 'text'
  };

  return types[base] || 'keyword';
}

/**
 * Map type to OpenAPI type
 */
function mapToOpenAPIType(typeString) {
  const { base, isArray } = parseType(typeString);
  
  if (isArray) {
    return 'array';
  }

  const types = {
    string: 'string',
    number: 'number',
    integer: 'number',
    float: 'number',
    boolean: 'boolean',
    date: 'string',
    email: 'string',
    url: 'string'
  };

  return types[base] || 'string';
}

/**
 * Generate schema file
 */
async function generateSchema(model, fields) {
  const kebabModel = toKebabCase(model);
  const camelModel = toCamelCase(model);

  const filePath = path.join(__dirname, '..', 'apps', 'api', 'src', 'schemas', `${kebabModel}.js`);
  
  const fieldDefinitions = Object.entries(fields)
    .map(([name, info]) => `  ${name}: ${info.zodType}.describe('${name} field'),`)
    .join('\n');

  const content = `import { z } from 'zod';

/**
 * Zod schemas for ${model}
 */
const ${camelModel}BaseSchema = z.object({
  id: z.string().cuid().describe('Unique identifier'),
  createdAt: z.date().describe('Creation timestamp'),
  updatedAt: z.date().describe('Last update timestamp'),
${fieldDefinitions}
});

// Schema for creation (POST) - omit auto-generated fields
export const create${model}Schema = ${camelModel}BaseSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .extend({
    createdAt: z.date().optional().default(() => new Date()),
    updatedAt: z.date().optional().default(() => new Date())
  });

// Schema for update (PUT/PATCH)
export const update${model}Schema = create${model}Schema.partial();

// Schema for response (GET)
export const ${camelModel}ReplySchema = ${camelModel}BaseSchema;

// Schema for list response
export const list${model}ReplySchema = z.array(${camelModel}ReplySchema);

// Schema for URL parameters
export const ${camelModel}ParamsSchema = z.object({
  id: z.string().cuid().describe('Document ID')
});

// Schema for query parameters
export const ${camelModel}QuerySchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc')
});
`;

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

/**
 * Generate routes file
 */
async function generateRoutes(model, fields) {
  const kebabModel = toKebabCase(model);
  const camelModel = toCamelCase(model);

  const filePath = path.join(__dirname, '..', 'apps', 'api', 'src', 'routes', `${kebabModel}.js`);
  
  const content = `import {
  create${model}Schema,
  update${model}Schema,
  ${camelModel}ReplySchema,
  list${model}ReplySchema,
  ${camelModel}ParamsSchema,
  ${camelModel}QuerySchema
} from '../schemas/${kebabModel}.js';
import { requirePermission } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateBody, validateQuery, validateParams } from '../models/schemas.js';

/**
 * ${model} CRUD Routes
 */
export async function ${camelModel}Routes(app, { logger, opensearchService }) {
  const index = '${kebabModel}s';
  
  // Create (POST)
  app.post(\`/api/v1/${kebabModel}s\`, {
    preHandler: [
      requirePermission('write'),
      validateBody(create${model}Schema)
    ],
    schema: {
      tags: ['${model}'],
      summary: \`Create a new ${model}\`,
      body: create${model}Schema,
      response: {
        201: ${camelModel}ReplySchema
      }
    }
  }, asyncHandler(async (request, reply) => {
    const document = {
      ...request.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await opensearchService.create(index, document);
    
    logger.info({ id: result.id, index }, '${model} created');
    
    return reply.code(201).send({
      id: result.id,
      ...document
    });
  }));

  // Read all (GET)
  app.get(\`/api/v1/${kebabModel}s\`, {
    preHandler: [
      requirePermission('read'),
      validateQuery(${camelModel}QuerySchema)
    ],
    schema: {
      tags: ['${model}'],
      summary: \`List all ${model}s\`,
      response: {
        200: list${model}ReplySchema
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
  app.get(\`/api/v1/${kebabModel}s/:id\`, {
    preHandler: [
      requirePermission('read'),
      validateParams(${camelModel}ParamsSchema)
    ],
    schema: {
      tags: ['${model}'],
      summary: \`Get a ${model} by ID\`,
      params: ${camelModel}ParamsSchema,
      response: {
        200: ${camelModel}ReplySchema,
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
  app.put(\`/api/v1/${kebabModel}s/:id\`, {
    preHandler: [
      requirePermission('write'),
      validateParams(${camelModel}ParamsSchema),
      validateBody(update${model}Schema)
    ],
    schema: {
      tags: ['${model}'],
      summary: \`Update a ${model}\`,
      params: ${camelModel}ParamsSchema,
      body: update${model}Schema,
      response: {
        200: ${camelModel}ReplySchema,
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
    
    logger.info({ id, index }, '${model} updated');

    const document = await opensearchService.get(index, id);
    return reply.send(document);
  }));

  // Delete (DELETE)
  app.delete(\`/api/v1/${kebabModel}s/:id\`, {
    preHandler: [
      requirePermission('delete'),
      validateParams(${camelModel}ParamsSchema)
    ],
    schema: {
      tags: ['${model}'],
      summary: \`Delete a ${model}\`,
      params: ${camelModel}ParamsSchema,
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

    logger.info({ id, index }, '${model} deleted');
    
    return reply.code(204).send();
  }));
}
`;

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

/**
 * Generate OpenSearch template
 */
async function generateOpenSearchTemplate(model, fields) {
  const kebabModel = toKebabCase(model);

  const dirPath = path.join(__dirname, '..', 'infra', 'opensearch', 'templates');
  await fs.mkdir(dirPath, { recursive: true });
  
  const filePath = path.join(dirPath, `${kebabModel}_template.json`);
  
  // Build properties object
  const properties = {
    id: { type: "keyword" },
    createdAt: { type: "date" },
    updatedAt: { type: "date" }
  };

  Object.entries(fields).forEach(([name, info]) => {
    properties[name] = { type: info.openSearchType };
  });

  const content = {
    index_patterns: [`${kebabModel}s-*`],
    template: {
      settings: {
        number_of_shards: 1,
        number_of_replicas: 1,
        "index.lifecycle.name": "90-day-retention-policy",
        "index.lifecycle.rollover_alias": `${kebabModel}s`
      },
      mappings: {
        _source: { enabled: true },
        properties
      }
    }
  };

  await fs.writeFile(filePath, JSON.stringify(content, null, 2));
}

/**
 * Generate OpenAPI additions
 */
async function generateOpenAPIAdditions(model, fields) {
  const kebabModel = toKebabCase(model);
  
  const filePath = path.join(__dirname, '..', 'openapi_additions.yaml');

  const fieldProperties = Object.entries(fields)
    .map(([name, info]) => `        ${name}:\n          type: ${info.openAPIType}`)
    .join('\n');

  const content = `#
# OpenAPI additions for ${model}
# Copy these into packages/contracts/openapi.yaml
#

paths:
  /${kebabModel}s:
    get:
      tags: ['${model}']
      summary: List all ${model}s
      security:
        - ApiKeyAuth: []
      responses:
        '200':
          description: A list of ${model}s
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/${model}List'
    
    post:
      tags: ['${model}']
      summary: Create a new ${model}
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/${model}Create'
      responses:
        '201':
          description: ${model} created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/${model}'

  /${kebabModel}s/{id}:
    get:
      tags: ['${model}']
      summary: Get a single ${model} by ID
      security:
        - ApiKeyAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: cuid
      responses:
        '200':
          description: A single ${model}
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/${model}'
        '404':
          description: ${model} not found
    
    put:
      tags: ['${model}']
      summary: Update a ${model}
      security:
        - ApiKeyAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: cuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/${model}Update'
      responses:
        '200':
          description: ${model} updated successfully
        '404':
          description: ${model} not found
    
    delete:
      tags: ['${model}']
      summary: Delete a ${model}
      security:
        - ApiKeyAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: cuid
      responses:
        '204':
          description: ${model} deleted successfully
        '404':
          description: ${model} not found

components:
  schemas:
    ${model}:
      type: object
      required:
        - id
        - createdAt
      properties:
        id:
          type: string
          format: cuid
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
${fieldProperties}

    ${model}List:
      type: array
      items:
        $ref: '#/components/schemas/${model}'
    
    ${model}Create:
      type: object
      properties:
${fieldProperties}
    
    ${model}Update:
      type: object
      properties:
${fieldProperties}
`;

  await fs.writeFile(filePath, content);
}

/**
 * Generate next steps documentation
 */
async function generateNextSteps(model) {
  const kebabModel = toKebabCase(model);
  const filePath = path.join(__dirname, '..', 'NEXT_STEPS.md');

  const content = `# Next Steps: ${model} CRUD Integration

## Generated Files

✅ apps/api/src/schemas/${kebabModel}.js  
✅ apps/api/src/routes/${kebabModel}.js  
✅ infra/opensearch/templates/${kebabModel}_template.json  
✅ openapi_additions.yaml  

## Manual Integration Steps

### 1. Register Routes in Server

Edit \`apps/api/src/server.js\` and add:

\`\`\`javascript
import { ${toCamelCase(model)}Routes } from './routes/${kebabModel}.js';

// In registerRoutes function:
await ${toCamelCase(model)}Routes(app, { logger, opensearchService });
\`\`\`

### 2. Update OpenAPI Contract

1. Open \`packages/contracts/openapi.yaml\`
2. Open \`openapi_additions.yaml\`
3. Copy paths from additions to openapi.yaml
4. Copy schemas from additions to openapi.yaml

### 3. Create OpenSearch Index Template

Run this command to create the index template:

\`\`\`bash
curl -X PUT "localhost:9200/_index_template/${kebabModel}_template" \\
  -H 'Content-Type: application/json' \\
  -d @infra/opensearch/templates/${kebabModel}_template.json
\`\`\`

### 4. Verify Integration

Run tests:
\`\`\`bash
npm test
\`\`\`

Check OpenAPI contract:
\`\`\`bash
npm run audit:contract
\`\`\`

## Testing

Test the endpoints:

\`\`\`bash
# Create
curl -X POST http://localhost:8080/api/v1/${kebabModel}s \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"field1":"value1"}'

# List
curl http://localhost:8080/api/v1/${kebabModel}s \\
  -H "Authorization: Bearer YOUR_TOKEN"

# Get by ID
curl http://localhost:8080/api/v1/${kebabModel}s/ID \\
  -H "Authorization: Bearer YOUR_TOKEN"

# Update
curl -X PUT http://localhost:8080/api/v1/${kebabModel}s/ID \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"field1":"updated_value"}'

# Delete
curl -X DELETE http://localhost:8080/api/v1/${kebabModel}s/ID \\
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`
`;

  await fs.writeFile(filePath, content);
  console.log('\n📋 See NEXT_STEPS.md for integration instructions\n');
}

/**
 * Utility: Convert to kebab-case
 */
function toKebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Utility: Convert to camelCase
 */
function toCamelCase(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

// Run generation
generate().catch(error => {
  console.error('Generation failed:', error);
  process.exit(1);
});

