import { db } from '../db.js'
import { AppError } from './AppError.js'
import { updateBookmarkCount } from './analytics.service.js'

/**
 * Toggle a bookmark for a user/worker pair.
 * Creates the bookmark if it doesn't exist, removes it if it does.
 * @returns `{ bookmarked: boolean }` — true if now bookmarked, false if removed
 */
export async function toggleBookmark(userId: string, workerId: string) {
  const worker = await db.worker.findUnique({ where: { id: workerId } })
  if (!worker) throw new AppError('Worker not found', 404)

  const existing = await db.bookmark.findUnique({
    where: { userId_workerId: { userId, workerId } },
  })

  if (existing) {
    await db.bookmark.delete({ where: { id: existing.id } })
    updateBookmarkCount(workerId, -1).catch(() => {})
    return { bookmarked: false }
  }

  await db.bookmark.create({ data: { userId, workerId } })
  updateBookmarkCount(workerId, 1).catch(() => {})
  return { bookmarked: true }
}

/**
 * Return a paginated list of bookmarked workers for a user.
 */
export async function listBookmarks(userId: string, page: number, limit: number) {
  const where = { userId }
  const [bookmarks, total] = await Promise.all([
    db.bookmark.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { worker: { include: { category: true } } },
    }),
    db.bookmark.count({ where }),
  ])

  return {
    data: bookmarks.map((b) => b.worker),
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  }
}
