import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { PlanService } from '../services/plan.service'
import { logger } from '../lib/logger'

const router = Router()
const planService = new PlanService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) throw new Error('No organization associated with this account')
  return orgId
}

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable().optional(),
  priceMonthly: z.number().nonnegative(),
  priceYearly: z.number().nonnegative(),
  currency: z.string().optional().default('USD'),
  limits: z.record(z.unknown()).optional().default({}),
  features: z.array(z.record(z.unknown())).optional().default([]),
  sortOrder: z.number().optional().default(0),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  priceMonthly: z.number().nonnegative().optional(),
  priceYearly: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  limits: z.record(z.unknown()).optional(),
  features: z.array(z.record(z.unknown())).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
})

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const plans = await planService.list(organizationId)
    res.status(200).json({ plans })
  } catch (err) {
    logger.error(err, 'list plans failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list plans' })
  }
})

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const plan = await planService.getById(organizationId, req.params.id)
    res.status(200).json({ plan })
  } catch (err) {
    logger.error(err, 'get plan failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get plan' })
  }
})

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = createSchema.parse(req.body)
    const plan = await planService.create(organizationId, req.user!.id, input)
    logger.info({ organizationId, id: plan.id, slug: plan.slug }, 'plan created')
    res.status(201).json({ plan })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'create plan failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create plan' })
  }
})

router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = updateSchema.parse(req.body)
    const plan = await planService.update(organizationId, req.user!.id, req.params.id, input)
    logger.info({ organizationId, id: req.params.id }, 'plan updated')
    res.status(200).json({ plan })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'update plan failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update plan' })
  }
})

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await planService.delete(organizationId, req.user!.id, req.params.id)
    logger.info({ organizationId, id: req.params.id }, 'plan deleted')
    res.status(200).json({ message: 'Plan deleted' })
  } catch (err) {
    logger.error(err, 'delete plan failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete plan' })
  }
})

export default router
