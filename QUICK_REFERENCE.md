# Cyberstreams V2 – Quick Reference

## Common Commands

### Installation & Setup
```bash
# Install all dependencies
npm run install:all

# Start API service (port 8080)
npm run start:api

# Start worker service
npm run start:worker

# Both at once
npm run start:api & npm run start:worker
```

### API Health Check
```bash
# Local development
curl http://localhost:8080/api/v1/health

# Production
curl https://your-api-domain/api/v1/health
```

### Search Examples
```bash
# Simple search
curl "http://localhost:8080/api/v1/search?q=CVE-2025"

# Search with filters
curl "http://localhost:8080/api/v1/search?q=rce&risk=critical&limit=10"

# Date range search
curl "http://localhost:8080/api/v1/search?q=vulnerability&from=2025-01-01&to=2025-12-31"

# Paginated results
curl "http://localhost:8080/api/v1/search?q=test&limit=20&offset=0"
```

### Audit & Quality

```bash
# Validate source feeds
npm run audit:sources

# Check OpenAPI contract coverage
npm run audit:contract

# Full scorecard (requires OpenSearch credentials)
export OPENSEARCH_URL=https://your-opensearch
export OPENSEARCH_USERNAME=admin
export OPENSEARCH_PASSWORD=password
npm run audit:score
```

### Deployment

```bash
# Verify Railway connection
railway whoami

# Deploy entire MVP
make mvp

# Deploy individual services
cd apps/api && railway up --detach
cd apps/worker && railway up --detach

# Verify health after deployment
scripts/release/verify-health.sh "https://your-api-domain"
```

### Version & Release

```bash
# Show current version
cat .version

# Bump version (patch/minor/major)
scripts/release/version-bump.sh patch

# Generate changelog
scripts/release/changelog.sh

# Create release tag
git tag v$(cat .version)
git push && git push --tags
```

---

## Environment Variables

### Development
```bash
PORT=8080
API_BASE=http://localhost:8080/api/v1
NODE_ENV=development
```

### Production
```bash
RAILWAY_TOKEN=<railway-api-token>
RAILWAY_API_SERVICE=cyberstreams-api
RAILWAY_WORKER_SERVICE=cyberstreams-worker

OPENSEARCH_URL=https://opensearch.railway.app
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=<secure-password>

MINIO_ENDPOINT=minio.railway.app
MINIO_REGION=us-east-1
MINIO_ACCESS_KEY=<access-key>
MINIO_SECRET_KEY=<secret-key>
```

---

## File Structure Quick Navigation

```
├── README.md                    # Start here
├── FUNCTION_LIST.md            # API endpoint docs
├── QUICK_REFERENCE.md          # This file
├── CHANGELOG.md                # Version history
│
├── .cursorules                 # Cursor AI rules (auto-loaded)
├── cursor.project.rules.v3.json # Rule definitions
├── makefile                    # Build orchestration
│
├── package.json                # Root workspace
├── .version                    # Semantic version
│
├── apps/
│   ├── api/                    # Fastify API server
│   │   ├── server.js
│   │   └── package.json
│   └── worker/                 # RSS parser worker
│       ├── worker.js
│       └── package.json
│
├── packages/
│   └── contracts/
│       └── openapi.yaml        # API specification
│
├── data/
│   └── Cyberfeeds/             # Feed source declarations
│       └── rss-feeds.yaml
│
├── scripts/
│   ├── audit/                  # Quality gates
│   │   ├── scorecard.sh
│   │   ├── contract-coverage.mjs
│   │   └── sources-lint.mjs
│   └── release/                # Release automation
│       ├── version-bump.sh
│       ├── changelog.sh
│       └── verify-health.sh
│
├── .cursor/
│   ├── context.md              # Agent shared context
│   ├── agents/                 # AI agent templates
│   │   ├── build.md
│   │   ├── test.md
│   │   ├── design.md
│   │   └── ci-release.md
│   └── macros/                 # Reusable workflows
│       ├── audit.md
│       ├── deploy.md
│       └── release-to-railway.md
│
├── docs/
│   ├── ADD_TO_PACKAGE_JSON.json
│   ├── DEPLOY_PLAYBOOK.md
│   └── MANUAL_PROMPT.txt
│
└── .github/
    └── workflows/
        └── release.yml         # CI/CD pipeline
```

---

## Workflow: Add New Feature

1. **Create feature branch:**
   ```bash
   git checkout -b feature/new-endpoint
   ```

2. **Update OpenAPI contract:**
   ```yaml
   # packages/contracts/openapi.yaml
   /api/v1/new-endpoint:
     get:
       summary: "Your endpoint"
       responses:
         '200': { ... }
   ```

3. **Implement feature:**
   ```bash
   # Edit apps/api/server.js
   # Add route: app.get("/api/v1/new-endpoint", ...)
   ```

4. **Test locally:**
   ```bash
   npm run start:api
   curl http://localhost:8080/api/v1/new-endpoint
   ```

5. **Audit compliance:**
   ```bash
   npm run audit:contract    # Verify contract match
   npm run audit:score       # Full quality check
   ```

6. **Commit and push:**
   ```bash
   git add -A
   git commit -m "feat: add new-endpoint"
   git push origin feature/new-endpoint
   ```

7. **Create PR** → Review → Merge

---

## Workflow: Deploy to Production

1. **Verify tests pass:**
   ```bash
   npm test
   ```

2. **Bump version:**
   ```bash
   scripts/release/version-bump.sh patch
   scripts/release/changelog.sh
   ```

3. **Commit and tag:**
   ```bash
   git add -A
   git commit -m "chore(release): v$(cat .version)"
   git tag v$(cat .version)
   git push && git push --tags
   ```

4. **Deployment (automatic via GitHub Actions):**
   - CI/CD runs `.github/workflows/release.yml`
   - Tests execute
   - Services deploy to Railway
   - Health check verifies

5. **Verify production:**
   ```bash
   scripts/release/verify-health.sh "https://api.cyberstreams.dev"
   ```

---

## Troubleshooting

### API won't start
```bash
# Check port is available
lsof -i :8080

# Check Node version
node --version  # Should be 20+

# Check dependencies
npm install
npm run start:api
```

### Worker not indexing
```bash
# Check OpenSearch connection
export OPENSEARCH_URL=...
curl -u admin:password $OPENSEARCH_URL/_cluster/health

# Check feed sources enabled
npm run audit:sources

# Review worker logs
npm run start:worker
```

### Audit failures
```bash
# Check required files exist
ls FUNCTION_LIST.md QUICK_REFERENCE.md README.md

# Validate OpenAPI
npm run audit:contract

# Full diagnostic
npm run audit:score
```

### Railway deployment issues
```bash
# Check Railway status
railway status

# View build logs
railway logs

# Redeploy service
cd apps/api && railway up --detach
```

---

## Dashboard URLs

- **Railway Dashboard:** https://railway.app
- **OpenSearch UI:** https://opensearch.railway.app/app/home
- **API Health:** https://your-api-domain/api/v1/health
- **API Docs (Swagger):** https://your-api-domain/docs (planned)

---

## Support & Resources

- **GitHub Issues:** Report bugs and request features
- **Documentation:** See `docs/` directory
- **Agent Context:** `.cursor/context.md`
- **Architecture:** `README.md` Architecture section
- **API Spec:** `packages/contracts/openapi.yaml`

---

**Last Updated:** 2025-10-25  
**For detailed info, see:** README.md, FUNCTION_LIST.md, and docs/
