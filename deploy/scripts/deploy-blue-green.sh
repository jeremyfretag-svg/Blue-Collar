#!/bin/bash
set -e

ENVIRONMENT=${1:-production}
BLUE_VERSION=$(git describe --tags --always 2>/dev/null || echo "latest")
GREEN_VERSION=$(git rev-parse --short HEAD)

echo "🚀 Starting blue-green deployment"
echo "Environment: $ENVIRONMENT"
echo "Blue version: $BLUE_VERSION"
echo "Green version: $GREEN_VERSION"

# Step 1: Build new images
echo "📦 Building Docker images..."
docker build -t bluecollar-api:$GREEN_VERSION packages/api/ || {
    echo "❌ Failed to build API image"
    exit 1
}
docker build -t bluecollar-app:$GREEN_VERSION packages/app/ || {
    echo "❌ Failed to build App image"
    exit 1
}

# Step 2: Start green environment
echo "🟢 Starting green environment..."
docker-compose -f docker-compose.blue-green.yml --profile green up -d api-green app-green || {
    echo "❌ Failed to start green environment"
    exit 1
}

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Step 3: Run smoke tests
echo "🧪 Running smoke tests..."
if ! bash deploy/scripts/smoke-tests.sh green; then
    echo "❌ Smoke tests failed"
    docker-compose -f docker-compose.blue-green.yml --profile green down
    exit 1
fi

# Step 4: Switch traffic
echo "🔄 Switching traffic to green..."
if ! bash deploy/scripts/switch-traffic.sh green; then
    echo "❌ Traffic switch failed"
    docker-compose -f docker-compose.blue-green.yml --profile green down
    exit 1
fi

# Step 5: Monitor for errors
echo "📊 Monitoring green environment..."
if ! bash deploy/scripts/monitor-deployment.sh green 300; then
    echo "❌ Monitoring detected issues, rolling back..."
    bash deploy/scripts/rollback.sh
    exit 1
fi

# Step 6: Cleanup blue environment
echo "🧹 Cleaning up blue environment..."
docker-compose -f docker-compose.blue-green.yml down || true

echo "✅ Deployment completed successfully!"
