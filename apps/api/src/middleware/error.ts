import { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger'
import { env } from '../lib/env'

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error({ message: err.message, stack: err.stack }, 'unhandled error')
  res.status(500).json({
    status: 'error',
    message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  })
}
