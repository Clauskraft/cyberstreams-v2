#!/bin/bash

# Script to set up Twitter/X API secrets on Railway
# Usage: ./setup-railway-twitter-secrets.sh

echo "🚂 Setting up X (Twitter) API secrets on Railway"
echo ""

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed"
    echo "Install it with: npm i -g @railway/cli"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway"
    echo "Run: railway login"
    exit 1
fi

echo "Enter your X API credentials:"
echo ""

read -p "API Key (Consumer Key): " TWITTER_API_KEY
read -sp "API Secret (Consumer Secret): " TWITTER_API_SECRET
echo ""
read -sp "Bearer Token: " TWITTER_BEARER_TOKEN
echo ""
read -p "Access Token (optional, press Enter to skip): " TWITTER_ACCESS_TOKEN
read -sp "Access Token Secret (optional, press Enter to skip): " TWITTER_ACCESS_TOKEN_SECRET
echo ""
echo ""

# Set variables
echo "📝 Setting Railway environment variables..."

railway variables set TWITTER_API_KEY="$TWITTER_API_KEY"
railway variables set TWITTER_API_SECRET="$TWITTER_API_SECRET"
railway variables set TWITTER_BEARER_TOKEN="$TWITTER_BEARER_TOKEN"

if [ -n "$TWITTER_ACCESS_TOKEN" ]; then
    railway variables set TWITTER_ACCESS_TOKEN="$TWITTER_ACCESS_TOKEN"
fi

if [ -n "$TWITTER_ACCESS_TOKEN_SECRET" ]; then
    railway variables set TWITTER_ACCESS_TOKEN_SECRET="$TWITTER_ACCESS_TOKEN_SECRET"
fi

echo ""
echo "✅ Railway environment variables configured successfully!"
echo ""
echo "Verify with: railway variables"
