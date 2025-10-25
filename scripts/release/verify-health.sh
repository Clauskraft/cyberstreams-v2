#!/usr/bin/env bash
set -euo pipefail
url="${1:-}"
if [[ -z "$url" ]]; then echo "usage: verify-health.sh <API_URL>"; exit 2; fi
for i in {1..20}; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url/api/v1/health" || true)
  if [[ "$code" == "200" ]]; then echo "health OK"; exit 0; fi
  sleep 5
done
echo "health check failed"; exit 1
