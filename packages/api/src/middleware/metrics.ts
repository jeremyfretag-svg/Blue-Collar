import { Request, Response, NextFunction } from 'express';
import * as promClient from 'prom-client';

// Create metrics
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

const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active database connections',
});

// Middleware to track HTTP requests
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

// Endpoint to expose metrics
export function metricsEndpoint(req: Request, res: Response) {
  res.set('Content-Type', promClient.register.contentType);
  res.end(promClient.register.metrics());
}

// Helper to track database queries
export function trackDbQuery(operation: string, table: string, duration: number) {
  dbQueryDuration.labels(operation, table).observe(duration / 1000);
}

// Helper to update active connections
export function setActiveConnections(count: number) {
  activeConnections.set(count);
}

// Default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics();
