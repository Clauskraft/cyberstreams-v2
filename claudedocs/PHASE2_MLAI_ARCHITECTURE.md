# Phase 2: Self-Learning ML/AI Architecture
## Intelligent Threat Detection System

**Date:** 2025-10-30
**Status:** 🔄 In Progress
**Dependencies:** Phase 1 ✅

---

## 🎯 Objective

Design and implement world-class self-learning intelligence system for Cyberstreams V2 that automatically improves threat detection over time.

**Key Requirements:**
- Automated threat detection (>85% accuracy)
- Pattern recognition across multiple sources
- Predictive analytics (forecast threats)
- Continuous learning (no manual retraining)
- Explainable AI (transparent decisions)

---

## 🏗️ System Architecture

### Component Overview

```
┌────────────────────────────────────────────────────────────┐
│              ML/AI Intelligence Layer                       │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │   Threat     │  │   Pattern    │  │   Predictive    │ │
│  │  Detection   │  │  Recognition │  │   Analytics     │ │
│  │   Engine     │  │    Engine    │  │    Engine       │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘ │
│         │                  │                   │          │
│         └──────────────────┼───────────────────┘          │
│                            │                              │
│         ┌──────────────────▼───────────────────┐          │
│         │     Feature Engineering Pipeline     │          │
│         │  - Text vectorization (TF-IDF, BERT) │          │
│         │  - Entity extraction (NER)           │          │
│         │  - Temporal features                 │          │
│         │  - Source reputation scores          │          │
│         └──────────────────┬───────────────────┘          │
│                            │                              │
└────────────────────────────┼──────────────────────────────┘
                             │
            ┌────────────────▼────────────────┐
            │   Training & Serving Pipeline   │
            ├─────────────────────────────────┤
            │  Model Registry (MLflow)        │
            │  Training Queue (Kafka)         │
            │  Model Server (TensorFlow)      │
            │  A/B Testing Framework          │
            └────────────────┬────────────────┘
                             │
            ┌────────────────▼────────────────┐
            │      Knowledge Graph            │
            │  (Neo4j / ArangoDB)             │
            │  - Entities (threats, actors)   │
            │  - Relationships                │
            │  - Context enrichment           │
            └─────────────────────────────────┘
```

---

## 🧠 ML/AI Components

### 1. Threat Detection Engine

**Purpose:** Classify threats in real-time as they arrive

**Models:**
```yaml
threat_classifier:
  type: Supervised Learning (Multi-class)
  algorithm: XGBoost + BERT embeddings
  classes: [critical, high, medium, low, informational]
  features:
    - Text embeddings (768-dim BERT)
    - Source reputation (0-100)
    - Entity mentions (IOCs, CVEs)
    - Temporal features (time of day, day of week)
    - Historical patterns

  training:
    dataset: Public threat intel feeds + user feedback
    size: 100K+ labeled samples
    validation: 80/10/10 train/val/test split
    retraining: Weekly + on-demand (performance drop)

  performance_targets:
    accuracy: ">85%"
    precision: ">90% (critical/high)"
    recall: ">80%"
    latency: "<100ms p95"

anomaly_detector:
  type: Unsupervised Learning
  algorithm: Isolation Forest + Autoencoder
  purpose: Detect novel/unknown threats
  features:
    - Behavioral patterns
    - Statistical anomalies
    - Outlier detection

  training:
    dataset: Historical normal traffic patterns
    retraining: Daily (incremental)

  performance_targets:
    false_positive_rate: "<5%"
    novelty_detection: ">70%"
```

**Implementation:**
```python
# apps/ml-service/src/threat_detector.py
class ThreatDetectionEngine:
    def __init__(self, model_registry):
        self.classifier = model_registry.load_model('threat_classifier_v1')
        self.anomaly_detector = model_registry.load_model('anomaly_detector_v1')
        self.feature_engineer = FeatureEngineer()

    async def detect_threat(self, document):
        """
        Classify threat level and detect anomalies
        Returns: ThreatScore with confidence and explanation
        """
        # Extract features
        features = await self.feature_engineer.extract(document)

        # Get predictions from both models
        classification = self.classifier.predict(features)
        anomaly_score = self.anomaly_detector.predict(features)

        # Combine results
        threat_score = ThreatScore(
            severity=classification['class'],
            confidence=classification['probability'],
            anomaly_score=anomaly_score,
            explanation=self._explain_prediction(features, classification),
            recommendations=self._get_recommendations(classification)
        )

        return threat_score

    def _explain_prediction(self, features, classification):
        """SHAP values for explainability"""
        return self.explainer.explain(features, classification)
```

### 2. Pattern Recognition Engine

**Purpose:** Identify recurring attack patterns and threat actor behaviors

**Algorithms:**
```yaml
pattern_mining:
  algorithm: FP-Growth + DBSCAN clustering
  inputs:
    - Threat indicators (IOCs)
    - Attack techniques (MITRE ATT&CK)
    - Target entities
    - Temporal sequences

  outputs:
    - Frequent itemsets (co-occurring IOCs)
    - Attack patterns (technique sequences)
    - Threat actor profiles
    - Campaign clusters

  performance:
    update_frequency: Hourly
    min_support: 0.01  # 1% of documents
    min_confidence: 0.7

sequence_analysis:
  algorithm: LSTM + Attention mechanism
  purpose: Predict attack progression
  inputs: Temporal sequences of events
  outputs: Next likely attack steps

temporal_patterns:
  algorithm: Time series analysis (Prophet)
  purpose: Identify temporal trends
  outputs:
    - Peak threat times
    - Seasonal patterns
    - Trend forecasting
```

### 3. Predictive Analytics Engine

**Purpose:** Forecast future threats and attack vectors

**Models:**
```yaml
threat_forecasting:
  algorithm: LSTM + Prophet hybrid
  inputs:
    - Historical threat data (12 months)
    - External indicators (CVE releases, news)
    - Seasonal patterns

  outputs:
    - Next 7-day threat forecast
    - Emerging threat predictions
    - Risk trend analysis

  performance:
    accuracy: ">75% (7-day)"
    update: Daily

vulnerability_prediction:
  algorithm: Graph Neural Network (GNN)
  inputs:
    - Software dependency graphs
    - CVE historical data
    - Exploit availability

  outputs:
    - Vulnerability risk scores
    - Exploitation likelihood
    - Patch priority ranking
```

---

## 🔄 Training & Serving Pipeline

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Training Pipeline                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Data Sources] → [Feature Store] → [Training Queue]    │
│       ↓               ↓                    ↓            │
│  [Labeling]     [Validation]         [Model Training]   │
│       ↓               ↓                    ↓            │
│  [Quality Gate] [Model Registry] → [Model Evaluation]   │
│                       ↓                    ↓            │
│               [A/B Testing] → [Production Deploy]       │
│                                            ↓            │
│                                    [Model Serving]      │
│                                            ↓            │
│                                   [Monitoring & Drift]  │
│                                            ↓            │
│                                  [Retraining Trigger]   │
│                                            │            │
│                                            └─────┐      │
│                                                  ↓      │
└──────────────────────────────────────────────────────────┘
                                        [LOOP BACK]
```

### Components

**1. Feature Store** (Feast/Tecton)
```yaml
purpose: Centralized feature management
features:
  - Feature versioning
  - Point-in-time correctness
  - Online/offline consistency
  - Feature discovery catalog

storage:
  online: Redis (low latency)
  offline: S3 + Parquet (training)
```

**2. Model Registry** (MLflow)
```yaml
purpose: Model lifecycle management
capabilities:
  - Model versioning
  - Experiment tracking
  - Metadata storage
  - Model lineage
  - A/B test management

storage: PostgreSQL + S3
```

**3. Training Queue** (Kafka + Celery)
```yaml
purpose: Async training orchestration
workflows:
  - Scheduled retraining (weekly)
  - On-demand training (performance drop)
  - Incremental updates (daily)

monitoring:
  - Training job status
  - Resource utilization
  - Training metrics
```

**4. Model Serving** (TensorFlow Serving / Seldon)
```yaml
serving_strategies:
  - REST API (synchronous)
  - gRPC (high throughput)
  - Batch prediction (offline)

features:
  - Model versioning
  - A/B testing (traffic splitting)
  - Canary deployments
  - Auto-scaling

performance:
  - <100ms latency (p95)
  - 1000+ QPS per instance
  - Auto-scale on load
```

---

## 🕸️ Knowledge Graph Architecture

### Schema Design

```cypher
// Node Types
(:Threat {id, name, type, severity, first_seen, last_seen})
(:Actor {id, name, aliases, origin, motivation})
(:Technique {id, mitre_id, name, tactic, description})
(:Indicator {id, type, value, confidence, source})
(:Target {id, name, sector, region})
(:Campaign {id, name, start_date, end_date})
(:Vulnerability {id, cve_id, cvss_score, published_date})

// Relationship Types
(:Threat)-[:USES]->(:Technique)
(:Actor)-[:CONDUCTS]->(:Campaign)
(:Campaign)-[:TARGETS]->(:Target)
(:Threat)-[:CONTAINS]->(:Indicator)
(:Technique)-[:EXPLOITS]->(:Vulnerability)
(:Actor)-[:ASSOCIATED_WITH]->(:Threat)
(:Indicator)-[:RELATED_TO]->(:Indicator)

// Temporal relationships
(:Threat)-[:PRECEDED_BY {days: int}]->(:Threat)
(:Campaign)-[:EVOLVED_FROM]->(:Campaign)
```

### Query Examples

```cypher
// Find all techniques used by an actor
MATCH (a:Actor {name: 'APT28'})-[:CONDUCTS]->(c:Campaign)
      -[:USES]->(t:Technique)
RETURN DISTINCT t.name, t.mitre_id

// Identify threat patterns (co-occurring IOCs)
MATCH (t:Threat)-[:CONTAINS]->(i1:Indicator),
      (t)-[:CONTAINS]->(i2:Indicator)
WHERE i1.type = 'ip' AND i2.type = 'domain'
RETURN i1.value, i2.value, COUNT(*) as frequency
ORDER BY frequency DESC

// Predict next attack step
MATCH path = (t1:Technique)-[:PRECEDED_BY*1..3]->(t2:Technique)
WHERE t1.mitre_id IN ['T1566', 'T1059']
RETURN t2.name, LENGTH(path) as steps, COUNT(*) as frequency
ORDER BY frequency DESC

// Context enrichment for IOC
MATCH (i:Indicator {value: '192.168.1.1'})
      -[:RELATED_TO*1..2]-(related)
RETURN DISTINCT related.type, related.value, related.confidence
```

### Implementation

```python
# apps/ml-service/src/knowledge_graph.py
from neo4j import GraphDatabase

class KnowledgeGraph:
    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    async def enrich_threat(self, threat_document):
        """Add context from knowledge graph"""
        with self.driver.session() as session:
            # Extract entities
            entities = self.extract_entities(threat_document)

            # Query relationships
            enrichment = session.run("""
                MATCH (i:Indicator {value: $ioc})
                      -[:RELATED_TO*1..2]-(related)
                RETURN related
                LIMIT 20
            """, ioc=entities['iocs'][0])

            return self._format_enrichment(enrichment)

    async def store_threat_pattern(self, pattern):
        """Store discovered pattern in graph"""
        with self.driver.session() as session:
            session.run("""
                MERGE (p:Pattern {id: $pattern_id})
                SET p.techniques = $techniques,
                    p.frequency = $frequency,
                    p.last_seen = datetime()
            """, pattern_id=pattern.id,
                 techniques=pattern.techniques,
                 frequency=pattern.frequency)
```

---

## 🔁 Feedback Loop System

### Architecture

```
[User Feedback] ──┐
                  │
[Analyst Labels] ─┼─→ [Feedback Collector]
                  │          ↓
[Model Errors] ───┘    [Quality Filter]
                            ↓
                    [Training Dataset]
                            ↓
                    [Retraining Trigger]
                            ↓
                    [Model Update]
                            ↓
                    [Performance Monitor]
                            │
                            └─→ [LOOP]
```

### Implementation

```typescript
// packages/ml-feedback/src/feedback-service.ts
export class FeedbackService {
  async submitFeedback(feedback: ThreatFeedback) {
    // Validate feedback
    const validated = await this.validate(feedback);

    // Store in feedback database
    await this.store(validated);

    // Check if retraining needed
    const metrics = await this.getModelMetrics();
    if (this.shouldRetrain(metrics)) {
      await this.triggerRetraining();
    }
  }

  private shouldRetrain(metrics: ModelMetrics): boolean {
    // Retrain if:
    // - Accuracy drops >5%
    // - Feedback volume > 1000 new samples
    // - 7 days since last training
    return (
      metrics.accuracy < metrics.baseline * 0.95 ||
      metrics.newSamples > 1000 ||
      metrics.daysSinceTraining > 7
    );
  }

  async triggerRetraining() {
    // Push to training queue
    await this.kafka.send('ml.training.queue', {
      model: 'threat_classifier',
      trigger: 'feedback_threshold',
      timestamp: Date.now()
    });
  }
}
```

---

## 📊 Monitoring & Drift Detection

### Key Metrics

```yaml
model_performance:
  - Accuracy (overall)
  - Precision/Recall (per class)
  - F1 score
  - Confusion matrix
  - ROC-AUC

data_drift:
  - Feature distribution shift (KL divergence)
  - Target distribution shift
  - Data quality metrics

system_metrics:
  - Prediction latency (p50, p95, p99)
  - Throughput (predictions/sec)
  - Error rate
  - Model load time

business_metrics:
  - False positive rate (user impact)
  - Threat detection rate
  - Time to detection
  - Analyst feedback ratio
```

### Drift Detection

```python
# apps/ml-service/src/drift_detector.py
from scipy.stats import ks_2samp
import numpy as np

class DriftDetector:
    def __init__(self, reference_data):
        self.reference = reference_data

    async def detect_drift(self, production_data):
        """Detect data drift using KS test"""
        drift_detected = {}

        for feature in production_data.columns:
            # Kolmogorov-Smirnov test
            statistic, pvalue = ks_2samp(
                self.reference[feature],
                production_data[feature]
            )

            drift_detected[feature] = {
                'statistic': statistic,
                'pvalue': pvalue,
                'drifted': pvalue < 0.05  # Significance level
            }

        if any(d['drifted'] for d in drift_detected.values()):
            await self.alert_drift(drift_detected)
            await self.trigger_retraining()

        return drift_detected
```

---

## 🚀 Implementation Roadmap

### Week 1: Foundation
- [ ] Set up ML service infrastructure (Docker, Kubernetes)
- [ ] Deploy feature store (Feast/Redis)
- [ ] Deploy model registry (MLflow)
- [ ] Set up knowledge graph (Neo4j)

### Week 2: Model Development
- [ ] Collect and label training data (public datasets)
- [ ] Implement feature engineering pipeline
- [ ] Train initial threat classifier (baseline model)
- [ ] Train anomaly detector
- [ ] Implement SHAP explainability

### Week 3: Integration
- [ ] Integrate ML service with API gateway
- [ ] Connect to Kafka for async predictions
- [ ] Implement feedback collection API
- [ ] Build knowledge graph ingestion pipeline

### Week 4: Optimization & Testing
- [ ] Performance optimization (<100ms latency)
- [ ] A/B testing framework
- [ ] Drift detection monitoring
- [ ] Load testing (1000+ QPS)

---

## 🎯 Success Criteria

```yaml
intelligence:
  - Threat classifier accuracy: ">85%"
  - False positive rate: "<5%"
  - Anomaly detection: ">70% novel threats"
  - Prediction latency: "<100ms p95"

selvlærende:
  - Automated retraining: "Weekly + on-demand"
  - Model improvement: "+2% accuracy per quarter"
  - Feedback integration: "<24h from feedback to retraining"
  - Drift detection: "<1 hour alert time"

skalerbarhed:
  - Throughput: "1000+ predictions/sec"
  - Horizontal scaling: "Auto-scale on 80% CPU"
  - Training time: "<4 hours for full retrain"
```

---

## 📚 Technology Stack

```yaml
ml_frameworks:
  - TensorFlow / PyTorch: Deep learning
  - scikit-learn: Traditional ML
  - XGBoost: Gradient boosting
  - Hugging Face Transformers: NLP (BERT)

ml_ops:
  - MLflow: Model registry
  - Feast: Feature store
  - TensorFlow Serving / Seldon: Model serving
  - Kafka: Training queue

knowledge_graph:
  - Neo4j: Primary graph database
  - ArangoDB: Alternative (multi-model)

monitoring:
  - Prometheus: Metrics
  - Grafana: Dashboards
  - Evidently AI: Drift detection
```

---

**Status:** 🔄 Design Complete, Ready for Implementation
**Next:** Phase 2 Implementation + Phase 3 Code Quality Audit

**Author:** Claude (Autonomous Mode)
