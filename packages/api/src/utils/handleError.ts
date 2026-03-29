import type { Response } from 'express'
import { AppError } from '../services/AppError.js'
import { logger } from '../config/logger.js'

/**
 * Centralised error response helper.
 *
 * Sends a structured JSON error response. Operational `AppError` instances are
 * forwarded with their status code and message. All other errors are treated as
 * unexpected and return a generic 500 response (the original error is logged).
 *
 * @param res - The Express response object.
 * @param err - The caught error (may be any type).
 * @returns The Express response.
 *
 * @example
 * try {
 *   // ...
 * } catch (err) {
 *   return handleError(res, err)
 * }
 */
export function handleError(res: Response, err: unknown) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ status: 'error', message: err.message, code: err.statusCode })
  }
  logger.error({ err }, 'Unexpected error')
  return res.status(500).json({ status: 'error', message: 'Internal server error', code: 500 })
}
