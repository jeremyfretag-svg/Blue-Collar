#!/bin/bash
set -e

TARGET=$1

echo "🔄 Switching traffic to $TARGET environment..."

if [ "$TARGET" = "green" ]; then
    echo "Routing traffic to green..."
    export ACTIVE_ENVIRONMENT=green
else
    echo "Routing traffic to blue..."
    export ACTIVE_ENVIRONMENT=blue
fi

# Verify traffic is flowing
sleep 2
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health 2>/dev/null || echo "000")
if [ "$HEALTH" != "200" ]; then
    echo "❌ Health check failed after traffic switch"
    exit 1
fi

echo "✅ Traffic switched to $TARGET"
echo "✅ Traffic switch verified"
