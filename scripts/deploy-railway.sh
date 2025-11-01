#!/bin/bash
# Railway Deployment Script for Cyberstreams V2
# This script deploys all services to Railway

set -e

echo "🚂 Cyberstreams V2 - Railway Deployment"
echo "======================================"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed"
    echo "Install it with: npm i -g @railway/cli"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway"
    echo "Please run: railway login"
    exit 1
fi

echo "✅ Railway CLI authenticated"
echo ""

# Get project info
echo "📋 Current Railway configuration:"
railway status || true
echo ""

# Deploy API service
echo "🚀 Deploying API service..."
railway up --service api --path apps/api --detach

# Wait a moment
sleep 2

# Deploy Worker service
echo "🚀 Deploying Worker service..."
railway up --service worker --path apps/worker --detach

# Wait a moment
sleep 2

# Deploy Web service
echo "🚀 Deploying Web service..."
railway up --service web --path apps/web --detach

echo ""
echo "✅ All services deployed to Railway!"
echo ""
echo "Next steps:"
echo "1. Check deployment status: railway status"
echo "2. View logs: railway logs"
echo "3. Verify health: Check Railway dashboard for service URLs"
echo ""

