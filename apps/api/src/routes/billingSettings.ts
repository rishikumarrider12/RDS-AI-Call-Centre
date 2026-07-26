import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { BillingSettingsService } from '../services/billingSettings.service'
import { logger } from '../lib/logger'

const router = Router()
const billingSettingsService = new BillingSettingsService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) throw new Error('No organization associated with this account')
  return orgId
}

const updateSchema = z.object({
  autoRecharge: z.boolean().optional(),
  autoRechargeThreshold: z.number().nonnegative().nullable().optional(),
  autoRechargeAmount: z.number().nonnegative().nullable().optional(),
  currency: z.string().optional(),
  billingEmail: z.string().email().nullable().optional(),
  companyName: z.string().nullable().optional(),
  taxId: z.string().nullable().optional(),
  address: z.record(z.unknown()).optional(),
  notificationPreferences: z.record(z.unknown()).optional(),
})

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const settings = await billingSettingsService.get(organizationId)
    res.status(200).json({ settings: settings || null })
  } catch (err) {
    logger.error(err, 'get billing settings failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load billing settings' })
  }
})

router.put('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = updateSchema.parse(req.body)
    const settings = await billingSettingsService.update(organizationId, req.user!.id, input)
    logger.info({ organizationId }, 'billing settings updated')
    res.status(200).json({ settings })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'update billing settings failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update billing settings' })
  }
})

export default router
