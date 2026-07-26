import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { WebhookService } from '../services/webhook.service'
import { logger } from '../lib/logger'

const router = Router()
const webhookService = new WebhookService()

export const WEBHOOK_EVENTS = [
  'call.started',
  'call.ended',
  'call.recording.completed',
  'call.transcript.completed',
  'campaign.started',
  'campaign.completed',
  'contact.created',
  'subscription.updated',
  'invoice.created',
]

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) {
    throw new Error('No organization associated with this account')
  }
  return orgId
}

const createSchema = z.object({
  url: z.string().url('A valid webhook URL is required'),
  events: z.array(z.string()).min(1, 'Select at least one event'),
  isActive: z.boolean().optional(),
})

const updateSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  isActive: z.boolean().optional(),
})

router.get('/events', authenticate, async (_req: Request, res: Response) => {
  res.status(200).json({ events: WEBHOOK_EVENTS })
})

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const webhooks = await webhookService.list(organizationId)
    res.status(200).json({ webhooks })
  } catch (err) {
    logger.error(err, 'list webhooks failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list webhooks' })
  }
})

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = createSchema.parse(req.body)
    const webhook = await webhookService.create(organizationId, input)
    logger.info({ organizationId, id: webhook.id }, 'webhook created')
    res.status(201).json({ webhook })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'create webhook failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create webhook' })
  }
})

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const webhook = await webhookService.getById(organizationId, req.params.id)
    res.status(200).json({ webhook })
  } catch (err) {
    logger.error(err, 'get webhook failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get webhook' })
  }
})

router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = updateSchema.parse(req.body)
    const webhook = await webhookService.update(organizationId, req.params.id, input)
    logger.info({ organizationId, id: req.params.id }, 'webhook updated')
    res.status(200).json({ webhook })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'update webhook failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update webhook' })
  }
})

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await webhookService.remove(organizationId, req.params.id)
    logger.info({ organizationId, id: req.params.id }, 'webhook deleted')
    res.status(200).json({ message: 'Webhook deleted' })
  } catch (err) {
    logger.error(err, 'delete webhook failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete webhook' })
  }
})

router.get('/:id/deliveries', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 25
    const result = await webhookService.listDeliveries(organizationId, req.params.id, { page, pageSize })
    res.status(200).json(result)
  } catch (err) {
    logger.error(err, 'list deliveries failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list deliveries' })
  }
})

router.post('/:id/deliveries/:deliveryId/retry', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const delivery = await webhookService.retryDelivery(organizationId, req.params.deliveryId)
    logger.info({ organizationId, deliveryId: req.params.deliveryId }, 'webhook delivery retried')
    res.status(200).json({ delivery })
  } catch (err) {
    logger.error(err, 'retry delivery failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to retry delivery' })
  }
})

export default router
