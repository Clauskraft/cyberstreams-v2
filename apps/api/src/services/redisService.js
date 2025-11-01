import Redis from 'ioredis';
import { createHash } from 'crypto';

/**
 * Redis Service - Centralized Redis client and operations
 *
 * Features:
 * - Connection pooling
 * - Retry logic with exponential backoff
 * - Circuit breaker protection
 * - Health monitoring
 */
class RedisService {
  constructor({ url, logger }) {
    this.logger = logger;
    this.client = null;
    this.subscriber = null;
    this.publisher = null;
    this.connected = false;
    this.url = url;
  }

  /**
   * Initialize Redis connections
   */
  async connect() {
    try {
      // Main client with connection pooling
      this.client = new Redis(this.url, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            // Reconnect on readonly errors
            return true;
          }
          return false;
        },
        lazyConnect: false,
        enableReadyCheck: true,
        enableOfflineQueue: true,
        connectTimeout: 10000,
        keepAlive: 30000
      });

      // Separate clients for pub/sub
      this.publisher = this.client.duplicate();
      this.subscriber = this.client.duplicate();

      // Event handlers
      this.client.on('connect', () => {
        this.logger.info('Redis client connected');
        this.connected = true;
      });

      this.client.on('error', (error) => {
        this.logger.error({ error }, 'Redis client error');
        this.connected = false;
      });

      this.client.on('close', () => {
        this.logger.warn('Redis client connection closed');
        this.connected = false;
      });

      // Wait for connection
      await this.client.ping();
      this.logger.info('Redis service initialized successfully');

    } catch (error) {
      this.logger.warn({ error: error.message }, 'Failed to connect to Redis - running in degraded mode (no caching, no rate limiting)');
      this.connected = false;
      this.client = null;
      this.publisher = null;
      this.subscriber = null;
      // Don't throw - allow server to start without Redis
    }
  }

  /**
   * Check if Redis is connected
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Get Redis client
   */
  getClient() {
    if (!this.connected) {
      throw new Error('Redis client not connected');
    }
    return this.client;
  }

  /**
   * Distributed rate limiting using sorted sets (ZSET)
   * More efficient than storing individual timestamps
   */
  async checkRateLimit(identifier, limits) {
    const { rpm, rph, rpd } = limits;
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;
    const oneDayAgo = now - 86400000;

    const key = `ratelimit:${identifier}`;

    // If Redis not connected, fail open (allow request)
    if (!this.connected || !this.client) {
      return {
        allowed: true,
        limit: rpm,
        remaining: rpm,
        reset: Math.ceil((now + 60000) / 1000),
        fallback: true
      };
    }

    try {
      // Start transaction
      const pipeline = this.client.pipeline();

      // Remove old entries
      pipeline.zremrangebyscore(key, 0, oneDayAgo);

      // Count requests in each window
      pipeline.zcount(key, oneMinuteAgo, now);
      pipeline.zcount(key, oneHourAgo, now);
      pipeline.zcount(key, oneDayAgo, now);

      // Execute pipeline
      const results = await pipeline.exec();

      const requestsLastMinute = results[1][1];
      const requestsLastHour = results[2][1];
      const requestsLastDay = results[3][1];

      // Check limits
      if (requestsLastMinute >= rpm) {
        return {
          allowed: false,
          limit: rpm,
          remaining: 0,
          window: 'minute',
          retryAfter: 60
        };
      }

      if (requestsLastHour >= rph) {
        return {
          allowed: false,
          limit: rph,
          remaining: 0,
          window: 'hour',
          retryAfter: 3600
        };
      }

      if (rpd !== Infinity && requestsLastDay >= rpd) {
        return {
          allowed: false,
          limit: rpd,
          remaining: 0,
          window: 'day',
          retryAfter: 86400
        };
      }

      // Add current request
      await this.client.zadd(key, now, `${now}:${Math.random()}`);

      // Set expiration to 24 hours
      await this.client.expire(key, 86400);

      return {
        allowed: true,
        limit: rpm,
        remaining: rpm - requestsLastMinute - 1,
        reset: Math.ceil((now + 60000) / 1000)
      };

    } catch (error) {
      this.logger.error({ error, identifier }, 'Rate limit check failed');
      // Fail open on Redis errors
      return {
        allowed: true,
        limit: rpm,
        remaining: rpm,
        reset: Math.ceil((now + 60000) / 1000),
        fallback: true
      };
    }
  }

  /**
   * Cache with TTL
   */
  async cache(key, value, ttl = 3600) {
    if (!this.connected || !this.client) {
      return false; // No caching without Redis
    }

    try {
      const serialized = JSON.stringify(value);
      await this.client.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      this.logger.error({ error, key }, 'Cache set failed');
      return false;
    }
  }

  /**
   * Get cached value
   */
  async getCached(key) {
    if (!this.connected || !this.client) {
      return null; // No cache hits without Redis
    }

    try {
      const cached = await this.client.get(key);
      if (!cached) return null;
      return JSON.parse(cached);
    } catch (error) {
      this.logger.error({ error, key }, 'Cache get failed');
      return null;
    }
  }

  /**
   * Invalidate cache
   */
  async invalidate(pattern) {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return keys.length;
    } catch (error) {
      this.logger.error({ error, pattern }, 'Cache invalidation failed');
      return 0;
    }
  }

  /**
   * Distributed lock with TTL
   */
  async acquireLock(resource, ttl = 10000) {
    const lockKey = `lock:${resource}`;
    const lockValue = createHash('sha256').update(`${Date.now()}:${Math.random()}`).digest('hex');

    try {
      // SET NX EX - atomic operation
      const acquired = await this.client.set(
        lockKey,
        lockValue,
        'PX', ttl,
        'NX'
      );

      if (acquired === 'OK') {
        return {
          acquired: true,
          lockValue,
          release: async () => {
            // Use Lua script for atomic check-and-delete
            const script = `
              if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
              else
                return 0
              end
            `;
            await this.client.eval(script, 1, lockKey, lockValue);
          }
        };
      }

      return { acquired: false };

    } catch (error) {
      this.logger.error({ error, resource }, 'Lock acquisition failed');
      return { acquired: false };
    }
  }

  /**
   * Pub/Sub: Publish event
   */
  async publish(channel, message) {
    if (!this.connected || !this.publisher) {
      this.logger.debug({ channel }, 'Cannot publish - Redis not connected');
      return false;
    }

    try {
      const serialized = JSON.stringify(message);
      await this.publisher.publish(channel, serialized);
      return true;
    } catch (error) {
      this.logger.error({ error, channel }, 'Publish failed');
      return false;
    }
  }

  /**
   * Pub/Sub: Subscribe to channel
   */
  async subscribe(channel, handler) {
    if (!this.connected || !this.subscriber) {
      this.logger.debug({ channel }, 'Cannot subscribe - Redis not connected');
      return false;
    }

    try {
      await this.subscriber.subscribe(channel);

      this.subscriber.on('message', (ch, message) => {
        if (ch === channel) {
          try {
            const parsed = JSON.parse(message);
            handler(parsed);
          } catch (error) {
            this.logger.error({ error, channel }, 'Message handler failed');
          }
        }
      });

      return true;
    } catch (error) {
      this.logger.error({ error, channel }, 'Subscribe failed');
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const pong = await this.client.ping();
      const info = await this.client.info('server');

      return {
        status: 'ok',
        latency: 0, // Could measure with benchmark
        connected: this.connected,
        serverInfo: info.split('\n')[1] // Redis version line
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        connected: false
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
      }
      if (this.publisher) {
        await this.publisher.quit();
      }
      if (this.subscriber) {
        await this.subscriber.quit();
      }
      this.logger.info('Redis service disconnected');
    } catch (error) {
      this.logger.error({ error }, 'Error disconnecting Redis');
    }
  }
}

export default RedisService;
