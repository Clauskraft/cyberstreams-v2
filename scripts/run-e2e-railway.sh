#!/bin/bash
# Run E2E tests against Railway deployment
# Usage: ./scripts/run-e2e-railway.sh

set -e

echo "🧪 Running E2E tests against Railway deployment"
echo ""

# Check if .env.e2e exists
if [ ! -f .env.e2e ]; then
    echo "❌ .env.e2e not found!"
    echo "Create it with Railway credentials first"
    exit 1
fi

# Load environment variables
export $(cat .env.e2e | grep -v '^#' | xargs)

echo "📋 Configuration:"
echo "   API: $E2E_API_URL"
echo "   Console: $E2E_BASE_URL"
echo ""

# Run Playwright tests
echo "🎭 Running Playwright tests..."
npx playwright test tests/e2e/railway-auth.spec.ts

echo ""
echo "✅ E2E tests completed!"
