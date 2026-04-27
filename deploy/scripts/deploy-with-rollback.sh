#!/bin/bash
set -e

# BlueCollar Deployment Script with Automated Rollback
# Usage: ./deploy.sh [environment] [version]

ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
DEPLOYMENT_TIMEOUT=300
HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_INTERVAL=10

echo "🚀 Deploying BlueCollar to $ENVIRONMENT (version: $VERSION)"

# Function to check deployment health
check_deployment_health() {
  local namespace=$1
  local deployment=$2
  local retries=$HEALTH_CHECK_RETRIES

  echo "🏥 Checking deployment health..."
  
  while [ $retries -gt 0 ]; do
    ready=$(kubectl get deployment $deployment -n $namespace -o jsonpath='{.status.conditions[?(@.type=="Available")].status}')
    
    if [ "$ready" = "True" ]; then
      echo "✅ Deployment is healthy"
      return 0
    fi
    
    echo "⏳ Waiting for deployment to be ready... ($retries retries left)"
    sleep $HEALTH_CHECK_INTERVAL
    retries=$((retries - 1))
  done
  
  echo "❌ Deployment health check failed"
  return 1
}

# Function to rollback deployment
rollback_deployment() {
  local namespace=$1
  local deployment=$2
  
  echo "🔄 Rolling back deployment..."
  kubectl rollout undo deployment/$deployment -n $namespace
  
  if check_deployment_health $namespace $deployment; then
    echo "✅ Rollback successful"
    return 0
  else
    echo "❌ Rollback failed"
    return 1
  fi
}

# Deploy based on environment
case $ENVIRONMENT in
  production)
    NAMESPACE="bluecollar"
    DEPLOYMENT="bluecollar-api"
    ;;
  staging)
    NAMESPACE="bluecollar-staging"
    DEPLOYMENT="bluecollar-api-staging"
    ;;
  *)
    echo "❌ Unknown environment: $ENVIRONMENT"
    exit 1
    ;;
esac

# Update deployment image
echo "📦 Updating deployment image to $VERSION..."
kubectl set image deployment/$DEPLOYMENT \
  api=ghcr.io/blue-kollar/blue-collar:$VERSION \
  -n $NAMESPACE

# Wait for rollout
echo "⏳ Waiting for rollout to complete..."
if ! kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE --timeout=${DEPLOYMENT_TIMEOUT}s; then
  echo "❌ Rollout failed"
  rollback_deployment $NAMESPACE $DEPLOYMENT
  exit 1
fi

# Health check
if ! check_deployment_health $NAMESPACE $DEPLOYMENT; then
  echo "❌ Health check failed"
  rollback_deployment $NAMESPACE $DEPLOYMENT
  exit 1
fi

echo "✅ Deployment successful!"
exit 0
