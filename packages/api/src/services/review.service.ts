import { db } from '../db.js'
import { AppError } from './AppError.js'

/**
 * Create a review for a worker. A user may only review a worker once.
 * @throws AppError 404 if worker not found
 * @throws AppError 409 if user already reviewed this worker
 */
export async function createReview(
  workerId: string,
  authorId: string,
  rating: number,
  comment?: string,
) {
  if (rating < 1 || rating > 5) throw new AppError('Rating must be between 1 and 5', 400)

  const worker = await db.worker.findUnique({ where: { id: workerId } })
  if (!worker) throw new AppError('Worker not found', 404)

  const existing = await db.review.findUnique({
    where: { authorId_workerId: { authorId, workerId } },
  })
  if (existing) throw new AppError('You have already reviewed this worker', 409)

  return db.review.create({
    data: { workerId, authorId, rating, comment },
    include: { author: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
  })
}

/**
 * Return a paginated list of reviews for a worker, plus aggregate stats and rating distribution.
 */
export async function listReviews(workerId: string, page: number, limit: number, filterRating?: number) {
  const where = { workerId, ...(filterRating ? { rating: filterRating } : {}) }
  const baseWhere = { workerId }

  const [reviews, total, agg, allRatings] = await Promise.all([
    db.review.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    }),
    db.review.count({ where }),
    db.review.aggregate({ where: baseWhere, _avg: { rating: true } }),
    db.review.groupBy({ by: ['rating'], where: baseWhere, _count: { rating: true } }),
  ])

  const totalReviews = await db.review.count({ where: baseWhere })

  // Build distribution: { 1: { count, percentage }, ..., 5: { count, percentage } }
  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const entry = allRatings.find((r) => r.rating === star)
    const count = entry?._count.rating ?? 0
    return {
      rating: star,
      count,
      percentage: totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0,
    }
  })

  return {
    data: reviews,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
    averageRating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
    reviewCount: totalReviews,
    distribution,
  }
}
