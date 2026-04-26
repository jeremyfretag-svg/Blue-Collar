import type { Request, Response } from 'express'
import * as analyticsService from '../services/analytics.service.js'
import { handleError } from '../utils/handleError.js'

/** GET /api/workers/:id/analytics — curator or admin only */
export async function getAnalytics(req: Request, res: Response) {
  try {
    const data = await analyticsService.getWorkerAnalytics(req.params.id)
    return res.json({ data, status: 'success', code: 200 })
  } catch (err) {
    return handleError(res, err)
  }
}

/** POST /api/workers/:id/analytics/view — public, records a profile view */
export async function trackView(req: Request, res: Response) {
  try {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? 'unknown'
    await analyticsService.recordProfileView(req.params.id, ip)
    return res.json({ status: 'success', code: 200 })
  } catch (err) {
    return handleError(res, err)
  }
}
