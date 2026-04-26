import type { Request, Response, NextFunction } from 'express'

/**
 * Middleware: attach the resolved API version to `req` and response headers.
 * Reads from the URL prefix (/api/v1, /api/v2) or defaults to 'v1'.
 */
export function versionMiddleware(req: Request, res: Response, next: NextFunction) {
  const match = req.path.match(/^\/api\/(v\d+)\//)
  const version = match ? match[1] : 'v1'
  ;(req as any).apiVersion = version
  res.setHeader('X-API-Version', version)
  next()
}

/**
 * Middleware: add a deprecation warning header for unversioned /api/* routes.
 * Encourages clients to migrate to /api/v1/*.
 */
export function deprecationWarning(req: Request, res: Response, next: NextFunction) {
  res.setHeader(
    'Deprecation',
    'true',
  )
  res.setHeader(
    'Warning',
    '299 - "Unversioned API path is deprecated. Use /api/v1/* instead."',
  )
  res.setHeader('Sunset', 'Sat, 01 Jan 2027 00:00:00 GMT')
  next()
}
