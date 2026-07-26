import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { FeatureFlagService } from '../services/featureFlag.service'
import { logger } from '../lib/logger'

const router = Router()
const featureFlagService = new FeatureFlagService()

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  environment: z.enum(['development', 'staging', 'production']),
  organizationId: z.string().uuid().nullable().optional(),
  rolloutPercentage: z.number().int().min(0).max(100).default(100),
  enabled: z.boolean().default(true),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  environment: z.enum(['development', 'staging', 'production']).optional(),
  organizationId: z.string().uuid().nullable().optional(),
  rolloutPercentage: z.number().int().min(0).max(100).optional(),
  enabled: z.boolean().optional(),
})

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined
    const filters: Parameters<typeof featureFlagService.list>[0] = {
      environment: (req.query.environment as string) || undefined,
      status: status === 'enabled' || status === 'disabled' ? status : undefined,
      organizationId: (req.query.organizationId as string) || undefined,
      search: (req.query.search as string) || undefined,
    }
    const flags = await featureFlagService.list(filters)
    res.status(200).json({ flags })
  } catch (err) {
    logger.error(err, 'list feature flags failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list feature flags' })
  }
})

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const flag = await featureFlagService.getById(req.params.id)
    if (!flag) {
      return res.status(404).json({ error: 'Feature flag not found' })
    }
    res.status(200).json({ flag })
  } catch (err) {
    logger.error(err, 'get feature flag failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get feature flag' })
  }
})

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const input = createSchema.parse(req.body)
    const flag = await featureFlagService.create(input)
    res.status(201).json({ flag })
  } catch (err) {
    logger.error(err, 'create feature flag failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create feature flag' })
  }
})

router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const input = updateSchema.parse(req.body)
    const flag = await featureFlagService.update(req.params.id, input)
    res.status(200).json({ flag })
  } catch (err) {
    logger.error(err, 'update feature flag failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update feature flag' })
  }
})

router.patch('/:id/toggle', authenticate, async (req: Request, res: Response) => {
  try {
    const existing = await featureFlagService.getById(req.params.id)
    if (!existing) {
      return res.status(404).json({ error: 'Feature flag not found' })
    }
    const flag = await featureFlagService.update(req.params.id, { enabled: !existing.enabled })
    res.status(200).json({ flag })
  } catch (err) {
    logger.error(err, 'toggle feature flag failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to toggle feature flag' })
  }
})

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    await featureFlagService.delete(req.params.id)
    res.status(204).send()
  } catch (err) {
    logger.error(err, 'delete feature flag failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete feature flag' })
  }
})

export default router
