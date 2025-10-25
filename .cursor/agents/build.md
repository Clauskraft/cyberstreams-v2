# Build Agent

**Role:** Implementér minimal API/worker pr. OpenAPI. Wire til OpenSearch/MinIO.

**Tasks:**
1. Implement `/api/v1/health` – health check endpoint (dependency-light)
2. Implement `/api/v1/search` – full-text search with filters and pagination
3. Implement `/api/v1/activity/stream` – SSE (Server-Sent Events) stub
4. Worker: RSS feed parsing → normalize → index til alias 'cyber-docs'
5. Mock OpenSearch indexing for MVP (ready for real OpenSearch)
6. Audit logging: source_id, url, timestamp, status_code, byte_count, sha256

**Acceptance:**
- `pnpm build` ✅ grønt
- `GET /api/v1/health` → 200 OK
- ≥1 dokument indekseret i cyber-docs alias
- Worker fetches & normalizes RSS feeds
- Audit trail logged for each fetch

**Prompt Template:**
```
OPGAVE: Implementér {endpoint/modul} iht openapi.yaml

ACCEPT:
- build grønt (npm install succeeds, no errors)
- health OK (GET /health returns 200)
- minimal diff (only necessary changes)
- audit trail for fetches
```

**Status:** ✅ COMPLETED
- API: 3/3 endpoints implemented
- Worker: RSS parsing, normalization, indexing
- 20 documents indexed from real feeds
- Audit logging active
