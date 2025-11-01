/**
 * API Key Store (PostgreSQL-backed)
 *
 * For now, uses in-memory mock data
 * TODO: Migrate to PostgreSQL in Phase 5
 */

class ApiKeyStore {
  constructor({ logger }) {
    this.logger = logger;
    this.mockKeys = {
      'key_test_1234567890abcdef': {
        id: 'key-1',
        name: 'Test Key',
        userId: 'user-1',
        permissions: ['search', 'stream'],
        rateLimitRpm: 60,
        rateLimitRph: 3600,
        rateLimitRpd: 86400,
        isRevoked: false,
        createdAt: new Date(),
        lastUsedAt: null
      },
      'key_demo_abcdef1234567890': {
        id: 'key-2',
        name: 'Demo Key',
        userId: 'user-2',
        permissions: ['search', 'stream'],
        rateLimitRpm: 300,
        rateLimitRph: 18000,
        rateLimitRpd: Infinity,
        isRevoked: false,
        createdAt: new Date(),
        lastUsedAt: null
      },
      'key_admin_supersecret123': {
        id: 'key-admin',
        name: 'Admin Key',
        userId: 'admin-1',
        permissions: ['search', 'stream', 'admin'],
        rateLimitRpm: 1000,
        rateLimitRph: 60000,
        rateLimitRpd: Infinity,
        isRevoked: false,
        createdAt: new Date(),
        lastUsedAt: null
      }
    };
  }

  /**
   * Get API key data
   */
  async getApiKey(apiKey) {
    // TODO: Replace with PostgreSQL query
    return this.mockKeys[apiKey] || null;
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(apiKey) {
    // TODO: Replace with PostgreSQL update
    if (this.mockKeys[apiKey]) {
      this.mockKeys[apiKey].lastUsedAt = new Date();
    }
  }

  /**
   * Create new API key
   */
  async createApiKey(data) {
    // TODO: Replace with PostgreSQL insert
    const apiKey = `key_${data.name.toLowerCase()}_${Math.random().toString(36).substring(2, 15)}`;

    this.mockKeys[apiKey] = {
      id: `key-${Object.keys(this.mockKeys).length + 1}`,
      name: data.name,
      userId: data.userId,
      permissions: data.permissions || ['search'],
      rateLimitRpm: data.rateLimitRpm || 60,
      rateLimitRph: data.rateLimitRph || 3600,
      rateLimitRpd: data.rateLimitRpd || 86400,
      isRevoked: false,
      createdAt: new Date(),
      lastUsedAt: null
    };

    return { apiKey, ...this.mockKeys[apiKey] };
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(apiKey) {
    // TODO: Replace with PostgreSQL update
    if (this.mockKeys[apiKey]) {
      this.mockKeys[apiKey].isRevoked = true;
      return true;
    }
    return false;
  }

  /**
   * List API keys for user
   */
  async listApiKeys(userId) {
    // TODO: Replace with PostgreSQL query
    return Object.entries(this.mockKeys)
      .filter(([_, data]) => data.userId === userId)
      .map(([key, data]) => ({
        apiKey: key,
        ...data
      }));
  }
}

export default ApiKeyStore;
