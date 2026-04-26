import { db } from '../db.js'
import { AppError } from './AppError.js'

/**
 * Record a profile view with IP deduplication (one unique view per IP per day).
 * Upserts the WorkerAnalytics aggregate row.
 */
export async function recordProfileView(workerId: string, ip: string) {
  const worker = await db.worker.findUnique({ where: { id: workerId } })
  if (!worker) throw new AppError('Worker not found', 404)

  // Normalise to start-of-day for deduplication
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const existing = await db.profileView.findFirst({
    where: { workerId, ip, viewedAt: { gte: today } },
  })

  // Always increment total views
  await db.workerAnalytics.upsert({
    where: { workerId },
    create: { workerId, totalViews: 1, uniqueViews: existing ? 0 : 1 },
    update: {
      totalViews: { increment: 1 },
      ...(existing ? {} : { uniqueViews: { increment: 1 } }),
    },
  })

  if (!existing) {
    await db.profileView.create({ data: { workerId, ip } })
  }
}

/**
 * Update tip analytics for a worker.
 */
export async function recordTip(workerId: string, amount: number) {
  await db.workerAnalytics.upsert({
    where: { workerId },
    create: { workerId, totalTips: amount, tipCount: 1 },
    update: { totalTips: { increment: amount }, tipCount: { increment: 1 } },
  })
}

/**
 * Update bookmark count for a worker (+1 or -1).
 */
export async function updateBookmarkCount(workerId: string, delta: 1 | -1) {
  await db.workerAnalytics.upsert({
    where: { workerId },
    create: { workerId, bookmarkCount: delta === 1 ? 1 : 0 },
    update: { bookmarkCount: { increment: delta } },
  })
}

/**
 * Get analytics dashboard for a worker.
 */
export async function getWorkerAnalytics(workerId: string) {
  const worker = await db.worker.findUnique({ where: { id: workerId } })
  if (!worker) throw new AppError('Worker not found', 404)

  const analytics = await db.workerAnalytics.findUnique({ where: { workerId } })

  return {
    workerId,
    workerName: worker.name,
    totalViews: analytics?.totalViews ?? 0,
    uniqueViews: analytics?.uniqueViews ?? 0,
    totalTips: analytics?.totalTips ?? 0,
    tipCount: analytics?.tipCount ?? 0,
    bookmarkCount: analytics?.bookmarkCount ?? 0,
    updatedAt: analytics?.updatedAt ?? null,
  }
}
