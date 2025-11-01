#!/bin/bash

# Script to set up Twitter/X API secrets on GitHub
# Usage: ./setup-twitter-secrets.sh

echo "🔐 Setting up X (Twitter) API secrets on GitHub"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI"
    echo "Run: gh auth login"
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

# Set secrets
echo "📝 Setting GitHub repository secrets..."

gh secret set TWITTER_API_KEY -b "$TWITTER_API_KEY"
gh secret set TWITTER_API_SECRET -b "$TWITTER_API_SECRET"
gh secret set TWITTER_BEARER_TOKEN -b "$TWITTER_BEARER_TOKEN"

if [ -n "$TWITTER_ACCESS_TOKEN" ]; then
    gh secret set TWITTER_ACCESS_TOKEN -b "$TWITTER_ACCESS_TOKEN"
fi

if [ -n "$TWITTER_ACCESS_TOKEN_SECRET" ]; then
    gh secret set TWITTER_ACCESS_TOKEN_SECRET -b "$TWITTER_ACCESS_TOKEN_SECRET"
fi

echo ""
echo "✅ GitHub secrets configured successfully!"
echo ""
echo "Verify with: gh secret list"
