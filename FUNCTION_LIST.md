# Cyberstreams V2 – Function List

## API Endpoints

### System & Health

#### `GET /api/v1/health`
**Description:** Health check endpoint for service monitoring and orchestration.

**Purpose:** Returns immediate status of the API service and its critical dependencies.

**Behavior:**
- Returns `status: "ok"` when service is operational
- Returns `status: "degraded"` when dependencies are partially unavailable
- Returns `status: "down"` when service cannot function
- Performs lightweight checks only (no database queries)
- Should respond in <500ms

**Response Schema:**
```json
{
  "status": "ok|degraded|down",
  "timestamp": "2025-10-25T22:40:00Z",
  "version": "0.1.0",
  "dependencies": {
    "opensearch": "ok|degraded|down",
    "minio": "ok|degraded|down"
  }
}
```

**Status Codes:**
- `200 OK` – Service operational
- `503 Service Unavailable` – Service degraded or down

**Use Cases:**
- Kubernetes liveness probes
- Load balancer health checks
- Uptime monitoring dashboards
- Container orchestration

---

### Search & Intelligence

#### `GET /api/v1/search`
**Description:** Full-text search across indexed cyber threat intelligence documents.

**Purpose:** Primary interface for querying threat data from all sources.

**Parameters:**
- `q` (string, required): Search query (1-1000 chars)
  - Supports boolean operators: AND, OR, NOT
  - Supports phrase search: "exact phrase"
  - Supports wildcards: threat*

- `source` (string, optional): Filter by data source
  - `rss` – RSS feed documents
  - `darkweb` – Dark web intelligence (requires approval)
  - `commercial` – Commercial threat feeds
  - `all` – All sources (default)

- `risk` (string, optional): Minimum risk level
  - `low`, `medium`, `high`, `critical`

- `from` (ISO 8601, optional): Start date filter
- `to` (ISO 8601, optional): End date filter

- `limit` (integer, optional): Results per page (1-100, default 20)
- `offset` (integer, optional): Pagination offset (default 0)

**Response Schema:**
```json
{
  "total": 1024,
  "hits": [
    {
      "id": "doc-uuid",
      "title": "CVE-2025-12345 Remote Code Execution",
      "content": "Description of vulnerability...",
      "source_id": "nvd-feed",
      "source_name": "National Vulnerability Database",
      "url": "https://nvd.nist.gov/vuln/detail/CVE-2025-12345",
      "risk": "critical",
      "published_at": "2025-10-25T12:00:00Z",
      "fetched_at": "2025-10-25T22:40:00Z",
      "tags": ["rce", "critical", "web-application"],
      "metadata": { "cvss_score": 9.8 }
    }
  ],
  "aggregations": {
    "sources": { "rss": 500, "commercial": 324, "darkweb": 200 },
    "risks": { "critical": 10, "high": 50, "medium": 200, "low": 764 }
  }
}
```

**Behavior:**
- Returns paginated results sorted by relevance
- Includes aggregation counts by source and risk
- Returns total hit count for infinite scroll
- Results cached for 5 minutes
- Timeout: 30 seconds

**Status Codes:**
- `200 OK` – Search successful
- `400 Bad Request` – Invalid parameters
- `503 Service Unavailable` – Search engine offline

**Use Cases:**
- Real-time threat monitoring dashboards
- Security analyst threat lookups
- Vulnerability tracking
- Incident response workflows

---

#### `GET /api/v1/activity/stream`
**Description:** Real-time Server-Sent Events (SSE) stream for threat updates.

**Purpose:** Push new threat intelligence as it arrives (intended for future development).

**Parameters:**
- `source` (string, optional): Filter by source
- `risk` (string, optional): Minimum risk level

**Behavior:**
- Maintains persistent connection to client
- Streams new documents as they are indexed
- Auto-reconnects with exponential backoff if disconnected
- Includes heartbeat events every 30 seconds

**Event Format:**
```
event: document
data: {"id":"...", "title":"...", "risk":"critical", ...}

event: heartbeat
data: {"timestamp":"2025-10-25T22:40:00Z"}
```

**Status Codes:**
- `200 OK` – Stream established
- `400 Bad Request` – Invalid filters

**Use Cases:**
- Live security operation center (SOC) dashboards
- Real-time alerting systems
- Automated incident response triggers

---

## Worker Functions

### `worker.js` – RSS Feed Parser

#### Purpose
Consumes RSS feed sources, normalizes content, and indexes documents to OpenSearch.

#### Behavior
1. **Fetch:** Retrieves RSS feed from configured URL
2. **Parse:** Extracts items using rss-parser library
3. **Normalize:** Maps feed fields to standard document schema
4. **Enrich:** Adds metadata (source_id, fetched_at, risk classification)
5. **Index:** Posts to OpenSearch `cyber-docs` alias
6. **Log:** Audit logs to immutable storage (180+ days)

#### Configuration
- Fetch interval: Per-source (1 hour – 24 hours typical)
- Timeout: 30 seconds per fetch
- Retry: Exponential backoff (2s, 4s, 8s, 16s max)
- Batch size: 100 documents per index call

#### Error Handling
- **Connection error:** Retry with backoff, skip if max retries
- **Parse error:** Log malformed feed, continue
- **Rate limit:** Respect Retry-After header, exponential backoff
- **Invalid document:** Log and skip, don't block batch

#### Output
Indexed documents with schema:
```json
{
  "id": "rss-cisa-alerts-<guid>",
  "title": "Alert: Vulnerability XYZ",
  "content": "Full item description",
  "source_id": "cisa-alerts",
  "source_name": "CISA Alerts and Advisories",
  "url": "https://cisa.gov/...",
  "risk": "high",
  "published_at": "2025-10-25T12:00:00Z",
  "fetched_at": "2025-10-25T22:40:00Z",
  "tags": ["critical-infrastructure"],
  "metadata": { "feed_item_id": "...", "category": "..." }
}
```

---

## Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│  Data Ingestion Layer                                        │
├──────────────────────────────────────────────────────────────┤
│  ├─ RSS Feeds (CISA, NVD, etc.)                             │
│  ├─ Commercial APIs (Recorded Future, Shodan, etc.)         │
│  └─ Dark Web Sources (isolated service, Tor egress)         │
└──────────────────────┬───────────────────────────────────────┘
                       │
         ┌─────────────▼──────────────┐
         │   Worker (Normalization)   │
         │   - Parse feed items       │
         │   - Extract & enrich       │
         │   - Risk classification    │
         └─────────────┬──────────────┘
                       │
         ┌─────────────▼──────────────┐
         │  OpenSearch (Search Store) │
         │  - cyber-docs alias        │
         │  - Full-text index         │
         │  - 90-day hot retention    │
         └─────────────┬──────────────┘
                       │
         ┌─────────────▼──────────────┐
         │   API (Query Layer)        │
         │   - /health                │
         │   - /search                │
         │   - /activity/stream       │
         └────────────────────────────┘
                       │
              ┌────────▼─────────┐
              │   End Users      │
              │   - Dashboards   │
              │   - CLI Tools    │
              │   - Webhooks     │
              └──────────────────┘
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2025-10-25 | Initial MVP – Health, Search, Stream endpoints |
| Planned: 0.2.0 | TBD | Authentication, filtering, export |
| Planned: 0.3.0 | TBD | Dark web integration, PII redaction |
| Planned: 1.0.0 | TBD | Commercial features, SLA |
