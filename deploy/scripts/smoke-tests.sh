#!/bin/bash
set -e

ENVIRONMENT=$1
API_URL="http://localhost:3002"
APP_URL="http://localhost:3012"

if [ "$ENVIRONMENT" = "blue" ]; then
    API_URL="http://localhost:3001"
    APP_URL="http://localhost:3011"
fi

echo "🧪 Running smoke tests on $ENVIRONMENT environment..."

# Test API health
echo "Testing API health..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/health 2>/dev/null || echo "000")
if [ "$HEALTH" != "200" ]; then
    echo "❌ API health check failed: $HEALTH"
    exit 1
fi
echo "✅ API health check passed"

# Test API categories endpoint
echo "Testing API categories endpoint..."
CATEGORIES=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/api/categories 2>/dev/null || echo "000")
if [ "$CATEGORIES" != "200" ]; then
    echo "❌ Categories endpoint failed: $CATEGORIES"
    exit 1
fi
echo "✅ Categories endpoint passed"

# Test App health
echo "Testing App health..."
APP_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" $APP_URL/health 2>/dev/null || echo "000")
if [ "$APP_HEALTH" != "200" ]; then
    echo "❌ App health check failed: $APP_HEALTH"
    exit 1
fi
echo "✅ App health check passed"

# Test App homepage
echo "Testing App homepage..."
HOMEPAGE=$(curl -s -o /dev/null -w "%{http_code}" $APP_URL/ 2>/dev/null || echo "000")
if [ "$HOMEPAGE" != "200" ]; then
    echo "❌ App homepage failed: $HOMEPAGE"
    exit 1
fi
echo "✅ App homepage passed"

echo "✅ All smoke tests passed!"
