# Credentials Setup Guide

## 📋 Required Credentials

### 1. MinIO / S3 Storage Configuration

#### Option A: Using MinIO (Self-hosted)

1. **Install MinIO**:
   ```bash
   # Using Docker
   docker run -p 9000:9000 -p 9001:9001 \
     -e "MINIO_ROOT_USER=admin" \
     -e "MINIO_ROOT_PASSWORD=your-password" \
     minio/minio server /data --console-address ":9001"
   ```

2. **Access MinIO Console**:
   - URL: `http://localhost:9001`
   - Login with: `admin` / `your-password`

3. **Create Access Keys**:
   - Navigate to: Identity → Service Accounts
   - Click "Create Service Account"
   - Copy the Access Key and Secret Key

4. **Create Bucket**:
   - Navigate to: Buckets → Create Bucket
   - Name: `ai-agent-platform`

5. **Update .env**:
   ```env
   MINIO_ENDPOINT=localhost:9000
   MINIO_REGION=us-east-1
   MINIO_ACCESS_KEY=<your-access-key>
   MINIO_SECRET_KEY=<your-secret-key>
   MINIO_BUCKET=ai-agent-platform
   MINIO_USE_SSL=false  # true for production
   ```

#### Option B: Using Railway MinIO Plugin

1. **Add MinIO to Railway**:
   ```bash
   railway add --database minio
   ```

   Or via Railway Dashboard:
   - Go to your project
   - Click "New" → "Database" → "MinIO"

2. **Get Credentials**:
   - Railway will automatically create these variables:
     - `MINIO_HOST`
     - `MINIO_PORT`
     - `MINIO_ROOT_USER`
     - `MINIO_ROOT_PASSWORD`

3. **Set Environment Variables**:
   ```bash
   # For API service
   railway service api
   railway variables set MINIO_ENDPOINT=$MINIO_HOST:$MINIO_PORT
   railway variables set MINIO_ACCESS_KEY=$MINIO_ROOT_USER
   railway variables set MINIO_SECRET_KEY=$MINIO_ROOT_PASSWORD
   railway variables set MINIO_REGION=us-east-1
   railway variables set MINIO_BUCKET=ai-agent-platform

   # Repeat for worker service
   railway service worker
   railway variables set MINIO_ENDPOINT=$MINIO_HOST:$MINIO_PORT
   railway variables set MINIO_ACCESS_KEY=$MINIO_ROOT_USER
   railway variables set MINIO_SECRET_KEY=$MINIO_ROOT_PASSWORD
   railway variables set MINIO_REGION=us-east-1
   railway variables set MINIO_BUCKET=ai-agent-platform
   ```

#### Option C: Using AWS S3

1. **Create IAM User**:
   - Go to AWS Console → IAM
   - Create new user with programmatic access
   - Attach policy: `AmazonS3FullAccess`

2. **Create S3 Bucket**:
   - Go to S3 Console
   - Create bucket: `ai-agent-platform`
   - Note the region (e.g., `us-east-1`)

3. **Update .env**:
   ```env
   MINIO_ENDPOINT=s3.amazonaws.com
   MINIO_REGION=us-east-1
   MINIO_ACCESS_KEY=<your-aws-access-key-id>
   MINIO_SECRET_KEY=<your-aws-secret-access-key>
   MINIO_BUCKET=ai-agent-platform
   MINIO_USE_SSL=true
   ```

### 2. Alpha Vantage API Key

Alpha Vantage provides stock market data and financial APIs.

1. **Get Free API Key**:
   - Visit: https://www.alphavantage.co/support/#api-key
   - Fill out the form
   - Verify your email
   - Copy your API key

2. **Update .env**:
   ```env
   ALPHA_VANTAGE_API_KEY=<your-api-key>
   ```

3. **Rate Limits**:
   - Free tier: 5 API calls per minute, 500 per day
   - Premium tier: More calls available

### 3. Railway Deployment

#### Set Variables in Railway

For **API Service**:
```bash
railway service api

# MinIO
railway variables set MINIO_ENDPOINT=your-endpoint
railway variables set MINIO_REGION=us-east-1
railway variables set MINIO_ACCESS_KEY=your-key
railway variables set MINIO_SECRET_KEY=your-secret
railway variables set MINIO_BUCKET=ai-agent-platform
railway variables set MINIO_USE_SSL=true

# Alpha Vantage
railway variables set ALPHA_VANTAGE_API_KEY=your-key
```

For **Worker Service**:
```bash
railway service worker

# MinIO
railway variables set MINIO_ENDPOINT=your-endpoint
railway variables set MINIO_REGION=us-east-1
railway variables set MINIO_ACCESS_KEY=your-key
railway variables set MINIO_SECRET_KEY=your-secret
railway variables set MINIO_BUCKET=ai-agent-platform
railway variables set MINIO_USE_SSL=true

# Alpha Vantage
railway variables set ALPHA_VANTAGE_API_KEY=your-key
```

## 🔒 Security Best Practices

1. **Never commit .env files to git**
   - Already in `.gitignore`
   - Use `.env.example` as template

2. **Use different keys for dev/prod**
   - Development: Lower security, local testing
   - Production: Strong passwords, SSL enabled

3. **Rotate credentials regularly**
   - Change API keys every 90 days
   - Update MinIO access keys quarterly

4. **Use Railway Secrets**
   - Railway encrypts all environment variables
   - Use Railway UI for sensitive data

## ✅ Verification

After setting up credentials, verify they work:

```bash
# Test MinIO connection
python -c "
from minio import Minio
import os
from dotenv import load_dotenv

load_dotenv()
client = Minio(
    os.getenv('MINIO_ENDPOINT'),
    access_key=os.getenv('MINIO_ACCESS_KEY'),
    secret_key=os.getenv('MINIO_SECRET_KEY'),
    secure=os.getenv('MINIO_USE_SSL') == 'true'
)
print('✅ MinIO connection successful!')
print('Buckets:', list(client.list_buckets()))
"

# Test Alpha Vantage
curl "https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=IBM&interval=5min&apikey=YOUR_API_KEY"
```

## 🆘 Troubleshooting

### MinIO Connection Issues

**Error: Connection refused**
- Check endpoint format: `host:port` (no http://)
- Verify port is open: `telnet your-endpoint 9000`
- Check SSL setting matches endpoint protocol

**Error: Invalid credentials**
- Verify access key and secret key
- Check if keys have proper permissions
- Regenerate keys if needed

### Alpha Vantage Issues

**Error: Rate limit exceeded**
- Wait 1 minute before retry
- Implement exponential backoff
- Consider upgrading to premium tier

**Error: Invalid API key**
- Verify key is correctly copied
- Check for extra spaces
- Regenerate key from website

## 📚 Additional Resources

- [MinIO Documentation](https://min.io/docs/minio/linux/index.html)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Alpha Vantage API Docs](https://www.alphavantage.co/documentation/)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)
