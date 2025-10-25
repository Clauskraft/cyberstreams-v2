Trin:
1) Kræv: RAILWAY_TOKEN, RAILWAY_API_SERVICE, RAILWAY_WORKER_SERVICE secrets.
2) npm i -g @railway/cli
3) railway up --service $RAILWAY_API_SERVICE --detach
4) railway up --service $RAILWAY_WORKER_SERVICE --detach
5) scripts/release/verify-health.sh "$API_URL"
Accept: /api/v1/health=200, logs uden errors.
