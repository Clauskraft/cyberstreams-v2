import fs from 'fs/promises';
import path from 'path';

/**
 * Model Registry - Manages ML model versions and metadata
 *
 * In production, this would integrate with MLflow or similar
 * For now, provides local file-based model management
 */
export class ModelRegistry {
  constructor({ storageType = 'local', storagePath = './models' }) {
    this.storageType = storageType;
    this.storagePath = storagePath;
    this.models = new Map();
  }

  /**
   * Register a model with metadata
   */
  async registerModel(modelId, metadata) {
    const modelEntry = {
      id: modelId,
      ...metadata,
      registeredAt: new Date().toISOString()
    };

    this.models.set(modelId, modelEntry);

    // Save registry to disk
    await this.saveRegistry();

    return modelEntry;
  }

  /**
   * Get model path for loading
   */
  async getModelPath(modelId) {
    if (this.storageType === 'local') {
      const modelPath = path.join(this.storagePath, modelId);

      try {
        await fs.access(modelPath);
        return modelPath;
      } catch {
        return null;
      }
    }

    // For S3/cloud storage, would return signed URL
    return null;
  }

  /**
   * List all registered models
   */
  async listModels() {
    return Array.from(this.models.values());
  }

  /**
   * Get model metadata
   */
  async getModelMetadata(modelId) {
    return this.models.get(modelId) || null;
  }

  /**
   * Save registry to disk
   */
  async saveRegistry() {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });

      const registryPath = path.join(this.storagePath, 'registry.json');
      const registryData = JSON.stringify(
        Array.from(this.models.entries()),
        null,
        2
      );

      await fs.writeFile(registryPath, registryData);
    } catch (error) {
      console.error('Failed to save registry:', error);
    }
  }

  /**
   * Load registry from disk
   */
  async loadRegistry() {
    try {
      const registryPath = path.join(this.storagePath, 'registry.json');
      const registryData = await fs.readFile(registryPath, 'utf-8');
      const entries = JSON.parse(registryData);

      this.models = new Map(entries);
    } catch (error) {
      // Registry doesn't exist yet, start fresh
      this.models = new Map();
    }
  }
}
