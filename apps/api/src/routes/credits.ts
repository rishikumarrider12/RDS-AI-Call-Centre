import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { CreditService } from '../services/credit.service'
import { logger } from '../lib/logger'

const router = Router()
const creditService = new CreditService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) throw new Error('No organization associated with this account')
  return orgId
}

const createSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().optional().default('USD'),
  reason: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
})

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const credits = await creditService.list(organizationId)
    const balance = await creditService.getBalance(organizationId)
    res.status(200).json({ credits, balance })
  } catch (err) {
    logger.error(err, 'list credits failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list credits' })
  }
})

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const credit = await creditService.getById(organizationId, req.params.id)
    res.status(200).json({ credit })
  } catch (err) {
    logger.error(err, 'get credit failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get credit' })
  }
})

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = createSchema.parse(req.body)
    const credit = await creditService.create(organizationId, req.user!.id, input)
    logger.info({ organizationId, id: credit.id, amount: credit.amount }, 'credit created')
    res.status(201).json({ credit })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'create credit failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create credit' })
  }
})

router.post('/:id/apply', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const { invoiceId, amount } = req.body as { invoiceId: string; amount: number }
    if (!invoiceId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'invoiceId and positive amount are required' })
    }
    const result = await creditService.apply(organizationId, req.user!.id, req.params.id, invoiceId, amount)
    res.status(200).json(result)
  } catch (err) {
    logger.error(err, 'apply credit failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to apply credit' })
  }
})

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await creditService.delete(organizationId, req.user!.id, req.params.id)
    logger.info({ organizationId, id: req.params.id }, 'credit deleted')
    res.status(200).json({ message: 'Credit deleted' })
  } catch (err) {
    logger.error(err, 'delete credit failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete credit' })
  }
})

export default router
