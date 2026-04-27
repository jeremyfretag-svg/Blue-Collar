# Monitoring and Alerting Guide

This guide covers setting up a comprehensive monitoring stack with Prometheus, Grafana, and alerting rules for BlueCollar.

## Architecture

```
Application Metrics
      ↓
  Prometheus (scrapes metrics)
      ↓
  Grafana (visualizes)
      ↓
  AlertManager (sends alerts)
```

## 1. Prometheus Setup

### 1.1 Docker Compose Integration

Add Prometheus to `docker-compose.prod.example.yml`:

```yaml
prometheus:
  image: prom/prometheus:latest
  restart: unless-stopped
  volumes:
    - ./deploy/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    - ./deploy/prometheus/alerts.yml:/etc/prometheus/alerts.yml:ro
    - prometheus_data:/prometheus
  command:
    - '--config.file=/etc/prometheus/prometheus.yml'
    - '--storage.tsdb.path=/prometheus'
    - '--storage.tsdb.retention.time=30d'
  expose:
    - '9090'
  networks:
    - internal
  logging:
    driver: json-file
    options:
      max-size: '10m'
      max-file: '5'
```

### 1.2 Prometheus Configuration

Create `deploy/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'bluecollar-prod'

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

rule_files:
  - '/etc/prometheus/alerts.yml'

scrape_configs:
  - job_name: 'api'
    static_configs:
      - targets: ['api:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

## 2. Grafana Setup

### 2.1 Docker Compose Integration

Add Grafana to `docker-compose.prod.example.yml`:

```yaml
grafana:
  image: grafana/grafana:latest
  restart: unless-stopped
  environment:
    GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD:-admin}
    GF_USERS_ALLOW_SIGN_UP: 'false'
    GF_INSTALL_PLUGINS: 'grafana-piechart-panel'
  volumes:
    - grafana_data:/var/lib/grafana
    - ./deploy/grafana/provisioning:/etc/grafana/provisioning:ro
  expose:
    - '3000'
  networks:
    - internal
  logging:
    driver: json-file
    options:
      max-size: '10m'
      max-file: '5'
```

### 2.2 Grafana Provisioning

Create `deploy/grafana/provisioning/datasources/prometheus.yml`:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
```

## 3. AlertManager Setup

### 3.1 Docker Compose Integration

Add AlertManager to `docker-compose.prod.example.yml`:

```yaml
alertmanager:
  image: prom/alertmanager:latest
  restart: unless-stopped
  volumes:
    - ./deploy/alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
    - alertmanager_data:/alertmanager
  command:
    - '--config.file=/etc/alertmanager/alertmanager.yml'
    - '--storage.path=/alertmanager'
  expose:
    - '9093'
  networks:
    - internal
  logging:
    driver: json-file
    options:
      max-size: '10m'
      max-file: '5'
```

### 3.2 AlertManager Configuration

Create `deploy/alertmanager/alertmanager.yml`:

```yaml
global:
  resolve_timeout: 5m

route:
  receiver: 'default'
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h

receivers:
  - name: 'default'
    webhook_configs:
      - url: '${WEBHOOK_URL}'
        send_resolved: true
```

## 4. Alerting Rules

Create `deploy/prometheus/alerts.yml`:

```yaml
groups:
  - name: bluecollar
    interval: 30s
    rules:
      - alert: APIDown
        expr: up{job="api"} == 0
        for: 2m
        annotations:
          summary: 'API is down'
          description: 'API has been unreachable for 2 minutes'

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: 'High error rate detected'
          description: 'Error rate is above 5%'

      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        annotations:
          summary: 'Database is down'
          description: 'PostgreSQL has been unreachable for 1 minute'

      - alert: HighMemoryUsage
        expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.9
        for: 5m
        annotations:
          summary: 'High memory usage'
          description: 'Memory usage is above 90%'

      - alert: HighCPUUsage
        expr: rate(container_cpu_usage_seconds_total[5m]) > 0.8
        for: 5m
        annotations:
          summary: 'High CPU usage'
          description: 'CPU usage is above 80%'
```

## 5. Application Metrics Instrumentation

### 5.1 Add Prometheus Client to API

Install dependency:
```bash
npm install prom-client
```

### 5.2 Metrics Middleware

Create `packages/api/src/middleware/metrics.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import * as promClient from 'prom-client';

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    const statusCode = res.statusCode;

    httpRequestDuration.labels(req.method, route, statusCode).observe(duration);
    httpRequestTotal.labels(req.method, route, statusCode).inc();
  });

  next();
}

export function metricsEndpoint(req: Request, res: Response) {
  res.set('Content-Type', promClient.register.contentType);
  res.end(promClient.register.metrics());
}
```

### 5.3 Integrate Metrics into API

Update `packages/api/src/index.ts`:

```typescript
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics';

app.use(metricsMiddleware);
app.get('/metrics', metricsEndpoint);
```

## 6. PostgreSQL Exporter

Add postgres-exporter to `docker-compose.prod.example.yml`:

```yaml
postgres-exporter:
  image: prometheuscommunity/postgres-exporter:latest
  restart: unless-stopped
  environment:
    DATA_SOURCE_NAME: 'postgresql://${POSTGRES_USER:-bluecollar}:${POSTGRES_PASSWORD:-change-me}@db:5432/${POSTGRES_DB:-bluecollar}?sslmode=disable'
  expose:
    - '9187'
  networks:
    - internal
  logging:
    driver: json-file
    options:
      max-size: '10m'
      max-file: '5'
```

## 7. Log Aggregation with ELK Stack

### 7.1 Elasticsearch

Add to `docker-compose.prod.example.yml`:

```yaml
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
  restart: unless-stopped
  environment:
    - discovery.type=single-node
    - xpack.security.enabled=false
  volumes:
    - elasticsearch_data:/usr/share/elasticsearch/data
  expose:
    - '9200'
  networks:
    - internal
  logging:
    driver: json-file
    options:
      max-size: '10m'
      max-file: '5'
```

### 7.2 Logstash

Add to `docker-compose.prod.example.yml`:

```yaml
logstash:
  image: docker.elastic.co/logstash/logstash:8.0.0
  restart: unless-stopped
  volumes:
    - ./deploy/logstash/logstash.conf:/usr/share/logstash/pipeline/logstash.conf:ro
  environment:
    - 'LS_JAVA_OPTS=-Xmx256m -Xms256m'
  expose:
    - '5000'
  networks:
    - internal
  logging:
    driver: json-file
    options:
      max-size: '10m'
      max-file: '5'
```

### 7.3 Kibana

Add to `docker-compose.prod.example.yml`:

```yaml
kibana:
  image: docker.elastic.co/kibana/kibana:8.0.0
  restart: unless-stopped
  environment:
    ELASTICSEARCH_HOSTS: http://elasticsearch:9200
  expose:
    - '5601'
  networks:
    - internal
  logging:
    driver: json-file
    options:
      max-size: '10m'
      max-file: '5'
```

## 8. Deployment

1. Update volumes section in docker-compose:
```yaml
volumes:
  db_data:
  prometheus_data:
  grafana_data:
  alertmanager_data:
  elasticsearch_data:
```

2. Update networks section (already defined)

3. Deploy:
```bash
docker-compose -f docker-compose.prod.example.yml up -d
```

4. Access services:
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3000
   - Kibana: http://localhost:5601
   - AlertManager: http://localhost:9093

## 9. Grafana Dashboard Setup

1. Login to Grafana (default: admin/admin)
2. Add Prometheus datasource
3. Import dashboard JSON or create custom dashboards
4. Set up alert notifications

## 10. Monitoring Best Practices

- Monitor API response times and error rates
- Track database connection pool usage
- Monitor disk space and memory usage
- Set up alerts for critical thresholds
- Review logs regularly for errors
- Keep metrics retention at 30 days minimum
