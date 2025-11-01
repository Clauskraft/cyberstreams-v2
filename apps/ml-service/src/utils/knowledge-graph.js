import neo4j from 'neo4j-driver';

/**
 * Knowledge Graph Integration (Neo4j)
 *
 * Provides context enrichment and relationship mapping for threats:
 * - Threat actor profiles
 * - Attack patterns (MITRE ATT&CK)
 * - Indicator relationships (IOC co-occurrence)
 * - Campaign tracking
 */
export class KnowledgeGraph {
  constructor({ uri, user, password, enabled = false }) {
    this.enabled = enabled;
    this.connected = false;

    if (enabled) {
      try {
        this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
        this.connected = true;
      } catch (error) {
        console.error('Failed to connect to Neo4j:', error);
        this.connected = false;
      }
    }
  }

  /**
   * Check if knowledge graph is connected
   */
  isConnected() {
    return this.enabled && this.connected;
  }

  /**
   * Enrich threat document with context from knowledge graph
   */
  async enrichThreat(document) {
    if (!this.isConnected()) {
      return {
        ...document,
        enrichment: null,
        enrichmentStatus: 'unavailable'
      };
    }

    const session = this.driver.session();

    try {
      // Extract IOCs from document
      const iocs = this.extractIOCs(document);

      // Query related threats
      const relatedThreats = await this.findRelatedThreats(session, iocs);

      // Query associated actors
      const associatedActors = await this.findAssociatedActors(session, iocs);

      // Query common techniques
      const techniques = await this.findTechniques(session, iocs);

      // Query campaigns
      const campaigns = await this.findCampaigns(session, iocs);

      return {
        ...document,
        enrichment: {
          relatedThreats: relatedThreats.slice(0, 10),
          associatedActors: associatedActors.slice(0, 5),
          techniques: techniques.slice(0, 10),
          campaigns: campaigns.slice(0, 5),
          enrichedAt: new Date().toISOString()
        },
        enrichmentStatus: 'success'
      };

    } catch (error) {
      console.error('Enrichment failed:', error);
      return {
        ...document,
        enrichment: null,
        enrichmentStatus: 'error',
        enrichmentError: error.message
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Extract IOCs from document
   */
  extractIOCs(document) {
    const content = document.content || '';
    const ipPattern = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
    const domainPattern = /\b[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,6}\b/gi;

    return {
      ips: [...new Set(content.match(ipPattern) || [])],
      domains: [...new Set(content.match(domainPattern) || [])]
    };
  }

  /**
   * Find related threats based on IOC overlap
   */
  async findRelatedThreats(session, iocs) {
    if (iocs.ips.length === 0 && iocs.domains.length === 0) {
      return [];
    }

    const result = await session.run(`
      MATCH (i:Indicator)-[:RELATED_TO]-(t:Threat)
      WHERE i.value IN $indicators
      RETURN DISTINCT t.name as name,
             t.severity as severity,
             t.first_seen as firstSeen,
             COUNT(i) as iocOverlap
      ORDER BY iocOverlap DESC
      LIMIT 10
    `, {
      indicators: [...iocs.ips, ...iocs.domains]
    });

    return result.records.map(record => ({
      name: record.get('name'),
      severity: record.get('severity'),
      firstSeen: record.get('firstSeen'),
      iocOverlap: record.get('iocOverlap').toNumber()
    }));
  }

  /**
   * Find associated threat actors
   */
  async findAssociatedActors(session, iocs) {
    if (iocs.ips.length === 0 && iocs.domains.length === 0) {
      return [];
    }

    const result = await session.run(`
      MATCH (i:Indicator)-[:CONTAINS]-(t:Threat)-[:CONDUCTED_BY]-(a:Actor)
      WHERE i.value IN $indicators
      RETURN DISTINCT a.name as name,
             a.origin as origin,
             a.motivation as motivation,
             COUNT(t) as threatCount
      ORDER BY threatCount DESC
      LIMIT 5
    `, {
      indicators: [...iocs.ips, ...iocs.domains]
    });

    return result.records.map(record => ({
      name: record.get('name'),
      origin: record.get('origin'),
      motivation: record.get('motivation'),
      threatCount: record.get('threatCount').toNumber()
    }));
  }

  /**
   * Find MITRE ATT&CK techniques
   */
  async findTechniques(session, iocs) {
    if (iocs.ips.length === 0 && iocs.domains.length === 0) {
      return [];
    }

    const result = await session.run(`
      MATCH (i:Indicator)-[:CONTAINS]-(t:Threat)-[:USES]-(tech:Technique)
      WHERE i.value IN $indicators
      RETURN DISTINCT tech.mitre_id as mitreId,
             tech.name as name,
             tech.tactic as tactic,
             COUNT(t) as usage
      ORDER BY usage DESC
      LIMIT 10
    `, {
      indicators: [...iocs.ips, ...iocs.domains]
    });

    return result.records.map(record => ({
      mitreId: record.get('mitreId'),
      name: record.get('name'),
      tactic: record.get('tactic'),
      usage: record.get('usage').toNumber()
    }));
  }

  /**
   * Find associated campaigns
   */
  async findCampaigns(session, iocs) {
    if (iocs.ips.length === 0 && iocs.domains.length === 0) {
      return [];
    }

    const result = await session.run(`
      MATCH (i:Indicator)-[:CONTAINS]-(t:Threat)-[:PART_OF]-(c:Campaign)
      WHERE i.value IN $indicators
      RETURN DISTINCT c.name as name,
             c.start_date as startDate,
             c.end_date as endDate,
             COUNT(t) as threatCount
      ORDER BY threatCount DESC
      LIMIT 5
    `, {
      indicators: [...iocs.ips, ...iocs.domains]
    });

    return result.records.map(record => ({
      name: record.get('name'),
      startDate: record.get('startDate'),
      endDate: record.get('endDate'),
      threatCount: record.get('threatCount').toNumber()
    }));
  }

  /**
   * Store threat pattern in knowledge graph
   */
  async storeThreatPattern(pattern) {
    if (!this.isConnected()) return;

    const session = this.driver.session();

    try {
      await session.run(`
        MERGE (p:Pattern {id: $patternId})
        SET p.techniques = $techniques,
            p.frequency = $frequency,
            p.confidence = $confidence,
            p.last_seen = datetime(),
            p.updated_at = datetime()
      `, {
        patternId: pattern.id,
        techniques: pattern.techniques,
        frequency: pattern.frequency,
        confidence: pattern.confidence
      });
    } finally {
      await session.close();
    }
  }

  /**
   * Create threat node with relationships
   */
  async createThreat(threat) {
    if (!this.isConnected()) return;

    const session = this.driver.session();

    try {
      await session.run(`
        CREATE (t:Threat {
          id: $id,
          name: $name,
          severity: $severity,
          description: $description,
          first_seen: datetime(),
          last_seen: datetime()
        })
      `, {
        id: threat.id,
        name: threat.name,
        severity: threat.severity,
        description: threat.description
      });

      // Create IOC nodes and relationships
      if (threat.iocs) {
        for (const ioc of threat.iocs) {
          await session.run(`
            MERGE (i:Indicator {value: $value, type: $type})
            WITH i
            MATCH (t:Threat {id: $threatId})
            MERGE (t)-[:CONTAINS]->(i)
          `, {
            value: ioc.value,
            type: ioc.type,
            threatId: threat.id
          });
        }
      }

    } finally {
      await session.close();
    }
  }

  /**
   * Close driver connection
   */
  async close() {
    if (this.driver) {
      await this.driver.close();
    }
  }
}
