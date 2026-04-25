import express from 'express'
import cors from 'cors'
import pinoHttp from 'pino-http'
import methodOverride from 'method-override'
import passport from './config/passport.js'
import { logger } from './config/logger.js'
import { redis, cacheMetrics } from './config/redis.js'
import authRoutes from './routes/auth.js'
import categoryRoutes from './routes/categories.js'
import workerRoutes from './routes/workers.js'
import adminRoutes from './routes/admin.js'
import userRoutes from './routes/users.js'

const app = express()

// Connect Redis (non-blocking — app starts even if Redis is down)
redis.connect().catch(() => {})

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(pinoHttp({ logger }))
app.use(methodOverride('X-HTTP-Method'))
app.use(passport.initialize())

app.use('/api/auth', authRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/workers', workerRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/users', userRoutes)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'bluecollar-api' })
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
