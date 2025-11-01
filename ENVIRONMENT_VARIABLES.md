# Environment Variables Reference

All environment variables for the Cyberstreams V2 system.

## API Server (`apps/api/`)

### Required
- `PORT` - Server port (default: 8080)
- `JWT_SECRET` - Secret key for JWT tokens

### OpenSearch
- `OPENSEARCH_ENABLED` - Enable OpenSearch integration (default: false)
- `OPENSEARCH_URL` - OpenSearch cluster URL (default: http://localhost:9200)
- `OPENSEARCH_USER` - OpenSearch username (default: admin)
- `OPENSEARCH_PASS` - OpenSearch password (default: admin)
- `OPENSEARCH_INDEX` - Index name (default: cyber-docs)

### DeepSeek AI
- `DEEPSEEK_API_KEY` - Ysk-bd63aa97602149608d4bd7d1b07f64b8 `/api/v1/deepseek`)
- `DEEPSEEK_API_URL` - DeepSeek API base URL (default: https://api.deepseek.com/v1)
- `DEEPSEEK_MODEL` - Model to use (default: deepseek-chat)

### MinIO Object Storage
- `MINIO_ENABLED` - Enable MinIO integration (default: false)
- `MINIO_ENDPOINT` - MinIO server endpoint (default: localhost:9000)
- `MINIO_ACCESS_KEY` - MinIO access key
- `MINIO_SECRET_KEY` - MinIO secret key
- `MINIO_BUCKET` - Bucket name (default: cyberstreams)

### Railway Deployment
- `RAILWAY_TOKEN` - Railway authentication token
- `RAILWAY_PROJECT_ID` - Railway project ID
- `RAILWAY_SERVICE_API_ID` - API service ID on Railway
- `RAILWAY_SERVICE_WORKER_ID` - Worker service ID on Railway

### Worker (`apps/worker/`)
- `WORKER_MODE` - Worker mode: "continuous" or "single" (default: continuous)
- `REQUEST_TIMEOUT_MS` - Request timeout in ms (default: 10000)
- `FETCH_INTERVAL_MS` - Fetch interval in ms (default: 3600000)

## Frontend (`apps/web/`)
- `VITE_API_BASE` - API base URL (default: http://127.0.0.1:8081/api/v1)
- `VITE_API_KEY` - API key for frontend (optional, set in localStorage)
- `VITE_DEEPSEEK_API_KEY` - DeepSeek API key for frontend (not recommended for production)

## Example `.env`

```bash
# Server Configuration
PORT=8080
JWT_SECRET=your-secret-key-here

# OpenSearch
OPENSEARCH_ENABLED=true
OPENSEARCH_URL=http://localhost:9200
OPENSEARCH_USER=admin
OPENSEARCH_PASS=admin

# DeepSeek
DEEPSEEK_API_KEY=sk-468f141cbdc142e7ac157598afd8d7f8
DEEPSEEK_MODEL=deepseek-chat

# MinIO
MINIO_ENABLED=false
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=

# Railway
RAILWAY_TOKEN=
RAILWAY_PROJECT_ID=
RAILWAY_SERVICE_API_ID=
RAILWAY_SERVICE_WORKER_ID=
```

## Security Notes
- Never commit `.env` files to version control
- Rotate API keys regularly
- Use strong `JWT_SECRET` in production
- Keep credentials in Railway environment variables for deployment


