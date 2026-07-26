import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth'
import { NotificationLogService } from '../services/notificationLog.service'
import { logger } from '../lib/logger'

const router = Router()
const logService = new NotificationLogService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) throw new Error('No organization associated with this account')
  return orgId
}

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const channelId = typeof req.query.channelId === 'string' ? req.query.channelId : undefined
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 25
    const result = await logService.list(organizationId, { channelId, status, page, pageSize })
    res.status(200).json(result)
  } catch (err) {
    logger.error(err, 'list notification logs failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list notification logs' })
  }
})

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const log = await logService.getById(organizationId, req.params.id)
    res.status(200).json({ log })
  } catch (err) {
    logger.error(err, 'get notification log failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get notification log' })
  }
})

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = req.body
    const log = await logService.create(organizationId, input)
    res.status(201).json({ log })
  } catch (err) {
    logger.error(err, 'create notification log failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create notification log' })
  }
})

router.patch('/:id/status', authenticate, async (req: Request, res: Response) => {
  try {
    const { status } = req.body as { status: string }
    const log = await logService.updateStatus(req.params.id, status)
    res.status(200).json({ log })
  } catch (err) {
    logger.error(err, 'update notification log status failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update notification log status' })
  }
})

export default router
