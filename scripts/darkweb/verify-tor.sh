#!/usr/bin/env bash
set -euo pipefail

SOCKS_HOST="${TOR_SOCKS_HOST:-127.0.0.1}"
SOCKS_PORT="${TOR_SOCKS_PORT:-9050}"
SOCKS_URL="socks5h://${SOCKS_HOST}:${SOCKS_PORT}"

echo "[tor] checking Tor via ${SOCKS_URL}"
if ! command -v curl >/dev/null 2>&1; then
  echo "[tor] curl not found" >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "[tor] jq not found (required for leak-test)" >&2
  exit 1
fi
tor_ip_json=$(curl -s --socks5-hostname "${SOCKS_HOST}:${SOCKS_PORT}" https://check.torproject.org/api/ip || true)
if [[ -z "${tor_ip_json}" ]]; then
  echo "[tor] empty response from Tor check API" >&2
  exit 1
fi
if ! tor_ip=$(printf '%s' "${tor_ip_json}" | jq -r '.IP' 2>/dev/null); then
  echo "[tor] jq parse failed" >&2
  exit 1
fi
if [[ -z "${tor_ip}" || "${tor_ip}" == "null" ]]; then
  echo "[tor] unable to reach Tor check API" >&2
  exit 1
fi

echo "[tor] exit ip: ${tor_ip}"

