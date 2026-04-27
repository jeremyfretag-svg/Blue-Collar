#!/bin/bash

ENVIRONMENT=$1
DURATION=${2:-300}

API_URL="http://localhost:3002"
if [ "$ENVIRONMENT" = "blue" ]; then
    API_URL="http://localhost:3001"
fi

echo "📊 Monitoring $ENVIRONMENT environment for ${DURATION}s..."

START_TIME=$(date +%s)
ERROR_COUNT=0
SUCCESS_COUNT=0

while true; do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    
    if [ $ELAPSED -gt $DURATION ]; then
        break
    fi
    
    # Check API health
    HEALTH=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/health 2>/dev/null || echo "000")
    
    if [ "$HEALTH" = "200" ]; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        ERROR_COUNT=$((ERROR_COUNT + 1))
        echo "⚠️  Health check failed: $HEALTH"
    fi
    
    # Check error rate
    if [ $ERROR_COUNT -gt 5 ]; then
        echo "❌ Too many errors detected, initiating rollback..."
        ./deploy/scripts/rollback.sh
        exit 1
    fi
    
    sleep 5
done

echo "✅ Monitoring completed: $SUCCESS_COUNT successes, $ERROR_COUNT errors"
