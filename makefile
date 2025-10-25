# ============================================
# Cyberstreams V2 – Self-contained MVP Builder
# ============================================

SHELL := /bin/bash
PROJECT := cyberstreams-v2
API_NAME := cyberstreams-api
WORKER_NAME := cyberstreams-worker
API_URL ?= https://<api-domain>

# ---- STEP 1: Ensure Railway login & link ----
.PHONY: login link
login:
	@echo "=== RAILWAY LOGIN ==="
	@railway whoami >/dev/null 2>&1 || railway login --browserless --force

link:
	@echo "=== LINK PROJECT ==="
	@railway link --project $(PROJECT) || true
	@railway status || true

# ---- STEP 2: Bootstrap minimal API + Worker ----
.PHONY: scaffold
scaffold:
	@echo "=== GENERATING MINIMAL API & WORKER ==="
	@mkdir -p apps/api apps/worker
	@echo '{"name":"$(API_NAME)","version":"0.1.0","type":"module","scripts":{"start":"node server.js"},"dependencies":{"fastify":"^4.27.2"}}' > apps/api/package.json
	@echo 'import Fastify from "fastify";const app=Fastify();app.get("/api/v1/health",()=>({status:"ok"}));const port=process.env.PORT||8080;app.listen({port,host:"0.0.0.0"});' > apps/api/server.js
	@echo '{"name":"$(WORKER_NAME)","version":"0.1.0","type":"module","scripts":{"start":"node worker.js"},"dependencies":{"rss-parser":"^3.13.0"}}' > apps/worker/package.json
	@echo 'import Parser from "rss-parser";const p=new Parser();console.log("Worker ready");' > apps/worker/worker.js

# ---- STEP 3: Create services if missing ----
.PHONY: services
services:
	@echo "=== CREATING SERVICES IF NEEDED ==="
	@if ! railway service | grep -q $(API_NAME); then railway up --service $(API_NAME) --path apps/api --detach || true; fi
	@if ! railway service | grep -q $(WORKER_NAME); then railway up --service $(WORKER_NAME) --path apps/worker --detach || true; fi
	@railway service

# ---- STEP 4: Run audits and bootstrap ----
.PHONY: audit bootstrap
audit:
	@echo "=== AUDIT ==="
	@npm run audit:sources || true
	@npm run audit:contract || true
	@npm run audit:score || true

bootstrap:
	@echo "=== OPENSEARCH BOOTSTRAP ==="
	@npm run opensearch:bootstrap || true
	@npm run opensearch:seed || true

# ---- STEP 5: Deploy both services ----
.PHONY: deploy
deploy:
	@echo "=== DEPLOY TO RAILWAY ==="
	@npm i -g @railway/cli >/dev/null
	@railway up --service $(API_NAME) --path apps/api --detach
	@railway up --service $(WORKER_NAME) --path apps/worker --detach

# ---- STEP 6: Verify health ----
.PHONY: verify
verify:
	@echo "=== VERIFY HEALTH ==="
	@bash scripts/release/verify-health.sh "$(API_URL)" || (echo "Health check failed" && exit 1)

# ---- STEP 7: Full one-command MVP ----
.PHONY: mvp
mvp: login link scaffold services audit bootstrap deploy verify
	@echo "=== ✅ CYBERSTREAMS MVP DEPLOYED ==="
