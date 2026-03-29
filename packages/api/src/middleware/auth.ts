import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

/**
 * Middleware: verify the Bearer JWT in the `Authorization` header.
 *
 * On success, attaches `{ id, role }` to `req.user` and calls `next()`.
 * On failure, responds with 401.
 *
 * @example
 * router.get('/protected', authenticate, handler)
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ status: 'error', message: 'Unauthorized', code: 401 })
  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as { id: string; role: string }
    next()
  } catch {
    return res.status(401).json({ status: 'error', message: 'Invalid token', code: 401 })
  }
}

/**
 * Middleware factory: restrict access to users whose role is in `roles`.
 *
 * Must be used after `authenticate` so that `req.user` is populated.
 *
 * @param roles - One or more allowed role strings (e.g. `'curator'`, `'admin'`).
 * @returns Express middleware that responds with 403 if the user's role is not allowed.
 *
 * @example
 * router.post('/workers', authenticate, authorize('curator', 'admin'), createWorker)
 */
export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden', code: 403 })
    }
    next()
  }
}
