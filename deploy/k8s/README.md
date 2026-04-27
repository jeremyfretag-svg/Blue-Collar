# BlueCollar Kubernetes Deployment Guide

## Prerequisites

- Kubernetes 1.24+
- Helm 3.0+
- kubectl configured to access your cluster
- Docker images pushed to registry

## Quick Start

### 1. Create Namespace and Secrets

```bash
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/secrets.yaml
```

### 2. Deploy with Helm

```bash
helm install bluecollar deploy/helm/bluecollar \
  --namespace bluecollar \
  --set secrets.databaseUrl="postgresql://user:pass@postgres:5432/bluecollar" \
  --set secrets.jwtSecret="your-secret-key"
```

### 3. Verify Deployment

```bash
kubectl get pods -n bluecollar
kubectl get svc -n bluecollar
kubectl get hpa -n bluecollar
```

## Manual Deployment (without Helm)

```bash
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/secrets.yaml
kubectl apply -f deploy/k8s/api-deployment.yaml
kubectl apply -f deploy/k8s/hpa.yaml
kubectl apply -f deploy/k8s/ingress.yaml
```

## Features

- **Rolling Updates**: Zero-downtime deployments with maxSurge=1, maxUnavailable=0
- **Health Checks**: Liveness and readiness probes configured
- **Horizontal Pod Autoscaling**: Scales 3-10 replicas based on CPU/memory
- **Resource Limits**: Memory 512Mi, CPU 500m per pod
- **Ingress**: HTTPS with cert-manager integration

## Monitoring

```bash
# Watch pod status
kubectl get pods -n bluecollar -w

# View logs
kubectl logs -n bluecollar -l app=bluecollar-api -f

# Check HPA status
kubectl get hpa -n bluecollar -w
```

## Troubleshooting

```bash
# Describe deployment
kubectl describe deployment bluecollar-api -n bluecollar

# Check events
kubectl get events -n bluecollar --sort-by='.lastTimestamp'

# Port forward for testing
kubectl port-forward -n bluecollar svc/bluecollar-api 3000:80
```
