import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { CostService } from '../services/cost.service'
import { logger } from '../lib/logger'

const router = Router()
const costService = new CostService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) {
    throw new Error('No organization associated with this account')
  }
  return orgId
}

const dateRangeSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
})

// Cost dashboard: summary + budgets + recent alerts + usage (6.2)
router.get('/dashboard', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const dashboard = await costService.getDashboard(organizationId)
    res.status(200).json(dashboard)
  } catch (err) {
    logger.error(err, 'cost dashboard failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load cost dashboard' })
  }
})

// Cost summary (optionally date-bound)
router.get('/summary', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const parsed = dateRangeSchema.parse({
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    })
    const result = await costService.getCostSummary(organizationId, {
      dateFrom: parsed.dateFrom,
      dateTo: parsed.dateTo,
    })
    res.status(200).json(result)
  } catch (err) {
    logger.error(err, 'cost summary failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load cost summary' })
  }
})

// Cost records list (paginated, filterable)
router.get('/records', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const parsed = dateRangeSchema.parse({
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      category: req.query.category,
      page: req.query.page,
      pageSize: req.query.pageSize,
    })
    const result = await costService.listCosts(organizationId, {
      dateFrom: parsed.dateFrom,
      dateTo: parsed.dateTo,
      category: parsed.category,
      page: parsed.page,
      pageSize: parsed.pageSize,
    })
    res.status(200).json(result)
  } catch (err) {
    logger.error(err, 'list cost records failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list cost records' })
  }
})

// Usage accounting list (paginated, date-bound)
router.get('/usage', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const parsed = dateRangeSchema.parse({
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      page: req.query.page,
      pageSize: req.query.pageSize,
    })
    const result = await costService.listUsage(organizationId, {
      dateFrom: parsed.dateFrom,
      dateTo: parsed.dateTo,
      page: parsed.page,
      pageSize: parsed.pageSize,
    })
    res.status(200).json(result)
  } catch (err) {
    logger.error(err, 'list cost usage failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list cost usage' })
  }
})

// ---- Budgets (6.3) ----

router.get('/budgets', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const budgets = await costService.listBudgets(organizationId)
    const statuses = await costService.getBudgetStatuses(organizationId)
    res.status(200).json({ budgets, statuses })
  } catch (err) {
    logger.error(err, 'list budgets failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list budgets' })
  }
})

const budgetSchema = z.object({
  category: z.enum(['total', 'telephony', 'ai', 'stt', 'tts', 'storage', 'other']),
  period: z.enum(['monthly', 'daily']).optional().default('monthly'),
  limitAmount: z.number().nonnegative(),
  currency: z.string().optional().default('USD'),
  warnThreshold: z.number().min(0).max(1).optional(),
  alertThreshold: z.number().min(0).max(1).optional(),
  enabled: z.boolean().optional(),
})

router.post('/budgets', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = budgetSchema.parse(req.body)
    const budget = await costService.upsertBudget(organizationId, input)
    res.status(201).json({ budget })
  } catch (err) {
    logger.error(err, 'create budget failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create budget' })
  }
})

router.put('/budgets/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = budgetSchema.partial().parse(req.body)
    // Re-use upsert semantics by reading the existing budget then upserting.
    const budgets = await costService.listBudgets(organizationId)
    const existing = budgets.find((b) => b.id === req.params.id)
    if (!existing) {
      res.status(404).json({ error: 'Budget not found' })
      return
    }
    const budget = await costService.upsertBudget(organizationId, {
      category: existing.category,
      period: existing.period,
      ...input,
      limitAmount: input.limitAmount ?? existing.limitAmount,
    })
    res.status(200).json({ budget })
  } catch (err) {
    logger.error(err, 'update budget failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update budget' })
  }
})

router.delete('/budgets/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await costService.deleteBudget(organizationId, req.params.id)
    res.status(204).send()
  } catch (err) {
    logger.error(err, 'delete budget failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete budget' })
  }
})

// Evaluate all budgets now and return any alerts raised (6.3)
router.post('/budgets/evaluate', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const alerts = await costService.evaluateAllBudgets(organizationId)
    res.status(200).json({ alerts })
  } catch (err) {
    logger.error(err, 'evaluate budgets failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to evaluate budgets' })
  }
})

// ---- Spending alerts (6.3) ----

router.get('/alerts', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 25
    const result = await costService.listAlerts(organizationId, { page, pageSize })
    res.status(200).json(result)
  } catch (err) {
    logger.error(err, 'list spending alerts failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list spending alerts' })
  }
})

export default router
