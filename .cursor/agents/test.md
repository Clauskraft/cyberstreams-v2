# Test Agent

**Role:** Kontrakt-, integration-, smoke-tests.

**Tasks:**
1. **Contract Tests** – Validate all endpoints match OpenAPI schema
   - GET /api/v1/health returns correct schema
   - GET /api/v1/search returns Document[] with aggregations
   - GET /api/v1/activity/stream streams SSE events

2. **Integration Tests** – Test end-to-end workflows
   - Worker fetches, parses, and indexes documents
   - Search returns results from indexed documents
   - Filters (source, risk, date) work correctly

3. **Smoke Tests** – Verify critical paths
   - Health endpoint returns 200 OK
   - API starts without errors
   - Worker indexes ≥1 document

**Acceptance:**
- `npm test` ✅ passerer (all tests green)
- Contract gate: 100% endpoint coverage
- Smoke gate: health + search endpoints responding
- ≥90% coverage on new code

**Test Coverage Gates:**
```bash
npm run test:contract  # OpenAPI compliance
npm run test:smoke     # Critical paths
npm run test:coverage  # 90%+ on new code
```

**Prompt Template:**
```
OPGAVE: Tests for {endpoint/flow}

Requirements:
- Dæk fejlstier (400, 500, timeouts)
- Dæk rate limits
- Test pagination

ACCEPT:
- 90% coverage for new code
- grøn CI
- contract tests pass
```

**Status:** ⏳ PENDING (Ready for implementation)
- Contract tests: Not yet implemented
- Integration tests: Not yet implemented  
- Smoke tests: Not yet implemented
