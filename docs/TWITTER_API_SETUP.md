# X (Twitter) API Setup Guide

Complete guide to obtaining X API credentials and configuring them for GitHub Actions and Railway deployment.

## 📋 Prerequisites

- X (Twitter) account
- GitHub repository access
- Railway account and project
- GitHub CLI (optional): https://cli.github.com/
- Railway CLI: `npm i -g @railway/cli`

---

## 🔑 Step 1: Get X API Credentials

### 1.1 Create Developer Account

1. Go to [X Developer Portal](https://developer.x.com/)
2. Click **Sign up** or **Apply for access**
3. Log in with your X account
4. Complete the application form:
   - Describe your use case (legitimate security research, threat intelligence)
   - Agree to Developer Agreement and Policy
5. Wait for approval (usually instant for Basic tier)

### 1.2 Create Project and App

1. Once approved, go to [Developer Portal Dashboard](https://developer.x.com/en/portal/dashboard)
2. Click **Create Project**
   - Project name: `CyberStreams` (or your choice)
   - Use case: Select appropriate category
   - Description: Threat intelligence and security research
3. Click **Create App** within the project
   - App name: `cyberstreams-worker` (or your choice)
   - App description: Security research and threat detection

### 1.3 Generate and Save Credentials

⚠️ **IMPORTANT**: Credentials are shown only once. Save them immediately!

You'll receive:

```
API Key (Consumer Key):          xxxxxxxxxxxxxxxxxxxx
API Secret (Consumer Secret):    xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Bearer Token:                    xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Access Token (optional):         xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Access Token Secret (optional):  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Save these securely** - you'll need them for GitHub and Railway.

### 1.4 Configure App Permissions

1. In your App settings, go to **App permissions**
2. Set appropriate permissions:
   - **Read**: For fetching tweets and user data
   - **Write**: If you need to post (not typically needed for research)
3. Save changes

---

## 🔐 Step 2: Configure GitHub Secrets

### Option A: Via Web Interface

1. Go to your repository on GitHub
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret one by one:

| Secret Name | Value |
|-------------|-------|
| `TWITTER_API_KEY` | Your API Key (Consumer Key) |
| `TWITTER_API_SECRET` | Your API Secret (Consumer Secret) |
| `TWITTER_BEARER_TOKEN` | Your Bearer Token |
| `TWITTER_ACCESS_TOKEN` | Your Access Token (if using OAuth 1.0a) |
| `TWITTER_ACCESS_TOKEN_SECRET` | Your Access Token Secret (if using OAuth 1.0a) |

### Option B: Via GitHub CLI

1. Install GitHub CLI if not already installed:
   ```bash
   # Windows (with winget)
   winget install GitHub.cli

   # Or download from https://cli.github.com/
   ```

2. Authenticate:
   ```bash
   gh auth login
   ```

3. Run the setup script:
   ```bash
   cd scripts
   chmod +x setup-twitter-secrets.sh
   ./setup-twitter-secrets.sh
   ```

4. Verify secrets:
   ```bash
   gh secret list
   ```

---

## 🚂 Step 3: Configure Railway Environment Variables

### Option A: Via Railway Dashboard

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your project
3. Click on your service (worker, API, etc.)
4. Go to **Variables** tab
5. Click **New Variable** for each:

| Variable Name | Value |
|--------------|-------|
| `TWITTER_API_KEY` | Your API Key (Consumer Key) |
| `TWITTER_API_SECRET` | Your API Secret (Consumer Secret) |
| `TWITTER_BEARER_TOKEN` | Your Bearer Token |
| `TWITTER_ACCESS_TOKEN` | Your Access Token (if using OAuth 1.0a) |
| `TWITTER_ACCESS_TOKEN_SECRET` | Your Access Token Secret (if using OAuth 1.0a) |

6. Click **Deploy** to apply changes

### Option B: Via Railway CLI

1. Install Railway CLI if not already installed:
   ```bash
   npm i -g @railway/cli
   ```

2. Login:
   ```bash
   railway login
   ```

3. Link to your project:
   ```bash
   railway link
   ```

4. Run the setup script:
   ```bash
   cd scripts
   chmod +x setup-railway-twitter-secrets.sh
   ./setup-railway-twitter-secrets.sh
   ```

5. Verify variables:
   ```bash
   railway variables
   ```

### Option C: Manual Railway CLI Commands

```bash
# Set variables one by one
railway variables set TWITTER_API_KEY="your-api-key"
railway variables set TWITTER_API_SECRET="your-api-secret"
railway variables set TWITTER_BEARER_TOKEN="your-bearer-token"

# If using OAuth 1.0a User Context
railway variables set TWITTER_ACCESS_TOKEN="your-access-token"
railway variables set TWITTER_ACCESS_TOKEN_SECRET="your-access-token-secret"
```

---

## ✅ Step 4: Verify Configuration

### Verify GitHub Secrets

```bash
gh secret list
```

Expected output:
```
TWITTER_API_KEY             Updated YYYY-MM-DD
TWITTER_API_SECRET          Updated YYYY-MM-DD
TWITTER_BEARER_TOKEN        Updated YYYY-MM-DD
```

### Verify Railway Variables

```bash
railway variables
```

Expected output:
```
TWITTER_API_KEY=xxxx...
TWITTER_API_SECRET=xxxx...
TWITTER_BEARER_TOKEN=xxxx...
```

---

## 🔒 Security Best Practices

1. **Never commit credentials** to version control
   - Check `.gitignore` includes `.env`, `secrets/`, etc.

2. **Use environment variables** in your code:
   ```javascript
   const apiKey = process.env.TWITTER_API_KEY;
   const apiSecret = process.env.TWITTER_API_SECRET;
   const bearerToken = process.env.TWITTER_BEARER_TOKEN;
   ```

3. **Rotate credentials regularly**
   - Regenerate tokens every 90 days
   - Update GitHub and Railway immediately

4. **Monitor API usage**
   - Check [X Developer Portal](https://developer.x.com/en/portal/dashboard) regularly
   - Set up usage alerts if available

5. **Limit permissions**
   - Only request the permissions you need
   - Use read-only access when possible

---

## 🚀 Next Steps

After configuring secrets:

1. **Update your code** to use environment variables
2. **Test locally** with `.env` file (not committed):
   ```bash
   TWITTER_API_KEY=your-key
   TWITTER_API_SECRET=your-secret
   TWITTER_BEARER_TOKEN=your-token
   ```

3. **Deploy to Railway**:
   ```bash
   railway up
   ```

4. **Verify deployment** logs for successful authentication

---

## 📚 Additional Resources

- [X API Documentation](https://docs.x.com/x-api)
- [X API Rate Limits](https://docs.x.com/x-api/rate-limits)
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)

---

## 🐛 Troubleshooting

### "Invalid credentials" error
- Verify credentials are copied correctly (no extra spaces)
- Regenerate tokens in X Developer Portal
- Update GitHub and Railway with new tokens

### "Rate limit exceeded"
- Check [X API Rate Limits](https://docs.x.com/x-api/rate-limits)
- Upgrade to higher tier if needed
- Implement rate limiting in your code

### Railway variables not taking effect
- Redeploy after setting variables
- Check service logs for errors
- Verify variable names match exactly

### GitHub Actions failing
- Check workflow file references correct secret names
- Verify secrets are set at repository level, not environment
- Check Actions logs for specific error messages
