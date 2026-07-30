import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { requireAnyRole } from '../middleware/auth'
import { OperationsService } from '../services/operations.service'
import { logger } from '../lib/logger'

const router = Router()
const operationsService = new OperationsService()

// GET /api/operations/resources - System resource monitoring (CPU, Memory, Disk, Uptime)
router.get('/resources', authenticate, async (_req: Request, res: Response) => {
  try {
    const resources = operationsService.getSystemResources()
    res.status(200).json({ resources })
  } catch (err) {
    logger.error(err, 'get system resources failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load system resources' })
  }
})

// GET /api/operations/logs - Log viewer with filtering
router.get('/logs', authenticate, async (req: Request, res: Response) => {
  try {
    const level = typeof req.query.level === 'string' ? req.query.level : undefined
    const search = typeof req.query.search === 'string' ? req.query.search : undefined
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined

    const schema = z.object({
      level: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().int().positive().max(1000).optional(),
    }).safeParse({ level, search, limit })

    if (!schema.success) {
      return res.status(400).json({ error: 'Invalid query parameters' })
    }

    const result = operationsService.getRecentLogs(schema.data)
    res.status(200).json(result)
  } catch (err) {
    logger.error(err, 'get logs failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load logs' })
  }
})

// DELETE /api/operations/logs - Clear log buffer
router.delete('/logs', authenticate, requireAnyRole(['super_admin', 'org_admin']), async (_req: Request, res: Response) => {
  try {
    operationsService.clearLogs()
    res.status(200).json({ message: 'Log buffer cleared' })
  } catch (err) {
    logger.error(err, 'clear logs failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to clear logs' })
  }
})

// GET /api/operations/config - Production configuration viewer (redacted)
router.get('/config', authenticate, requireAnyRole(['super_admin', 'org_admin']), async (_req: Request, res: Response) => {
  try {
    const config = operationsService.getProductionConfig()
    res.status(200).json({ config })
  } catch (err) {
    logger.error(err, 'get production config failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load production config' })
  }
})

// GET /api/operations/controls - List available service control actions
router.get('/controls', authenticate, requireAnyRole(['super_admin']), async (_req: Request, res: Response) => {
  try {
    const actions = operationsService.getServiceControlActions()
    res.status(200).json({ actions })
  } catch (err) {
    logger.error(err, 'get service controls failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load service controls' })
  }
})

// POST /api/operations/restart - Restart the service (super_admin only, safe)
router.post('/restart', authenticate, requireAnyRole(['super_admin']), async (req: Request, res: Response) => {
  try {
    logger.warn({ userId: req.user?.id }, 'service restart requested by super_admin')

    res.status(202).json({
      message: 'Restart signal sent. The service will shut down gracefully; Docker will restart it automatically.',
    })

    // Give the response time to send before shutting down.
    setTimeout(() => {
      operationsService.restartService()
    }, 500)
  } catch (err) {
    logger.error(err, 'service restart failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to restart service' })
  }
})

export default router
