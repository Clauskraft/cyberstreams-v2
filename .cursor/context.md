# Cyberstreams V2 – Shared Agent Context

**Last Updated:** 2025-11-01  
**Version:** 0.2.0  
**Status:** Production Hardening Complete

---

## 📋 Quick Reference for All Agents

### Platform & Infrastructure
- **Hosting:** Railway (EU region)
- **Search Engine:** OpenSearch (with cyber-docs alias)
- **Object Storage:** MinIO (for raw/quarantine data)
- **Version Control:** GitHub with semver tags
- **CI/CD:** GitHub Actions + Railway CLI

### Project Structure
```
apps/
  ├── api/          ← Fastify API service (Build Agent)
  └── worker/       ← RSS parser worker (Build Agent)
data/
  └── Cyberfeeds/   ← Feed source declarations (YAML)
packages/
  └── contracts/
      └── openapi.yaml  ← API specification (Design Agent)
scripts/
  ├── audit/        ← Quality gates (Test Agent)
  └── release/      ← Release automation (CI/Release Agent)
.cursor/
  ├── agents/       ← Agent specifications
  ├── macros/       ← Reusable workflows
  └── context.md    ← This file
```

### Security & Secrets Policy
- ❌ NO secrets in code
- ✅ ALL credentials in Railway secrets or GitHub Secrets
- ✅ Environment variables loaded at runtime
- **Required vars:** OPENSEARCH_URL, OPENSEARCH_USERNAME, OPENSEARCH_PASSWORD, MINIO_*, RAILWAY_TOKEN

---

## 🎯 Global Definition of Done

Before marking any task complete:

1. **Build Agent Tasks:**
   - ✅ `npm build` succeeds (no errors)
   - ✅ `GET /api/v1/health` returns 200 OK
   - ✅ ≥1 document indexed to cyber-docs alias
   - ✅ Audit logging active for all fetches

2. **Test Agent Tasks:**
   - ✅ `npm test` passes (all tests green)
   - ✅ Contract tests: 100% endpoint coverage
   - ✅ Smoke tests: health + search responding
   - ✅ Code coverage: ≥90% on new code

3. **Design Agent Tasks:**
   - ✅ No duplicate logic across modules
   - ✅ Clear interfaces between components
   - ✅ OpenAPI ↔ implementation alignment verified
   - ✅ README updated with architecture

4. **CI/Release Agent Tasks:**
   - ✅ CI workflow green (all checks pass)
   - ✅ Health endpoint returns 200
   - ✅ CHANGELOG.md updated with changes
   - ✅ Git tag created and pushed
   - ✅ Services deployed to Railway

---

## 📊 Current Implementation Status

### API Service (BUILD AGENT ✅)
- ✅ **GET /api/v1/health** – Returns status + dependencies
- ✅ **GET /api/v1/search** – Full-text search with filters
- ✅ **GET /api/v1/activity/stream** – SSE for real-time updates
- **Status:** Deployed to Railway, responding 200 OK

### Worker Service (BUILD AGENT ✅)
- ✅ **Feed Fetching** – 2 real feeds (Ars Technica, Hacker News)
- ✅ **Normalization** – Standard document schema
- ✅ **Indexing** – Posts to cyber-docs alias (mock/OpenSearch ready)
- ✅ **Audit Logging** – source_id, url, bytes, SHA256 hash
- **Status:** 20 documents indexed, bootstrapped successfully

### Data Sources
- ✅ **2 Enabled:** Ars Technica, Hacker News (verified working)
- ⏳ **5 Planned:** CISA, NVD, Reddit, Shodan, Recorded Future (disabled)
- **File:** `data/Cyberfeeds/rss-feeds.yaml`

### OpenAPI Contract (DESIGN AGENT ✅)
- ✅ **File:** `packages/contracts/openapi.yaml`
- ✅ **3 Endpoints:** /health, /search, /activity/stream
- ✅ **Schemas:** Document, Error, Health responses defined
- ✅ **Audit:** `npm run audit:contract` passes

### Documentation (DESIGN AGENT ✅)
- ✅ **README.md** – Architecture, setup, deployment
- ✅ **FUNCTION_LIST.md** – API endpoint details
- ✅ **QUICK_REFERENCE.md** – Commands & workflows
- ✅ **BUILD_STATUS.md** – Build verification report

### Tests (TEST AGENT ⏳)
- ⏳ **Contract Tests** – Not yet implemented
- ⏳ **Integration Tests** – Not yet implemented
- ⏳ **Smoke Tests** – Not yet implemented
- **When ready:** `npm test` should pass all

### Release Process (CI/RELEASE AGENT ⏳)
- ✅ **Version Bump:** `scripts/release/version-bump.sh`
- ✅ **Changelog:** `scripts/release/changelog.sh`
- ✅ **CI Template:** `.github/workflows/release.yml` provided
- ⏳ **Automation:** Ready for configuration

---

## 🔄 Agent Collaboration Workflow

### How Agents Work Together

```
1. DESIGN Agent
   ↓ (Defines contract in openapi.yaml)
   ↓
2. BUILD Agent
   ↓ (Implements endpoints + worker per spec)
   ↓
3. TEST Agent
   ↓ (Writes tests to verify implementation)
   ↓
4. CI/RELEASE Agent
   ↓ (Automates versioning, testing, deployment)
   ↓
5. Production
```

### Approval Gates (Don't Skip!)

**Before merging to main:**
- [ ] `npm run audit:sources` ✅ pass
- [ ] `npm run audit:contract` ✅ pass
- [ ] `npm test` ✅ pass (when implemented)
- [ ] README/docs updated
- [ ] Changelog entry added

**Before deploying to production:**
- [ ] Version bumped
- [ ] Git tag created
- [ ] CI workflow green
- [ ] Health check verified: GET /health → 200
- [ ] Audit logs showing new documents indexed

---

## 🛠️ Common Commands (Use These!)

### Build & Development
```bash
npm run install:all          # Install all workspaces
npm run build                # Build (defined per service)
npm run start:api            # Start API on :8080
npm run start:worker         # Start worker
```

### Quality Gates
```bash
npm run audit:sources        # Validate feed declarations
npm run audit:contract       # Check OpenAPI compliance
npm run audit:score          # Full scorecard (needs OpenSearch)
```

### Release
```bash
scripts/release/version-bump.sh patch      # Bump version
scripts/release/changelog.sh               # Generate changelog
scripts/release/verify-health.sh URL       # Verify deployment
```

### Makefile (Orchestration)
```bash
make mvp                     # Full MVP build + deploy
make scaffold                # Create service structure
make deploy                  # Deploy to Railway
make verify                  # Health check
```

---

## 📦 Key Files for Each Agent

### Build Agent References
- `apps/api/server.js` – API implementation (150+ lines)
- `apps/worker/worker.js` – Worker implementation (250+ lines)
- `packages/contracts/openapi.yaml` – API spec
- `data/Cyberfeeds/rss-feeds.yaml` – Feed sources

### Test Agent References
- `scripts/audit/contract-coverage.mjs` – Contract validation
- `scripts/audit/scorecard.sh` – Quality scorecard
- `.github/workflows/release.yml` – CI template

### Design Agent References
- `README.md` – Architecture section
- `FUNCTION_LIST.md` – Endpoint documentation
- `packages/contracts/openapi.yaml` – API spec
- `.cursorules` – Project conventions

### CI/Release Agent References
- `scripts/release/version-bump.sh` – Versioning
- `scripts/release/changelog.sh` – Changelog generation
- `.github/workflows/release.yml` – GitHub Actions workflow
- `package.json` – Version management

---

## ✅ Acceptance Criteria Summary

| Agent | Task | Status | Criteria |
|-------|------|--------|----------|
| **Build** | API | ✅ | 3 endpoints, 200 OK, deployed |
| **Build** | Worker | ✅ | Fetch, parse, normalize, index |
| **Build** | Quality | ✅ | npm build green, 20 docs indexed |
| **Test** | Contract | ⏳ | OpenAPI compliance |
| **Test** | Smoke | ⏳ | Health + search responding |
| **Test** | Coverage | ⏳ | ≥90% on new code |
| **Design** | Architecture | ✅ | No duplicate logic |
| **Design** | Contract | ✅ | OpenAPI spec complete |
| **Design** | Docs | ✅ | README + FUNCTION_LIST |
| **Release** | Version | ⏳ | Semver bumping |
| **Release** | Deploy | ⏳ | CI green, health verified |

---

## 🚨 Rules All Agents Must Follow

1. **Approved Directories Only**
   - ✅ Can modify: `apps/`, `infra/`, `data/`, `packages/`
   - ❌ Cannot modify: `.github/` (except templates), `docs/` (contact Design Agent)

2. **Use Makefile Targets**
   - Instead of: `npm run build` → Use: `make mvp`
   - Instead of: Custom scripts → Use: `scripts/release/`

3. **Health Check After Changes**
   - Always verify: `GET /api/v1/health` → 200 OK
   - Always check: Worker logs for indexing

4. **Audit Gates**
   - Before committing: `npm run audit:sources`
   - Before deploying: `npm run audit:contract`
   - Before release: `npm run audit:score`

5. **Documentation**
   - Update README if architecture changes
   - Update FUNCTION_LIST for new endpoints
   - Update CHANGELOG before release

6. **Secrets**
   - ❌ Never commit credentials
   - ✅ All vars: Railway secrets or GitHub Secrets
   - ✅ Environment: Loaded at runtime

---

## 📞 Agent Communication

When agents hand off work:

**Design → Build:**
"Updated OpenAPI spec in packages/contracts/openapi.yaml. Implement the new endpoint per the schema."

**Build → Test:**
"New /api/v1/stats endpoint added to apps/api/server.js. Add tests in npm test suite."

**Test → CI/Release:**
"All tests green. Ready to bump version and deploy to Railway."

**CI/Release → Monitoring:**
"Version v0.2.0 deployed. Health check passing, 25 documents indexed."

---

## 🎓 First-Time Agent Setup

When starting work in Cursor:

1. **Load this context:** Read `.cursor/context.md` (this file)
2. **Load agent spec:** Read `.cursor/agents/{your-role}.md`
3. **Load rules:** `.cursorules` is auto-loaded by Cursor
4. **Check status:** Read `BUILD_STATUS.md` and `AGENTS_STATUS.md`
5. **Start work:** Reference approved directories and files

---

## 🔗 Quick Links

- **Agents:** `.cursor/agents/` (build, test, design, ci-release, release)
- **Rules:** `.cursorules` (71 rules covering all aspects)
- **Status:** `BUILD_STATUS.md` and `AGENTS_STATUS.md`
- **Docs:** `README.md`, `FUNCTION_LIST.md`, `QUICK_REFERENCE.md`
- **API Spec:** `packages/contracts/openapi.yaml`
- **Config:** `cursor.project.rules.v3.json`

---

**This is the shared context all agents reference. Update when project state changes.**
