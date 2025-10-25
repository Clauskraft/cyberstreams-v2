#!/usr/bin/env bash
set -euo pipefail
part="${1:-patch}"
current=$(jq -r '.version' package.json 2>/dev/null || true)
if [[ -z "$current" || "$current" == "null" ]]; then
  if [[ -f .version ]]; then current=$(cat .version); else current="0.1.0"; fi
fi
IFS='.' read -r MA MI PA <<< "$current"
case "$part" in
  major) MA=$((MA+1)); MI=0; PA=0;;
  minor) MI=$((MI+1)); PA=0;;
  patch) PA=$((PA+1));;
  *) echo "unknown part $part"; exit 2;;
esac
next="$MA.$MI.$PA"
echo "$next" > .version
if [[ -f package.json ]]; then
  tmp=$(mktemp); jq --arg v "$next" '.version=$v' package.json > "$tmp" && mv "$tmp" package.json
fi
echo "Next version: $next"
