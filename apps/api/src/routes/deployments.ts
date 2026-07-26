import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { DeploymentService } from '../services/health.service'
import { logger } from '../lib/logger'

const router = Router()
const deploymentService = new DeploymentService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) throw new Error('No organization associated with this account')
  return orgId
}

const createSchema = z.object({
  environment: z.enum(['staging', 'production', 'preview']),
  version: z.string().min(1),
  commitSha: z.string().nullable().optional(),
  rollbackOfId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).optional().default({}),
})

const updateSchema = z.object({
  status: z.enum(['pending', 'deploying', 'success', 'failed', 'rolled_back']).optional(),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
})

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const environment = typeof req.query.environment === 'string' ? req.query.environment : undefined
    const deployments = await deploymentService.listDeployments(organizationId, environment)
    res.status(200).json({ deployments })
  } catch (err) {
    logger.error(err, 'list deployments failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list deployments' })
  }
})

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const deployment = await deploymentService.getDeployment(organizationId, req.params.id)
    if (!deployment) return res.status(404).json({ error: 'Deployment not found' })
    res.status(200).json({ deployment })
  } catch (err) {
    logger.error(err, 'get deployment failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get deployment' })
  }
})

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = createSchema.parse(req.body)
    const deployment = await deploymentService.createDeployment(organizationId, {
      ...input,
      deployedById: req.user!.id,
    })
    res.status(201).json({ deployment })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    logger.error(err, 'create deployment failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create deployment' })
  }
})

router.patch('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = updateSchema.parse(req.body)
    const deployment = await deploymentService.updateDeploymentStatus(organizationId, req.params.id, input.status ?? 'pending', input)
    res.status(200).json({ deployment })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    logger.error(err, 'update deployment failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update deployment' })
  }
})

export default router
