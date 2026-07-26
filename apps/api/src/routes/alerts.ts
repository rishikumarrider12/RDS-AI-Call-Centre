import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { AlertService } from '../services/alert.service'
import { logger } from '../lib/logger'

const router = Router()
const alertService = new AlertService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) throw new Error('No organization associated with this account')
  return orgId
}

const createRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  metric: z.string().min(1),
  condition: z.enum(['gt', 'gte', 'lt', 'lte', 'eq', 'neq']),
  threshold: z.number(),
  windowSeconds: z.number().int().positive().optional().default(60),
  severity: z.enum(['info', 'warning', 'error', 'critical']).optional().default('warning'),
  channels: z.array(z.record(z.unknown())).optional().default([]),
})

const updateRuleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  metric: z.string().min(1).optional(),
  condition: z.enum(['gt', 'gte', 'lt', 'lte', 'eq', 'neq']).optional(),
  threshold: z.number().optional(),
  windowSeconds: z.number().int().positive().optional(),
  severity: z.enum(['info', 'warning', 'error', 'critical']).optional(),
  isActive: z.boolean().optional(),
  channels: z.array(z.record(z.unknown())).optional(),
})

router.get('/rules', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const rules = await alertService.listRules(organizationId)
    res.status(200).json({ rules })
  } catch (err) {
    logger.error(err, 'list alert rules failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list alert rules' })
  }
})

router.get('/rules/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const rule = await alertService.getRule(organizationId, req.params.id)
    if (!rule) return res.status(404).json({ error: 'Alert rule not found' })
    res.status(200).json({ rule })
  } catch (err) {
    logger.error(err, 'get alert rule failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get alert rule' })
  }
})

router.post('/rules', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = createRuleSchema.parse(req.body)
    const rule = await alertService.createRule(organizationId, input)
    res.status(201).json({ rule })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    logger.error(err, 'create alert rule failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create alert rule' })
  }
})

router.put('/rules/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = updateRuleSchema.parse(req.body)
    const rule = await alertService.updateRule(organizationId, req.params.id, input)
    res.status(200).json({ rule })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    logger.error(err, 'update alert rule failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update alert rule' })
  }
})

router.delete('/rules/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await alertService.deleteRule(organizationId, req.params.id)
    res.status(200).json({ message: 'Alert rule deleted' })
  } catch (err) {
    logger.error(err, 'delete alert rule failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete alert rule' })
  }
})

router.get('/history', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    const ruleId = typeof req.query.ruleId === 'string' ? req.query.ruleId : undefined
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 25
    const result = await alertService.listHistory(organizationId, { status, ruleId, page, pageSize })
    res.status(200).json(result)
  } catch (err) {
    logger.error(err, 'list alert history failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list alert history' })
  }
})

router.post('/history', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = req.body
    const alert = await alertService.createAlert(organizationId, input)
    res.status(201).json({ alert })
  } catch (err) {
    logger.error(err, 'create alert failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create alert' })
  }
})

router.post('/history/:id/resolve', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const alert = await alertService.resolveAlert(organizationId, req.params.id)
    res.status(200).json({ alert })
  } catch (err) {
    logger.error(err, 'resolve alert failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to resolve alert' })
  }
})

export default router
