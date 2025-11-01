/**
 * OpenSearch Service
 * 
 * Unified service layer for OpenSearch operations
 * Provides abstraction for CRUD operations, search, and index management
 */

import { 
  getOpenSearchClient, 
  isOpenSearchEnabled, 
  waitForOpenSearchReady,
  getOpenSearchIndex
} from '../../../lib/opensearch-client.js';
import { AppError } from '../middleware/errorHandler.js';

export class OpenSearchService {
  constructor({ logger }) {
    this.logger = logger;
    this.client = null;
    this.enabled = false;
  }

  /**
   * Initialize OpenSearch connection
   */
  async connect() {
    if (!isOpenSearchEnabled()) {
      this.logger.warn('OpenSearch not enabled (OPENSEARCH_URL not set)');
      return false;
    }

    try {
      this.client = getOpenSearchClient();
      this.enabled = await waitForOpenSearchReady(10000);
      
      if (this.enabled) {
        this.logger.info('OpenSearch connected');
      } else {
        this.logger.error('OpenSearch not ready after timeout');
      }
      
      return this.enabled;
    } catch (error) {
      this.logger.error({ error: error.message }, 'OpenSearch connection failed');
      return false;
    }
  }

  /**
   * Check if OpenSearch is available
   */
  isAvailable() {
    return this.enabled && this.client !== null;
  }

  /**
   * Get OpenSearch client
   */
  getClient() {
    if (!this.isAvailable()) {
      throw new AppError('OpenSearch not available', 503);
    }
    return this.client;
  }

  /**
   * Create a document
   */
  async create(index, document, options = {}) {
    const client = this.getClient();
    
    try {
      const response = await client.index({
        index,
        body: document,
        refresh: options.refresh || 'wait_for',
        pipeline: options.pipeline
      });

      return {
        id: response.body._id,
        index: response.body._index,
        version: response.body._version,
        result: response.body.result
      };
    } catch (error) {
      this.logger.error({ error: error.message, index }, 'Failed to create document');
      throw new AppError(`Failed to create document: ${error.message}`, 500);
    }
  }

  /**
   * Get a document by ID
   */
  async get(index, id) {
    const client = this.getClient();
    
    try {
      const response = await client.get({
        index,
        id
      });

      return {
        id: response.body._id,
        ...response.body._source
      };
    } catch (error) {
      if (error.meta?.statusCode === 404) {
        return null;
      }
      this.logger.error({ error: error.message, index, id }, 'Failed to get document');
      throw new AppError(`Failed to get document: ${error.message}`, 500);
    }
  }

  /**
   * Update a document
   */
  async update(index, id, updates, options = {}) {
    const client = this.getClient();
    
    try {
      const response = await client.update({
        index,
        id,
        body: {
          doc: updates
        },
        refresh: options.refresh || 'wait_for'
      });

      return {
        id: response.body._id,
        index: response.body._index,
        version: response.body._version,
        result: response.body.result
      };
    } catch (error) {
      if (error.meta?.statusCode === 404) {
        throw new AppError('Document not found', 404);
      }
      this.logger.error({ error: error.message, index, id }, 'Failed to update document');
      throw new AppError(`Failed to update document: ${error.message}`, 500);
    }
  }

  /**
   * Delete a document
   */
  async delete(index, id, options = {}) {
    const client = this.getClient();
    
    try {
      const response = await client.delete({
        index,
        id,
        refresh: options.refresh || 'wait_for'
      });

      return {
        id: response.body._id,
        index: response.body._index,
        version: response.body._version,
        result: response.body.result
      };
    } catch (error) {
      if (error.meta?.statusCode === 404) {
        return false;
      }
      this.logger.error({ error: error.message, index, id }, 'Failed to delete document');
      throw new AppError(`Failed to delete document: ${error.message}`, 500);
    }
  }

  /**
   * Search documents
   */
  async search(index, query, options = {}) {
    const client = this.getClient();
    
    try {
      const searchBody = {
        query: query.query || query,
        size: options.size || 20,
        from: options.from || 0,
        sort: options.sort || [{ _score: { order: 'desc' } }]
      };

      if (query.aggs) {
        searchBody.aggs = query.aggs;
      }

      const response = await client.search({
        index,
        body: searchBody
      });

      const hits = response.body.hits.hits;
      const total = response.body.hits.total;

      return {
        hits: hits.map(hit => ({
          id: hit._id,
          score: hit._score,
          ...hit._source
        })),
        total: typeof total === 'number' ? total : total.value,
        aggregations: response.body.aggregations,
        took: response.body.took
      };
    } catch (error) {
      this.logger.error({ error: error.message, index }, 'Search failed');
      throw new AppError(`Search failed: ${error.message}`, 500);
    }
  }

  /**
   * Bulk operations
   */
  async bulk(operations) {
    const client = this.getClient();
    
    try {
      const response = await client.bulk({
        body: operations
      });

      return {
        took: response.body.took,
        errors: response.body.errors,
        items: response.body.items
      };
    } catch (error) {
      this.logger.error({ error: error.message }, 'Bulk operation failed');
      throw new AppError(`Bulk operation failed: ${error.message}`, 500);
    }
  }

  /**
   * Check if index exists
   */
  async indexExists(index) {
    const client = this.getClient();
    
    try {
      const response = await client.indices.exists({ index });
      return typeof response === 'boolean' ? response : response.body;
    } catch (error) {
      this.logger.error({ error: error.message, index }, 'Failed to check index existence');
      return false;
    }
  }

  /**
   * Create index with template
   */
  async createIndex(index, template) {
    const client = this.getClient();
    
    try {
      await client.indices.create({
        index,
        body: template
      });
      this.logger.info({ index }, 'Index created');
      return true;
    } catch (error) {
      if (error.meta?.statusCode === 400 && error.message?.includes('already exists')) {
        this.logger.warn({ index }, 'Index already exists');
        return false;
      }
      this.logger.error({ error: error.message, index }, 'Failed to create index');
      throw new AppError(`Failed to create index: ${error.message}`, 500);
    }
  }

  /**
   * Get index template
   */
  async getIndexTemplate(name) {
    const client = this.getClient();
    
    try {
      const response = await client.indices.getIndexTemplate({ name });
      return response.body.index_templates?.[0]?.index_template;
    } catch (error) {
      if (error.meta?.statusCode === 404) {
        return null;
      }
      this.logger.error({ error: error.message, name }, 'Failed to get index template');
      throw new AppError(`Failed to get index template: ${error.message}`, 500);
    }
  }

  /**
   * Create or update index template
   */
  async putIndexTemplate(name, template) {
    const client = this.getClient();
    
    try {
      await client.indices.putIndexTemplate({
        name,
        body: template
      });
      this.logger.info({ name }, 'Index template created/updated');
      return true;
    } catch (error) {
      this.logger.error({ error: error.message, name }, 'Failed to put index template');
      throw new AppError(`Failed to put index template: ${error.message}`, 500);
    }
  }
}

export default OpenSearchService;

