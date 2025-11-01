# E2E Testing Guide

## Overview

This directory contains Playwright E2E tests for the Cyberstreams web console and API.

## Test Suites

### 1. Local Tests (`admin-board.spec.ts`)
Tests against local development server (port 8081).

### 2. Railway Tests (`railway-auth.spec.ts`)
Tests against Railway production deployment with environment-based API keys.

## Setup

### Prerequisites
```bash
npm install
npx playwright install
```

### Environment Configuration

#### Local Testing
Set `E2E_ADMIN_KEY` for local tests:
```bash
export E2E_ADMIN_KEY=your_local_admin_key
```

#### Railway Testing
Create `.env.e2e` file in project root:
```bash
# NEVER commit this file with real credentials!
E2E_BASE_URL=https://your-console-url.up.railway.app
E2E_API_URL=https://your-api-url.up.railway.app
E2E_ADMIN_API_KEY=your_admin_api_key_here
E2E_USER_API_KEY=your_user_api_key_here
```

**IMPORTANT**: Generate test API keys from your Railway deployment. Never commit production credentials to version control.

## Running Tests

### Local Tests
```bash
# Start local server first
npm run dev

# Run tests
npx playwright test tests/e2e/admin-board.spec.ts
```

### Railway Tests
```bash
# Load environment and run
./scripts/run-e2e-railway.sh

# Or manually
source .env.e2e
npx playwright test tests/e2e/railway-auth.spec.ts
```

### All E2E Tests
```bash
npx playwright test tests/e2e/
```

### Debug Mode
```bash
npx playwright test tests/e2e/railway-auth.spec.ts --debug
```

### UI Mode (Interactive)
```bash
npx playwright test tests/e2e/railway-auth.spec.ts --ui
```

## Test Coverage

### Railway Authentication Tests
- ✅ Web console loads without errors
- ✅ User API key authentication
- ✅ Admin API key authentication
- ✅ Authenticated search functionality
- ✅ Invalid key rejection
- ✅ Direct API token exchange
- ✅ Direct API authenticated search

## Troubleshooting

### 401 Unauthorized Errors
If tests fail with 401:
1. Verify Railway API keys are set correctly
2. Check that Railway service has redeployed with new env vars
3. Confirm `.env.e2e` has the correct keys

### Console Not Loading
1. Check Railway console URL is accessible
2. Verify Railway deployment is running
3. Check browser console for errors (run with `--headed`)

### Search Fails
1. Verify OpenSearch is configured in Railway
2. Check that data exists in the index
3. Confirm API has proper database connection

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Load E2E Environment
  run: |
    echo "E2E_API_URL=${{ secrets.RAILWAY_API_URL }}" >> .env.e2e
    echo "E2E_USER_API_KEY=${{ secrets.E2E_USER_API_KEY }}" >> .env.e2e

- name: Run E2E Tests
  run: |
    source .env.e2e
    npx playwright test tests/e2e/railway-auth.spec.ts
```

## Security Notes

⚠️ **NEVER commit `.env.e2e` to version control!**

The file contains production API keys and should remain local or be injected via CI/CD secrets.

Add to `.gitignore`:
```
.env.e2e
```
