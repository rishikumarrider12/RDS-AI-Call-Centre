import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { SubscriptionService } from '../services/subscription.service'
import { logger } from '../lib/logger'

const router = Router()
const subscriptionService = new SubscriptionService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) {
    throw new Error('No organization associated with this account')
  }
  return orgId
}

const createSchema = z.object({
  plan: z.enum(['starter', 'growth', 'enterprise']),
  status: z.enum(['active', 'trialing', 'past_due', 'canceled']).optional(),
  currentPeriodStart: z.string().optional(),
  currentPeriodEnd: z.string().optional(),
  trialEndsAt: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
})

const updateSchema = z.object({
  plan: z.enum(['starter', 'growth', 'enterprise']).optional(),
  status: z.enum(['active', 'trialing', 'past_due', 'canceled']).optional(),
  currentPeriodStart: z.string().optional(),
  currentPeriodEnd: z.string().optional(),
  trialEndsAt: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
})

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const subscriptions = await subscriptionService.list(organizationId)
    const current = await subscriptionService.getCurrent(organizationId)
    res.status(200).json({ subscriptions, current: current || null })
  } catch (err) {
    logger.error(err, 'list subscriptions failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list subscriptions' })
  }
})

router.get('/current', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const current = await subscriptionService.getCurrent(organizationId)
    res.status(200).json({ subscription: current || null })
  } catch (err) {
    logger.error(err, 'get current subscription failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get subscription' })
  }
})

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = createSchema.parse(req.body)
    const subscription = await subscriptionService.create(organizationId, input)
    logger.info({ organizationId, id: subscription.id, plan: input.plan }, 'subscription created')
    res.status(201).json({ subscription })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'create subscription failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create subscription' })
  }
})

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const subscription = await subscriptionService.getById(organizationId, req.params.id)
    res.status(200).json({ subscription })
  } catch (err) {
    logger.error(err, 'get subscription failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get subscription' })
  }
})

router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = updateSchema.parse(req.body)
    const subscription = await subscriptionService.update(organizationId, req.params.id, input)
    logger.info({ organizationId, id: req.params.id }, 'subscription updated')
    res.status(200).json({ subscription })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'update subscription failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update subscription' })
  }
})

router.post('/:id/cancel', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const subscription = await subscriptionService.cancel(organizationId, req.params.id)
    logger.info({ organizationId, id: req.params.id }, 'subscription canceled')
    res.status(200).json({ subscription })
  } catch (err) {
    logger.error(err, 'cancel subscription failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to cancel subscription' })
  }
})

router.post('/:id/reactivate', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const subscription = await subscriptionService.reactivate(organizationId, req.params.id)
    logger.info({ organizationId, id: req.params.id }, 'subscription reactivated')
    res.status(200).json({ subscription })
  } catch (err) {
    logger.error(err, 'reactivate subscription failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to reactivate subscription' })
  }
})

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await subscriptionService.remove(organizationId, req.params.id)
    logger.info({ organizationId, id: req.params.id }, 'subscription deleted')
    res.status(200).json({ message: 'Subscription deleted' })
  } catch (err) {
    logger.error(err, 'delete subscription failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete subscription' })
  }
})

export default router
