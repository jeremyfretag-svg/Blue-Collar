import type { Request, Response } from 'express'
import * as bookmarkService from '../services/bookmark.service.js'
import { handleError } from '../utils/handleError.js'

/**
 * POST /api/workers/:id/bookmark
 * Toggle bookmark for the authenticated user on the given worker.
 */
export async function toggleBookmark(req: Request, res: Response) {
  try {
    const result = await bookmarkService.toggleBookmark(req.user!.id, req.params.id)
    return res.json({ data: result, status: 'success', code: 200 })
  } catch (err) {
    return handleError(res, err)
  }
}

/**
 * GET /api/users/me/bookmarks
 * List the authenticated user's bookmarked workers (paginated).
 */
export async function listMyBookmarks(req: Request, res: Response) {
  try {
    const page = Number(req.query.page ?? 1)
    const limit = Number(req.query.limit ?? 20)
    const result = await bookmarkService.listBookmarks(req.user!.id, page, limit)
    return res.json({ ...result, status: 'success', code: 200 })
  } catch (err) {
    return handleError(res, err)
  }
}
