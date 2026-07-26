import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { CouponService } from '../services/coupon.service'
import { logger } from '../lib/logger'

const router = Router()
const couponService = new CouponService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) throw new Error('No organization associated with this account')
  return orgId
}

const createSchema = z.object({
  code: z.string().min(1),
  description: z.string().nullable().optional(),
  discountType: z.enum(['percentage', 'fixed', 'free_trial']),
  discountValue: z.number().nonnegative(),
  currency: z.string().optional().default('USD'),
  maxRedemptions: z.number().int().positive().nullable().optional(),
  validFrom: z.string().nullable().optional(),
  validUntil: z.string().nullable().optional(),
  appliesToPlan: z.string().nullable().optional(),
})

const updateSchema = z.object({
  code: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  discountType: z.enum(['percentage', 'fixed', 'free_trial']).optional(),
  discountValue: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  maxRedemptions: z.number().int().positive().nullable().optional(),
  validFrom: z.string().nullable().optional(),
  validUntil: z.string().nullable().optional(),
  appliesToPlan: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const coupons = await couponService.list(organizationId)
    res.status(200).json({ coupons })
  } catch (err) {
    logger.error(err, 'list coupons failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list coupons' })
  }
})

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const coupon = await couponService.getById(organizationId, req.params.id)
    res.status(200).json({ coupon })
  } catch (err) {
    logger.error(err, 'get coupon failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get coupon' })
  }
})

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = createSchema.parse(req.body)
    const coupon = await couponService.create(organizationId, req.user!.id, input)
    logger.info({ organizationId, id: coupon.id, code: coupon.code }, 'coupon created')
    res.status(201).json({ coupon })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'create coupon failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create coupon' })
  }
})

router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = updateSchema.parse(req.body)
    const coupon = await couponService.update(organizationId, req.user!.id, req.params.id, input)
    logger.info({ organizationId, id: req.params.id }, 'coupon updated')
    res.status(200).json({ coupon })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'update coupon failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update coupon' })
  }
})

router.post('/:id/validate', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const { planSlug } = req.body as { planSlug?: string }
    const result = await couponService.validate(organizationId, req.params.id, planSlug)
    res.status(200).json(result)
  } catch (err) {
    logger.error(err, 'validate coupon failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to validate coupon' })
  }
})

router.post('/:id/redeem', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const coupon = await couponService.redeem(organizationId, req.user!.id, req.params.id)
    logger.info({ organizationId, id: req.params.id, code: coupon.code }, 'coupon redeemed')
    res.status(200).json({ coupon })
  } catch (err) {
    logger.error(err, 'redeem coupon failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to redeem coupon' })
  }
})

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await couponService.delete(organizationId, req.user!.id, req.params.id)
    logger.info({ organizationId, id: req.params.id }, 'coupon deleted')
    res.status(200).json({ message: 'Coupon deleted' })
  } catch (err) {
    logger.error(err, 'delete coupon failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete coupon' })
  }
})

export default router
