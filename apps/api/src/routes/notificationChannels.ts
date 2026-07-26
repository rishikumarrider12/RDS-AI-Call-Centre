import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { NotificationChannelService } from '../services/notificationChannel.service'
import { logger } from '../lib/logger'

const router = Router()
const channelService = new NotificationChannelService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) throw new Error('No organization associated with this account')
  return orgId
}

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['email', 'sms', 'push', 'slack', 'discord', 'teams', 'in_app']),
  config: z.record(z.unknown()).optional().default({}),
  isActive: z.boolean().optional().default(true),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['email', 'sms', 'push', 'slack', 'discord', 'teams', 'in_app']).optional(),
  config: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
})

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const channels = await channelService.list(organizationId)
    res.status(200).json({ channels })
  } catch (err) {
    logger.error(err, 'list notification channels failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list notification channels' })
  }
})

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const channel = await channelService.getById(organizationId, req.params.id)
    res.status(200).json({ channel })
  } catch (err) {
    logger.error(err, 'get notification channel failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get notification channel' })
  }
})

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = createSchema.parse(req.body)
    const channel = await channelService.create(organizationId, req.user!.id, input)
    logger.info({ organizationId, id: channel.id }, 'notification channel created')
    res.status(201).json({ channel })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'create notification channel failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create notification channel' })
  }
})

router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = updateSchema.parse(req.body)
    const channel = await channelService.update(organizationId, req.user!.id, req.params.id, input)
    logger.info({ organizationId, id: req.params.id }, 'notification channel updated')
    res.status(200).json({ channel })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'update notification channel failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update notification channel' })
  }
})

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await channelService.delete(organizationId, req.user!.id, req.params.id)
    logger.info({ organizationId, id: req.params.id }, 'notification channel deleted')
    res.status(200).json({ message: 'Notification channel deleted' })
  } catch (err) {
    logger.error(err, 'delete notification channel failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete notification channel' })
  }
})

export default router
