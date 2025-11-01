import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ThreatDetectionEngine } from './models/threat-detector.js';
import { FeatureEngineer } from './pipelines/feature-engineer.js';
import { KnowledgeGraph } from './utils/knowledge-graph.js';
import { ModelRegistry } from './utils/model-registry.js';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const app = Fastify({ logger });
const PORT = process.env.ML_SERVICE_PORT || 8082;

// ============================================
// ML SERVICE INITIALIZATION
// ============================================

const modelRegistry = new ModelRegistry({
  storageType: process.env.MODEL_STORAGE_TYPE || 'local',
  storagePath: process.env.MODEL_STORAGE_PATH || './models'
});

const knowledgeGraph = new KnowledgeGraph({
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  user: process.env.NEO4J_USER || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'password',
  enabled: process.env.KNOWLEDGE_GRAPH_ENABLED === 'true'
});

const threatDetector = new ThreatDetectionEngine({
  modelRegistry,
  knowledgeGraph,
  logger
});

const featureEngineer = new FeatureEngineer({ logger });

// ============================================
// MIDDLEWARE
// ============================================

await app.register(cors, {
  origin: true,
  credentials: true
});

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', async (request, reply) => {
  const health = {
    status: 'ok',
    service: 'ml-service',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    models: await modelRegistry.listModels(),
    knowledgeGraph: knowledgeGraph.isConnected()
  };

  return reply.send(health);
});

// Predict threat level
app.post('/api/v1/predict', async (request, reply) => {
  try {
    const { document } = request.body;

    if (!document || !document.content) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Missing required field: document.content'
      });
    }

    // Extract features
    const features = await featureEngineer.extract(document);

    // Get threat prediction
    const prediction = await threatDetector.predict(features);

    return reply.send({
      success: true,
      prediction,
      metadata: {
        model_version: prediction.modelVersion,
        latency_ms: prediction.latencyMs,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error({ error }, 'Prediction error');
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Batch prediction
app.post('/api/v1/predict/batch', async (request, reply) => {
  try {
    const { documents } = request.body;

    if (!Array.isArray(documents) || documents.length === 0) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Missing or invalid field: documents (must be non-empty array)'
      });
    }

    // Process in parallel
    const predictions = await Promise.all(
      documents.map(async (doc) => {
        const features = await featureEngineer.extract(doc);
        return await threatDetector.predict(features);
      })
    );

    return reply.send({
      success: true,
      predictions,
      total: predictions.length
    });

  } catch (error) {
    logger.error({ error }, 'Batch prediction error');
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Submit feedback for model improvement
app.post('/api/v1/feedback', async (request, reply) => {
  try {
    const { documentId, predictedLabel, actualLabel, userId } = request.body;

    if (!documentId || !predictedLabel || !actualLabel) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Missing required fields: documentId, predictedLabel, actualLabel'
      });
    }

    // Store feedback for retraining
    await threatDetector.submitFeedback({
      documentId,
      predictedLabel,
      actualLabel,
      userId,
      timestamp: new Date().toISOString()
    });

    return reply.send({
      success: true,
      message: 'Feedback recorded successfully'
    });

  } catch (error) {
    logger.error({ error }, 'Feedback submission error');
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Get model metrics
app.get('/api/v1/metrics', async (request, reply) => {
  try {
    const metrics = await threatDetector.getMetrics();

    return reply.send({
      success: true,
      metrics
    });

  } catch (error) {
    logger.error({ error }, 'Metrics retrieval error');
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Knowledge graph: enrich threat with context
app.post('/api/v1/enrich', async (request, reply) => {
  try {
    const { document } = request.body;

    if (!document) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'Missing required field: document'
      });
    }

    if (!knowledgeGraph.isConnected()) {
      return reply.code(503).send({
        error: 'Service Unavailable',
        message: 'Knowledge graph is not available'
      });
    }

    // Enrich with knowledge graph context
    const enriched = await knowledgeGraph.enrichThreat(document);

    return reply.send({
      success: true,
      enriched
    });

  } catch (error) {
    logger.error({ error }, 'Enrichment error');
    return reply.code(500).send({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// ============================================
// SERVER STARTUP
// ============================================

const start = async () => {
  try {
    // Initialize models
    logger.info('Initializing ML models...');
    await threatDetector.initialize();
    logger.info('ML models initialized successfully');

    // Start server
    await app.listen({ port: PORT, host: '0.0.0.0' });
    logger.info(`ML Service listening on port ${PORT}`);

  } catch (error) {
    logger.error({ error }, 'Failed to start ML service');
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await app.close();
  await knowledgeGraph.close();
  process.exit(0);
});

start();
