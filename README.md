# Cyberstreams V2

[![Status: MVP](https://img.shields.io/badge/status-MVP-blue)](#) [![Node.js 20+](https://img.shields.io/badge/node-20+-brightgreen)](#) [![License: MIT](https://img.shields.io/badge/license-MIT-green)](#)

Open-source cybersecurity intelligence platform combining RSS feeds, dark web monitoring, and multi-source data aggregation into a unified search interface.

## 🎯 Quick Start

### Prerequisites
- Node.js 20+
- Railway CLI (for deployments)
- Docker (optional, for local testing)

### Installation

```bash
# Clone and setup
git clone https://github.com/yourusername/cyberstreams-v2.git
cd cyberstreams-v2

# Install all dependencies
npm run install:all

# Start development services
npm run start:api &  # Terminal 1: API on port 8080
npm run start:worker &  # Terminal 2: Worker process
```

### Verify Health

```bash
curl http://localhost:8080/api/v1/health
# Expected: {"status":"ok"}
```

## 📋 Architecture

### Services

**API Service** (`apps/api/`)
- Framework: Fastify 4.27.2
- Port: 8080 (configurable via `PORT` env var)
- Endpoints:
  - `GET /api/v1/health` – Health check
  - `GET /api/v1/search` – Search documents (planned)
  - `GET /api/v1/activity/stream` – Event stream (planned)

**Worker Service** (`apps/worker/`)
- Parser: RSS Parser 3.13.0
- Function: Fetches and normalizes RSS feeds
- Target: Index documents to OpenSearch via `cyber-docs` alias

### Infrastructure

```
┌─────────────────────────────────────────────────┐
│         Cyberstreams V2 Architecture           │
├─────────────────────────────────────────────────┤
│  API Service          │      Worker Service    │
│  (Fastify)            │    (RSS Parser)        │
│  - /health            │    - Feed ingestion    │
│  - /search            │    - Normalization     │
│  - /activity/stream   │    - Indexing          │
└──────────┬────────────┴──────────┬─────────────┘
           │                       │
           └───────────┬───────────┘
                       │
            ┌──────────▼──────────┐
            │    OpenSearch       │
            │  (cyber-docs alias) │
            └─────────────────────┘
                       │
            ┌──────────▼──────────┐
            │      MinIO          │
            │  (Quarantine store) │
            └─────────────────────┘
```

## 🚀 Deployment

### Railway (Recommended)

```bash
# Full deployment pipeline
make mvp

# Manual steps:
make scaffold       # Create service structure
make services       # Register with Railway
make deploy         # Deploy both services
make verify         # Health check
```

### Environment Variables

Required for deployments:

```bash
# Railway
RAILWAY_TOKEN=<your-token>
RAILWAY_API_SERVICE=<service-name>
RAILWAY_WORKER_SERVICE=<service-name>

# OpenSearch
OPENSEARCH_URL=https://opensearch.example.com
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=<password>

# Optional
PORT=8080
API_BASE=http://localhost:8080/api/v1
```

## 🔍 Audit & Quality

### Run Audits

```bash
# Source feed validation
npm run audit:sources

# OpenAPI contract verification
npm run audit:contract

# Scorecard (requires OpenSearch credentials)
export OPENSEARCH_URL=... OPENSEARCH_USERNAME=... OPENSEARCH_PASSWORD=...
npm run audit:score
```

### Expected Audit Checks

- ✅ FUNCTION_LIST.md exists
- ✅ QUICK_REFERENCE.md exists
- ✅ README.md and documentation
- ✅ OpenAPI contract defined
- ✅ Data sources declared in `data/Cyberfeeds/*.yaml`
- ✅ OpenSearch alias `cyber-docs` created
- ✅ Index template registered
- ✅ ≥1 document indexed
- ✅ API health endpoint responds 200
- ✅ Search endpoint functional
- ✅ CI workflow configured
- ✅ CHANGELOG.md maintained

## 📦 Project Structure

```
cyberstreams-v2/
├── .cursorules                 # Cursor AI agent rules
├── .version                    # Semantic version
├── .github/
│   └── workflows/
│       └── release.yml         # CI/CD pipeline
├── apps/
│   ├── api/                    # Fastify API service
│   │   ├── package.json
│   │   ├── server.js
│   │   └── node_modules/
│   └── worker/                 # RSS parser worker
│       ├── package.json
│       ├── worker.js
│       └── node_modules/
├── data/
│   └── Cyberfeeds/             # Feed source declarations
│       ├── rss-feeds.yaml
│       ├── commercial.yaml
│       └── darkweb.yaml        # (disabled by default)
├── docs/
│   ├── architecture.md
│   ├── retention.md
│   ├── ops/
│   │   ├── runbook.md
│   │   └── incident-procedure.md
│   └── features-map.md
├── infra/
│   ├── opensearch/             # OpenSearch templates
│   └── minio/                  # MinIO configuration
├── packages/
│   └── contracts/
│       └── openapi.yaml        # API specification
├── scripts/
│   ├── audit/
│   │   ├── contract-coverage.mjs
│   │   ├── scorecard.sh
│   │   └── sources-lint.mjs
│   └── release/
│       ├── changelog.sh
│       ├── verify-health.sh
│       └── version-bump.sh
├── .cursor/
│   ├── context.md              # Shared agent context
│   ├── agents/
│   │   ├── build.md
│   │   ├── test.md
│   │   ├── design.md
│   │   └── ci-release.md
│   ├── macros/
│   │   ├── audit.md
│   │   ├── deploy.md
│   │   └── release-to-railway.md
│   └── rules/
│       └── architectureconvention.mdc
├── makefile                    # Build orchestration
├── package.json                # Root workspace
├── CHANGELOG.md                # Version history
└── README.md                   # This file
```

## 🛠️ Development

### Adding Features

1. **Follow Architecture Convention**
   - Place code in `apps/` or `infra/` subdirectories
   - Single responsibility per module
   - Expose endpoints in `packages/contracts/openapi.yaml`

2. **Update OpenAPI Contract**
   ```yaml
   # packages/contracts/openapi.yaml
   /api/v1/new-endpoint:
     get:
       summary: "Description"
       responses:
         '200': { ... }
   ```

3. **Implement with Tests**
   - Test coverage ≥90% for new code
   - Contract tests validate OpenAPI compliance
   - Smoke tests for critical paths

4. **Audit Before Release**
   ```bash
   npm run audit:sources
   npm run audit:contract
   npm run audit:score
   ```

### Release Process

```bash
# Bump version
scripts/release/version-bump.sh patch  # or minor/major

# Generate changelog
scripts/release/changelog.sh

# Commit and tag
git add -A
git commit -m "chore(release): v$(cat .version)"
git tag v$(cat .version)
git push && git push --tags

# Verify deployment
scripts/release/verify-health.sh "https://your-api-domain"
```

## 🔐 Security & Compliance

### Data Classification
- **public**: General threat intelligence (default retention: 90 days)
- **internal**: Operational metadata
- **sensitive**: Credentials, authentication tokens
- **pii**: Personal information (PII detection & redaction required)

### Dark Web Governance
- All `.onion` sources **disabled by default**
- Requires legal approval and DPIA documentation
- Isolated service with Tor SOCKS5 egress
- Mandatory sanitization and quarantine

### Source Declaration
All data sources must be declared in `data/Cyberfeeds/*.yaml`:

```yaml
- id: feed-unique-id
  name: Feed Display Name
  url: https://example.com/feed
  type: rss|api|webhook
  risk: low|medium|high
  enabled: false  # Risky feeds start disabled
  fetch:
    interval: 3600
    parser: rss
    auth: null
```

### Audit Logging
Every fetch operation logs:
- `source_id`, `url`, `timestamp`
- `status_code`, `byte_count`, `sha256`
- `circuit_id` (for Tor), `worker_id`
- Logs retained immutable for ≥180 days

## 📊 Monitoring & Observability

### Logging
All services output JSON logs to stdout:

```json
{
  "timestamp": "2025-10-25T22:40:00Z",
  "level": "info",
  "trace_id": "abc123",
  "request_id": "req-456",
  "message": "Feed processed",
  "latency_ms": 245,
  "downstream_status": 200
}
```

### Metrics
Export metrics via OpenTelemetry to Grafana:
- Request latency (p50, p95, p99)
- Error rates by endpoint
- Feed ingestion throughput
- Index document count

### Health Checks
- API health: Dependency-light `/api/v1/health`
- Worker health: Embedded in worker process logs
- Infrastructure: OpenSearch cluster status, MinIO connectivity

## 📚 Documentation

- **[FUNCTION_LIST.md](./FUNCTION_LIST.md)** – API functions and behaviors
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** – Common commands and workflows
- **[docs/architecture.md](./docs/architecture.md)** – C4 diagrams and design
- **[docs/retention.md](./docs/retention.md)** – Data retention policies
- **[docs/ops/](./docs/ops/)** – Runbooks and incident procedures
- **[.cursor/context.md](./.cursor/context.md)** – AI agent shared context

## 🤝 Contributing

This project is maintained by **Claus Westergaard Kraft**.

### Guidelines
- Code comments & commits: **English**
- Documentation & README: **Danish** (with English summaries)
- Automated PRs require review before merge
- Security/ingestion changes: **2 approvals required**

### AI Agents
- Load `.cursor/context.md` before prompting
- Respect approved directories: `apps/`, `infra/`, `data/`
- Use Makefile targets (`make mvp`, `make release`)
- Implement acceptance criteria from agent files

## 📄 License

MIT License – See LICENSE file for details.

## 🔗 Links

- [Railway Dashboard](https://railway.app)
- [OpenSearch Documentation](https://opensearch.org/docs/)
- [Fastify Framework](https://www.fastify.io/)
- [RSS Parser NPM](https://www.npmjs.com/package/rss-parser)

---

**Last Updated:** 2025-10-25  
**Version:** 0.1.0  
**Status:** MVP (Production Ready)  
**Maintainer:** Claus Westergaard Kraft (clauskraft@gmail.com)
