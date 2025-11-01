# Dark Web Hardening & Ops Manual
Generated: 2025-10-25T23:48:22.583239Z

## Mål
- Ingen direkte egress; al trafik gennem Tor (socks5h).
- Stram torrc med SafeSocks/TestSocks og kun lokal SOCKS.
- Best-effort egress-killswitch i container.
- Automatisk leak-test før ingestion.
- Rå HTML i MinIO/quarantine; kun saniteret tekst i index.

## Indhold
- apps/darkweb-connector/
  - Dockerfile (tor + jq + iptables)
  - bin/entrypoint.sh (torrc, killswitch, leak-test, start)
  - bin/leak-test.sh (Tor IP vs direkte egress)
  - src/index.js (socks5h, sanitization, MinIO, index)
- scripts/darkweb/toggle-sources.mjs, validate-sources.mjs
- .env.example
- Makefile.addon (targets: darkweb.validate/enable/deploy/verify/secure)

## Krav
- Railway projekt linket.
- Secrets sat: OPENSEARCH_*, MINIO_*, evt. TOR_BRIDGES.
- Kilder i data/Cyberfeeds/darkweb.yaml (enabled:true for godkendte).

## Brug
1) Udpak i repoet.
2) Kopiér Makefile.addon ind i din Makefile.
3) Kopiér .env.example → miljøvariabler i Railway.
4) Valider kilder:
   ```bash
   node scripts/darkweb/validate-sources.mjs
   ```
5) Aktivér kilder:
   ```bash
   make darkweb.enable IDS=id1,id2
   ```
6) Deploy & verificér:
   ```bash
   make darkweb.secure
   ```

## Gateway‑mode (anbefalet hvis iptables ikke er tilladt)
- Kør Tor på en separat ”gateway” (VM/container) med offentlig egress.
- Sæt TOR_SOCKS_HOST=<gateway ip>, TOR_SOCKS_PORT=9050.
- Begræns connector‑containerens egress til kun gateway:9050 i netpolicy/SecGrp.
- Fordel: selv ved kodefejl kan app ikke gå ud udenom Tor.

## Drift
- Rate‑limits og jitter i connector (CONCURRENCY, TIMEOUT_MS).
- Rotér nøgler og buckets efter politik.
- Overvåg logs: `railway logs --service cyberstreams-darkweb`.
- Ved leak‑test fejl: stop ingestion, tjek tor/gateway, redeploy.

## Noter
- På nogle PaaS er iptables blokeret. Pakken håndterer dette ved at advare og fortsætte. Brug gateway‑mode for 100% isolation.
- Kald til check.torproject.org bruges kun til leak‑test.
