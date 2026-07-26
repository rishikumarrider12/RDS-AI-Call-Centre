import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { PerformanceService } from '../services/performance.service'
import { logger } from '../lib/logger'

const router = Router()
const performanceService = new PerformanceService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) throw new Error('No organization associated with this account')
  return orgId
}

const baselineSchema = z.object({
  name: z.string().min(1),
  endpoint: z.string().min(1),
  method: z.string().default('GET'),
  p50Ms: z.number().nonnegative(),
  p95Ms: z.number().nonnegative(),
  p99Ms: z.number().nonnegative(),
  maxConcurrent: z.number().int().positive().optional(),
})

// List performance baselines
router.get('/baselines', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const baselines = await performanceService.listBaselines(organizationId)
    res.status(200).json({ baselines })
  } catch (err) {
    logger.error(err, 'list performance baselines failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list baselines' })
  }
})

// Create a performance baseline
router.post('/baselines', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = baselineSchema.parse(req.body)
    const baseline = await performanceService.createBaseline(organizationId, input)
    res.status(201).json({ baseline })
  } catch (err) {
    logger.error(err, 'create performance baseline failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create baseline' })
  }
})

// Delete a baseline
router.delete('/baselines/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await performanceService.deleteBaseline(organizationId, req.params.id)
    res.status(204).send()
  } catch (err) {
    logger.error(err, 'delete performance baseline failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete baseline' })
  }
})

export default router
