import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { NotificationTemplateService } from '../services/notificationTemplate.service'
import { logger } from '../lib/logger'

const router = Router()
const templateService = new NotificationTemplateService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) throw new Error('No organization associated with this account')
  return orgId
}

const createSchema = z.object({
  channelId: z.string().min(1),
  name: z.string().min(1),
  subject: z.string().nullable().optional(),
  body: z.string().min(1),
  variables: z.array(z.string()).optional().default([]),
  isActive: z.boolean().optional().default(true),
})

const updateSchema = z.object({
  channelId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  subject: z.string().nullable().optional(),
  body: z.string().min(1).optional(),
  variables: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const channelId = typeof req.query.channelId === 'string' ? req.query.channelId : undefined
    const templates = await templateService.list(organizationId, channelId)
    res.status(200).json({ templates })
  } catch (err) {
    logger.error(err, 'list notification templates failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list notification templates' })
  }
})

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const template = await templateService.getById(organizationId, req.params.id)
    res.status(200).json({ template })
  } catch (err) {
    logger.error(err, 'get notification template failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get notification template' })
  }
})

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = createSchema.parse(req.body)
    const template = await templateService.create(organizationId, req.user!.id, input)
    logger.info({ organizationId, id: template.id }, 'notification template created')
    res.status(201).json({ template })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'create notification template failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create notification template' })
  }
})

router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = updateSchema.parse(req.body)
    const template = await templateService.update(organizationId, req.user!.id, req.params.id, input)
    logger.info({ organizationId, id: req.params.id }, 'notification template updated')
    res.status(200).json({ template })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'update notification template failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update notification template' })
  }
})

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await templateService.delete(organizationId, req.user!.id, req.params.id)
    logger.info({ organizationId, id: req.params.id }, 'notification template deleted')
    res.status(200).json({ message: 'Notification template deleted' })
  } catch (err) {
    logger.error(err, 'delete notification template failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete notification template' })
  }
})

export default router
