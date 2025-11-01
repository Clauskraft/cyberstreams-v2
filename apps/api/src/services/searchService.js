/**
 * Search Service
 *
 * Business logic for searching threat intelligence documents
 */

class SearchService {
  constructor({ logger }) {
    this.logger = logger;

    // TODO: Replace with real OpenSearch integration
    this.mockDocuments = [
      {
        id: 'doc-1',
        title: 'CVE-2025-12345 – Critical RCE in OpenSSL',
        content: 'A critical remote code execution vulnerability was discovered in OpenSSL affecting versions 3.0.0 through 3.0.8.',
        source_id: 'nvd-feed',
        source_name: 'National Vulnerability Database',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2025-12345',
        risk: 'critical',
        published_at: '2025-10-24T10:00:00Z',
        fetched_at: '2025-10-25T22:40:00Z',
        tags: ['rce', 'critical', 'openssl'],
        metadata: { cvss_score: 9.8, affected_versions: ['3.0.0-3.0.8'] }
      },
      {
        id: 'doc-2',
        title: 'CISA Alert – Increase in Ransomware Activity',
        content: 'CISA is warning of increased ransomware attacks targeting healthcare organizations.',
        source_id: 'cisa-alerts',
        source_name: 'CISA Alerts and Advisories',
        url: 'https://cisa.gov/alerts/2025-10-25',
        risk: 'high',
        published_at: '2025-10-25T08:30:00Z',
        fetched_at: '2025-10-25T22:40:00Z',
        tags: ['ransomware', 'healthcare', 'critical-infrastructure'],
        metadata: { attack_vectors: ['phishing', 'compromised-credentials'] }
      },
      {
        id: 'doc-3',
        title: 'Zero-Day SQL Injection in Django ORM',
        content: 'Security researchers discovered a zero-day SQL injection vulnerability in Django ORM.',
        source_id: 'reddit-netsec',
        source_name: 'Reddit r/netsec',
        url: 'https://reddit.com/r/netsec/comments/...',
        risk: 'critical',
        published_at: '2025-10-25T14:00:00Z',
        fetched_at: '2025-10-25T22:40:00Z',
        tags: ['sql-injection', 'django', 'zero-day'],
        metadata: { affected_versions: ['3.0-4.2'], patch_available: false }
      }
    ];
  }

  /**
   * Search documents
   */
  async search(query) {
    const { q, source, risk, from, to, limit, offset } = query;

    // TODO: Replace with OpenSearch query
    let results = this.mockDocuments.filter(doc => {
      // Full-text search
      const matchesQuery =
        doc.title.toLowerCase().includes(q.toLowerCase()) ||
        doc.content.toLowerCase().includes(q.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(q.toLowerCase()));

      if (!matchesQuery) return false;

      // Filter by source
      if (source && source !== 'all' && doc.source_id !== source) {
        return false;
      }

      // Filter by risk level
      if (risk && doc.risk !== risk) {
        return false;
      }

      // Filter by date range
      if (from && new Date(doc.published_at) < new Date(from)) {
        return false;
      }

      if (to && new Date(doc.published_at) > new Date(to)) {
        return false;
      }

      return true;
    });

    // Calculate aggregations
    const aggregations = {
      sources: {},
      risks: {}
    };

    results.forEach(doc => {
      aggregations.sources[doc.source_name] =
        (aggregations.sources[doc.source_name] || 0) + 1;
      aggregations.risks[doc.risk] =
        (aggregations.risks[doc.risk] || 0) + 1;
    });

    // Pagination
    const total = results.length;
    const paginated = results.slice(offset, offset + limit);

    return {
      total,
      hits: paginated,
      aggregations,
      _meta: {
        limit,
        offset,
        took_ms: 5 // Mock timing
      }
    };
  }
}

export default SearchService;
