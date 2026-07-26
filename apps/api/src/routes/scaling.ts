import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { ScalingService } from '../services/scaling.service'
import { logger } from '../lib/logger'

const router = Router()
const scalingService = new ScalingService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) throw new Error('No organization associated with this account')
  return orgId
}

const scalingSchema = z.object({
  minReplicas: z.number().int().positive().default(1),
  maxReplicas: z.number().int().positive().default(10),
  targetCpuPercent: z.number().int().min(1).max(100).default(60),
  targetMemoryPercent: z.number().int().min(1).max(100).default(70),
  scaleUpCooldownSeconds: z.number().int().nonnegative().default(60),
  scaleDownCooldownSeconds: z.number().int().nonnegative().default(300),
})

// Get current auto-scaling configuration
router.get('/config', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const config = await scalingService.getConfig(organizationId)
    res.status(200).json({ config })
  } catch (err) {
    logger.error(err, 'get scaling config failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load scaling config' })
  }
})

// Update auto-scaling configuration
router.put('/config', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = scalingSchema.parse(req.body)
    const config = await scalingService.upsertConfig(organizationId, input)
    res.status(200).json({ config })
  } catch (err) {
    logger.error(err, 'update scaling config failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update scaling config' })
  }
})

// Get scaling metrics / recommendations
router.get('/metrics', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const metrics = await scalingService.getMetrics(organizationId)
    res.status(200).json({ metrics })
  } catch (err) {
    logger.error(err, 'get scaling metrics failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load scaling metrics' })
  }
})

export default router
