import { Router, Request, Response } from 'express'
import logger from '../lib/logger'

const router = Router()

router.get('/health', (_req: Request, res: Response) => {
  logger.info('health check')
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default router
