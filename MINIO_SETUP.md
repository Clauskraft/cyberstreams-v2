# MinIO Setup på Railway

## Option 1: Railway Dashboard (Nemmest) ✅

### Via Railway Dashboard:

1. **Åbn Railway Dashboard**:
   ```bash
   railway open
   ```
   Eller gå til: https://railway.app

2. **Tilføj MinIO Template**:
   - Klik på dit projekt (mellow-reverence)
   - Klik "New" → "Template"
   - Søg efter "MinIO"
   - Klik "Deploy" på MinIO template

3. **Få Credentials**:
   Efter deployment, gå til MinIO servicen:
   - Klik på "Variables" tab
   - Find disse værdier:
     ```
     MINIO_ROOT_USER=<kopiér denne>
     MINIO_ROOT_PASSWORD=<kopiér denne>
     MINIO_ENDPOINT=<service-navn>.railway.app
     MINIO_PORT=9000
     ```

4. **Opdatér .env**:
   ```env
   MINIO_ENDPOINT=<service-navn>.railway.app:443
   MINIO_REGION=us-east-1
   MINIO_ACCESS_KEY=<MINIO_ROOT_USER>
   MINIO_SECRET_KEY=<MINIO_ROOT_PASSWORD>
   MINIO_BUCKET=ai-agent-platform
   MINIO_USE_SSL=true
   ```

5. **Opret Bucket**:
   - Åbn MinIO Console: `https://<service-navn>.railway.app`
   - Login med ROOT_USER/ROOT_PASSWORD
   - Gå til "Buckets"
   - Klik "Create Bucket"
   - Navn: `ai-agent-platform`

## Option 2: Railway CLI med Docker Image

Hvis template ikke virker, tilføj via CLI:

```bash
# Opret MinIO service med Docker image
railway service
# Vælg "Create new service"
# Vælg "Docker"

# Sæt environment variables
railway variables set MINIO_ROOT_USER=admin
railway variables set MINIO_ROOT_PASSWORD=$(openssl rand -base64 32)
railway variables set MINIO_DEFAULT_BUCKETS=ai-agent-platform
```

## Option 3: Lokal MinIO (Udvikling)

Hvis du vil teste lokalt først:

```bash
# Start MinIO container
docker run -d -p 9000:9000 -p 9001:9001 \
  --name minio \
  -e "MINIO_ROOT_USER=admin" \
  -e "MINIO_ROOT_PASSWORD=AdminPassword123!" \
  -v minio-data:/data \
  minio/minio server /data --console-address ":9001"

# Åbn MinIO Console
start http://localhost:9001

# Login: admin / AdminPassword123!
```

Opdatér .env:
```env
MINIO_ENDPOINT=localhost:9000
MINIO_REGION=us-east-1
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=AdminPassword123!
MINIO_BUCKET=ai-agent-platform
MINIO_USE_SSL=false
```

## Option 4: AWS S3 (Production Alternative)

Hvis MinIO ikke virker, brug AWS S3:

1. **Opret S3 Bucket**:
   - Gå til AWS Console → S3
   - Klik "Create bucket"
   - Navn: `ai-agent-platform-prod`
   - Region: `us-east-1`
   - Bloker public access: JA

2. **Opret IAM User**:
   - Gå til IAM → Users → Create user
   - Navn: `ai-agent-platform-s3`
   - Permissions: `AmazonS3FullAccess`
   - Opret Access Key

3. **Opdatér .env**:
   ```env
   MINIO_ENDPOINT=s3.amazonaws.com
   MINIO_REGION=us-east-1
   MINIO_ACCESS_KEY=<AWS_ACCESS_KEY_ID>
   MINIO_SECRET_KEY=<AWS_SECRET_ACCESS_KEY>
   MINIO_BUCKET=ai-agent-platform-prod
   MINIO_USE_SSL=true
   ```

## 🧪 Test MinIO Connection

Når du har credentials, test forbindelsen:

```bash
# Install MinIO client
npm install -g minio

# Test connection (Node.js)
node -e "
const Minio = require('minio');
require('dotenv').config();

const client = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT.split(':')[0],
  port: parseInt(process.env.MINIO_ENDPOINT.split(':')[1] || '443'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY
});

client.listBuckets((err, buckets) => {
  if (err) console.error('❌ Error:', err);
  else console.log('✅ Connected! Buckets:', buckets);
});
"
```

## 📝 Næste Skridt

Efter MinIO er sat op:

1. ✅ Kopier credentials til `.env`
2. ✅ Få Alpha Vantage API key (https://www.alphavantage.co/support/#api-key)
3. ✅ Installér dependencies: `npm install`
4. ✅ Deploy til Railway: `railway up`

## 🆘 Troubleshooting

**Problem: "Connection refused"**
- Check MINIO_ENDPOINT format: `domain.com:port` (no http://)
- Verify port er åben

**Problem: "Invalid credentials"**
- Dobbelttjek ACCESS_KEY og SECRET_KEY
- Regenerér keys hvis nødvendigt

**Problem: "Bucket doesn't exist"**
- Opret bucket manuelt via MinIO Console
- Eller sæt `MINIO_DEFAULT_BUCKETS=ai-agent-platform`
