import express from 'express'
import cors from 'cors'
import pinoHttp from 'pino-http'
import methodOverride from 'method-override'
import passport from './config/passport.js'
import { logger } from './config/logger.js'
import { redis, cacheMetrics } from './config/redis.js'
import { db } from './db.js'
import authRoutes from './routes/auth.js'
import categoryRoutes from './routes/categories.js'
import workerRoutes from './routes/workers.js'
import adminRoutes from './routes/admin.js'
import userRoutes from './routes/users.js'
import disputeRoutes from './routes/disputes.js'
import recommendationRoutes from './routes/recommendations.js'
import webhookRoutes from './routes/webhooks.js'
import verificationRoutes from './routes/verifications.js'
import auditRoutes from './routes/audit.js'
import { auditMiddleware } from './middleware/audit.js'
import { versionMiddleware, deprecationWarning } from './middleware/version.js'

const app = express()

// Connect Redis (non-blocking — app starts even if Redis is down)
redis.connect().catch(() => {})

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(pinoHttp({ logger }))
app.use(methodOverride('X-HTTP-Method'))
app.use(passport.initialize())
app.use(versionMiddleware)

app.use(auditMiddleware)

// ── v1 versioned routes (canonical) ──────────────────────────────────────────
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/categories', categoryRoutes)
app.use('/api/v1/workers', workerRoutes)
app.use('/api/v1/admin', adminRoutes)
app.use('/api/v1/users', userRoutes)
app.use('/api/v1/disputes', disputeRoutes)
app.use('/api/v1/recommendations', recommendationRoutes)
app.use('/api/v1/webhooks', webhookRoutes)
app.use('/api/v1/verifications', verificationRoutes)
app.use('/api/v1/audit', auditRoutes)

// ── Unversioned routes (deprecated — kept for backward compatibility) ─────────
app.use('/api/auth', deprecationWarning, authRoutes)
app.use('/api/categories', deprecationWarning, categoryRoutes)
app.use('/api/workers', deprecationWarning, workerRoutes)
app.use('/api/admin', deprecationWarning, adminRoutes)
app.use('/api/users', deprecationWarning, userRoutes)
app.use('/api/disputes', deprecationWarning, disputeRoutes)
app.use('/api/recommendations', deprecationWarning, recommendationRoutes)
app.use('/api/webhooks', deprecationWarning, webhookRoutes)
app.use('/api/verifications', deprecationWarning, verificationRoutes)
app.use('/api/audit', deprecationWarning, auditRoutes)

// API versioning info
app.get('/api/versions', (_req, res) => {
  res.json({
    current: 'v1',
    supported: ['v1'],
    deprecated: ['unversioned (/api/*)'],
    sunset: '2027-01-01',
    message: 'Use /api/v1/* for all requests. Unversioned /api/* paths are deprecated.',
  })
})

app.get('/health', async (_req, res) => {
  const checks: Record<string, { status: 'ok' | 'error'; latencyMs?: number; error?: string }> = {}

  // Database check
  const dbStart = Date.now()
  try {
    await db.$queryRaw`SELECT 1`
    checks.database = { status: 'ok', latencyMs: Date.now() - dbStart }
  } catch (err: any) {
    checks.database = { status: 'error', latencyMs: Date.now() - dbStart, error: err?.message }
  }

  // Redis check
  const redisStart = Date.now()
  try {
    await redis.ping()
    checks.redis = { status: 'ok', latencyMs: Date.now() - redisStart }
  } catch (err: any) {
    checks.redis = { status: 'error', latencyMs: Date.now() - redisStart, error: err?.message }
  }

  const allOk = Object.values(checks).every((c) => c.status === 'ok')
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    service: 'bluecollar-api',
    checks,
    timestamp: new Date().toISOString(),
  })
})

app.get('/metrics/cache', (_req, res) => {
  const total = cacheMetrics.hits + cacheMetrics.misses
  res.json({
    hits: cacheMetrics.hits,
    misses: cacheMetrics.misses,
    hitRate: total > 0 ? `${Math.round((cacheMetrics.hits / total) * 100)}%` : '0%',
  })
})

export default app
