/**
 * Centralized configuration management
 */

export const config = {
  // Server
  port: parseInt(process.env.PORT || '8080', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Security
  jwtSecret: process.env.JWT_SECRET,
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // PostgreSQL
  postgresUrl: process.env.POSTGRES_URL || 'postgresql://cyberstreams:cyberstreams123@localhost:5432/cyberstreams',

  // OpenSearch
  opensearchNode: process.env.OPENSEARCH_NODE || 'http://localhost:9200',
  opensearchUsername: process.env.OPENSEARCH_USERNAME,
  opensearchPassword: process.env.OPENSEARCH_PASSWORD,

  // ML Service
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8082',

  // Limits
  maxRequestBodySize: parseInt(process.env.MAX_BODY_SIZE || '1048576', 10), // 1MB
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10), // 30s

  // Feature flags
  enableCaching: process.env.ENABLE_CACHING !== 'false',
  enableRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false'
};

// Validate required config
export function validateConfig() {
  const errors = [];

  if (config.nodeEnv === 'production') {
    if (!config.jwtSecret || config.jwtSecret === 'dev-secret-key-change-in-production') {
      errors.push('JWT_SECRET must be set to a strong secret in production');
    }

    if (!config.redisUrl) {
      errors.push('REDIS_URL must be set in production');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}

export default config;
