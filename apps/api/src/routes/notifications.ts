import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { NotificationService } from '../services/notification.service'
import { logger } from '../lib/logger'

const router = Router()
const notificationService = new NotificationService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) {
    throw new Error('No organization associated with this account')
  }
  return orgId
}

const preferencesSchema = z
  .object({
    billing: z
      .object({
        email: z.boolean(),
        sms: z.boolean(),
        push: z.boolean(),
        in_app: z.boolean(),
      })
      .partial()
      .optional(),
    usage: z
      .object({
        email: z.boolean(),
        sms: z.boolean(),
        push: z.boolean(),
        in_app: z.boolean(),
      })
      .partial()
      .optional(),
    security: z
      .object({
        email: z.boolean(),
        sms: z.boolean(),
        push: z.boolean(),
        in_app: z.boolean(),
      })
      .partial()
      .optional(),
    support: z
      .object({
        email: z.boolean(),
        sms: z.boolean(),
        push: z.boolean(),
        in_app: z.boolean(),
      })
      .partial()
      .optional(),
  })
  .passthrough()

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const channel = typeof req.query.channel === 'string' ? req.query.channel : undefined
    const unreadOnly = req.query.unreadOnly === 'true'
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 25
    const result = await notificationService.list(organizationId, { channel, unreadOnly, page, pageSize })
    res.status(200).json(result)
  } catch (err) {
    logger.error(err, 'list notifications failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list notifications' })
  }
})

router.patch('/:id/read', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await notificationService.markRead(organizationId, req.params.id)
    res.status(200).json({ message: 'Notification marked as read' })
  } catch (err) {
    logger.error(err, 'mark read failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to mark notification as read' })
  }
})

router.post('/read-all', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await notificationService.markAllRead(organizationId)
    res.status(200).json({ message: 'All notifications marked as read' })
  } catch (err) {
    logger.error(err, 'mark all read failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to mark notifications as read' })
  }
})

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await notificationService.remove(organizationId, req.params.id)
    logger.info({ organizationId, id: req.params.id }, 'notification deleted')
    res.status(200).json({ message: 'Notification deleted' })
  } catch (err) {
    logger.error(err, 'delete notification failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete notification' })
  }
})

router.get('/preferences', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const prefs = await notificationService.getPreferences(organizationId)
    res.status(200).json({ preferences: prefs })
  } catch (err) {
    logger.error(err, 'get preferences failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get notification preferences' })
  }
})

router.put('/preferences', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = preferencesSchema.parse(req.body)
    const prefs = await notificationService.updatePreferences(organizationId, input)
    logger.info({ organizationId }, 'notification preferences updated')
    res.status(200).json({ preferences: prefs })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'update preferences failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update notification preferences' })
  }
})

export default router
