import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth'
import { TransactionService } from '../services/transaction.service'
import { logger } from '../lib/logger'

const router = Router()
const transactionService = new TransactionService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) throw new Error('No organization associated with this account')
  return orgId
}

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const type = typeof req.query.type === 'string' ? req.query.type : undefined
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 25
    const result = await transactionService.list(organizationId, { type, page, pageSize })
    res.status(200).json(result)
  } catch (err) {
    logger.error(err, 'list transactions failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list transactions' })
  }
})

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const transaction = await transactionService.getById(organizationId, req.params.id)
    res.status(200).json({ transaction })
  } catch (err) {
    logger.error(err, 'get transaction failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get transaction' })
  }
})

export default router
