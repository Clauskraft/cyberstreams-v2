import * as tf from '@tensorflow/tfjs-node';
import { v4 as uuidv4 } from 'uuid';

/**
 * Threat Detection Engine - Self-learning threat classification
 *
 * Features:
 * - Multi-class threat classification (critical/high/medium/low/info)
 * - Anomaly detection for novel threats
 * - Explainable AI (feature importance)
 * - Continuous learning from feedback
 */
export class ThreatDetectionEngine {
  constructor({ modelRegistry, knowledgeGraph, logger }) {
    this.modelRegistry = modelRegistry;
    this.knowledgeGraph = knowledgeGraph;
    this.logger = logger;

    this.classifier = null;
    this.anomalyDetector = null;
    this.feedbackBuffer = [];
    this.metrics = {
      totalPredictions: 0,
      accuracy: 0,
      lastTraining: null,
      feedbackCount: 0
    };

    // Threat severity classes
    this.classes = ['critical', 'high', 'medium', 'low', 'informational'];
    this.classToIndex = {
      'critical': 0,
      'high': 1,
      'medium': 2,
      'low': 3,
      'informational': 4
    };
  }

  /**
   * Initialize models - load from registry or create baseline
   */
  async initialize() {
    try {
      // Try loading existing models
      const classifierPath = await this.modelRegistry.getModelPath('threat_classifier');

      if (classifierPath) {
        this.logger.info('Loading threat classifier from registry');
        this.classifier = await tf.loadLayersModel(`file://${classifierPath}/model.json`);
      } else {
        this.logger.info('Creating baseline threat classifier');
        this.classifier = this.createBaselineClassifier();
      }

      this.logger.info('Threat detection engine initialized');
    } catch (error) {
      this.logger.error({ error }, 'Failed to initialize models');
      // Create fallback model
      this.classifier = this.createBaselineClassifier();
    }
  }

  /**
   * Create baseline classifier model
   */
  createBaselineClassifier() {
    const model = tf.sequential({
      layers: [
        // Input: Feature vector (will be standardized to 128 dimensions)
        tf.layers.dense({ inputShape: [128], units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: this.classes.length, activation: 'softmax' })
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return model;
  }

  /**
   * Predict threat level for a document
   * @param {Object} features - Extracted features from document
   * @returns {Object} Prediction with confidence and explanation
   */
  async predict(features) {
    const startTime = Date.now();

    try {
      // Convert features to tensor
      const featureVector = this.featuresToVector(features);
      const input = tf.tensor2d([featureVector]);

      // Get prediction
      const prediction = this.classifier.predict(input);
      const probabilities = await prediction.array();
      const predictionArray = probabilities[0];

      // Get predicted class and confidence
      const maxIndex = predictionArray.indexOf(Math.max(...predictionArray));
      const predictedClass = this.classes[maxIndex];
      const confidence = predictionArray[maxIndex];

      // Anomaly score (simplified - can be enhanced with autoencoder)
      const anomalyScore = this.calculateAnomalyScore(featureVector);

      // Calculate feature importance (simplified SHAP-like)
      const featureImportance = this.calculateFeatureImportance(featureVector, predictionArray);

      // Get recommendations
      const recommendations = this.getRecommendations(predictedClass, confidence, anomalyScore);

      // Update metrics
      this.metrics.totalPredictions++;

      const latencyMs = Date.now() - startTime;

      // Cleanup
      input.dispose();
      prediction.dispose();

      return {
        id: uuidv4(),
        severity: predictedClass,
        confidence: confidence,
        probabilities: {
          critical: predictionArray[0],
          high: predictionArray[1],
          medium: predictionArray[2],
          low: predictionArray[3],
          informational: predictionArray[4]
        },
        anomalyScore: anomalyScore,
        featureImportance: featureImportance,
        recommendations: recommendations,
        modelVersion: 'v1.0.0',
        latencyMs: latencyMs,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error({ error }, 'Prediction failed');
      throw error;
    }
  }

  /**
   * Convert features object to numerical vector
   */
  featuresToVector(features) {
    const vector = new Array(128).fill(0);

    // Simple feature encoding (can be enhanced with embeddings)

    // Text-based features (0-50)
    if (features.textEmbedding) {
      for (let i = 0; i < Math.min(50, features.textEmbedding.length); i++) {
        vector[i] = features.textEmbedding[i];
      }
    }

    // Source reputation (50-55)
    vector[50] = features.sourceReputation || 0.5;
    vector[51] = features.sourceAge || 0.5;
    vector[52] = features.sourceReliability || 0.5;

    // Temporal features (55-65)
    if (features.temporal) {
      vector[55] = features.temporal.hourOfDay / 24;
      vector[56] = features.temporal.dayOfWeek / 7;
      vector[57] = features.temporal.isWeekend ? 1 : 0;
    }

    // Entity counts (65-75)
    vector[65] = Math.min(features.iocCount || 0, 100) / 100;
    vector[66] = Math.min(features.cveCount || 0, 10) / 10;
    vector[67] = Math.min(features.urlCount || 0, 20) / 20;
    vector[68] = Math.min(features.emailCount || 0, 10) / 10;
    vector[69] = Math.min(features.ipCount || 0, 50) / 50;

    // Sentiment and tone (75-80)
    vector[75] = features.sentiment || 0;
    vector[76] = features.urgency || 0;
    vector[77] = features.technicalComplexity || 0;

    // Statistical features (80-90)
    vector[80] = Math.min(features.wordCount || 0, 10000) / 10000;
    vector[81] = Math.min(features.uniqueWords || 0, 5000) / 5000;
    vector[82] = features.averageWordLength || 0;
    vector[83] = features.sentenceCount || 0;

    // Security keywords presence (90-100)
    const securityKeywords = [
      'vulnerability', 'exploit', 'malware', 'ransomware', 'breach',
      'attack', 'threat', 'phishing', 'zero-day', 'backdoor'
    ];

    securityKeywords.forEach((keyword, idx) => {
      if (features.keywords && features.keywords.includes(keyword)) {
        vector[90 + idx] = 1;
      }
    });

    // Historical patterns (100-128) - for future enhancement
    // Reserved for pattern matching features

    return vector;
  }

  /**
   * Calculate anomaly score for outlier detection
   */
  calculateAnomalyScore(featureVector) {
    // Simplified anomaly detection using statistical distance
    // Can be enhanced with Isolation Forest or Autoencoder

    // Calculate distance from "normal" patterns
    const mean = 0.5;
    const distances = featureVector.map(val => Math.abs(val - mean));
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;

    // Normalize to 0-1 range
    return Math.min(avgDistance * 2, 1);
  }

  /**
   * Calculate feature importance (simplified SHAP)
   */
  calculateFeatureImportance(featureVector, prediction) {
    // This is a simplified version
    // Production should use actual SHAP or integrated gradients

    const topFeatures = [];

    // Identify features with highest absolute values
    featureVector.forEach((value, idx) => {
      if (Math.abs(value) > 0.5) {
        topFeatures.push({
          featureId: idx,
          value: value,
          contribution: value * prediction[0] // Simplified contribution
        });
      }
    });

    return topFeatures.slice(0, 10); // Top 10 features
  }

  /**
   * Get actionable recommendations based on prediction
   */
  getRecommendations(severity, confidence, anomalyScore) {
    const recommendations = [];

    if (severity === 'critical' || severity === 'high') {
      recommendations.push({
        priority: 'immediate',
        action: 'alert_security_team',
        message: 'High-severity threat detected. Immediate review recommended.'
      });

      if (confidence > 0.9) {
        recommendations.push({
          priority: 'immediate',
          action: 'initiate_response_protocol',
          message: 'High confidence detection. Consider activating incident response.'
        });
      }
    }

    if (anomalyScore > 0.7) {
      recommendations.push({
        priority: 'high',
        action: 'manual_review',
        message: 'Unusual pattern detected. Manual analyst review recommended.'
      });
    }

    if (confidence < 0.6) {
      recommendations.push({
        priority: 'medium',
        action: 'collect_more_context',
        message: 'Low confidence prediction. Additional context may improve accuracy.'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        action: 'monitor',
        message: 'Standard monitoring sufficient for this threat level.'
      });
    }

    return recommendations;
  }

  /**
   * Submit feedback for model improvement
   */
  async submitFeedback(feedback) {
    this.feedbackBuffer.push({
      ...feedback,
      id: uuidv4(),
      receivedAt: new Date().toISOString()
    });

    this.metrics.feedbackCount++;

    // Check if retraining threshold reached
    if (this.feedbackBuffer.length >= 100) {
      this.logger.info('Feedback threshold reached, triggering retraining');
      await this.triggerRetraining();
    }
  }

  /**
   * Trigger model retraining
   */
  async triggerRetraining() {
    // In production, this would push to Kafka training queue
    // For now, just log
    this.logger.info('Retraining trigger initiated', {
      feedbackCount: this.feedbackBuffer.length
    });

    // Save feedback to file for training pipeline
    // await this.saveFeedbackForTraining();

    // Clear buffer
    this.feedbackBuffer = [];
  }

  /**
   * Get current model metrics
   */
  async getMetrics() {
    return {
      ...this.metrics,
      modelVersion: 'v1.0.0',
      classes: this.classes,
      feedbackBufferSize: this.feedbackBuffer.length,
      uptime: process.uptime()
    };
  }
}
