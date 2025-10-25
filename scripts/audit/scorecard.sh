#!/usr/bin/env bash
set -euo pipefail
: "${OPENSEARCH_URL:?missing}"; : "${OPENSEARCH_USERNAME:?missing}"; : "${OPENSEARCH_PASSWORD:?missing}"
API_BASE="${API_BASE:-http://localhost:8080/api/v1}"
pass=0; fail=0
ok(){ echo "OK  - $1"; pass=$((pass+1)); }
ko(){ echo "ERR - $1"; fail=$((fail+1)); }
test -f FUNCTION_LIST.md && ok "FUNCTION_LIST.md fundet" || ko "FUNCTION_LIST.md mangler"
test -f QUICK_REFERENCE.md && ok "QUICK_REFERENCE.md fundet" || ko "QUICK_REFERENCE.md mangler"
test -f README.md && ok "README.md fundet" || ko "README.md mangler"
test -f packages/contracts/openapi.yaml && ok "OpenAPI fundet" || ko "OpenAPI mangler"
api_cnt=$(awk '/^[[:space:]]{2}\/[A-Za-z0-9_\-{}\/]*:$/ {print}' packages/contracts/openapi.yaml | wc -l | tr -d ' ')
[[ "${api_cnt}" -gt 0 ]] && ok "OpenAPI endpoints (${api_cnt})" || ko "OpenAPI tom?"
if ls data/Cyberfeeds/*.yaml >/dev/null 2>&1; then
  for f in data/Cyberfeeds/*.yaml; do yq e '.[0]' "$f" >/dev/null 2>&1 && ok "YAML valid: $(basename "$f")" || ko "YAML fejl: $(basename "$f")"; done
else ko "data/Cyberfeeds/*.yaml mangler"; fi
hdr=(-u "$OPENSEARCH_USERNAME:$OPENSEARCH_PASSWORD" -H "content-type: application/json")
curl -fsS "${hdr[@]}" "$OPENSEARCH_URL/_alias/cyber-docs" >/dev/null && ok "Alias 'cyber-docs' findes" || ko "Alias 'cyber-docs' mangler"
curl -fsS "${hdr[@]}" "$OPENSEARCH_URL/_index_template/cyber-docs-template" >/dev/null && ok "Index template findes" || ko "Index template mangler"
docs=$(curl -fsS "${hdr[@]}" -XPOST "$OPENSEARCH_URL/cyber-docs/_count" -d '{}' | jq -r '.count // 0' || echo 0)
[[ "$docs" =~ ^[0-9]+$ && "$docs" -ge 1 ]] && ok "Dokumenter i index ($docs)" || ko "Ingen dokumenter i 'cyber-docs'"
if curl -fsS "$API_BASE/health" | jq -e '.status=="ok"' >/dev/null 2>&1; then
  ok "API health OK"
  curl -fsS "$API_BASE/search?q=test" | jq -e '.total>=0' >/dev/null 2>&1 && ok "Search svarer" || ko "Search fejler"
else ko "API health svarer ikke ($API_BASE/health)"; fi
ls .github/workflows/*.yml >/dev/null 2>&1 && ok "CI workflow fundet" || ko "CI workflow mangler"
grep -qi "\[unreleased\]\|\d\+\.\d\+\.\d\+" CHANGELOG.md && ok "CHANGELOG OK" || ko "CHANGELOG mangler"
grep -qi "badge" README.md && ok "README badge OK" || ko "README badge mangler"
echo ""; echo "PASS: $pass  FAIL: $fail"; [[ "$fail" -eq 0 ]] && exit 0 || exit 1
