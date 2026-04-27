#!/bin/bash
set -e

echo "⏮️  Rolling back to previous environment..."

CURRENT=${ACTIVE_ENVIRONMENT:-blue}

if [ "$CURRENT" = "green" ]; then
    echo "Rolling back from green to blue..."
    ./deploy/scripts/switch-traffic.sh blue
    docker-compose -f docker-compose.blue-green.yml --profile green down || true
else
    echo "Rolling back from blue to green..."
    ./deploy/scripts/switch-traffic.sh green
    docker-compose -f docker-compose.blue-green.yml down || true
fi

echo "✅ Rollback completed"
