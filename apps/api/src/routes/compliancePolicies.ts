import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { CompliancePolicyService } from '../services/compliancePolicy.service'
import { logger } from '../lib/logger'

const router = Router()
const service = new CompliancePolicyService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) throw new Error('No organization associated with this account')
  return orgId
}

const createSchema = z.object({
  name: z.string().min(1),
  framework: z.enum(['GDPR', 'SOC2', 'ISO27001', 'HIPAA', 'PCI-DSS', 'OTHER']),
  description: z.string().nullable().optional(),
  requirements: z.array(z.record(z.unknown())).optional().default([]),
  controls: z.array(z.record(z.unknown())).optional().default([]),
  status: z.enum(['draft', 'active', 'archived']).optional().default('draft'),
  effectiveAt: z.string().nullable().optional(),
  reviewedAt: z.string().nullable().optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  framework: z.enum(['GDPR', 'SOC2', 'ISO27001', 'HIPAA', 'PCI-DSS', 'OTHER']).optional(),
  description: z.string().nullable().optional(),
  requirements: z.array(z.record(z.unknown())).optional(),
  controls: z.array(z.record(z.unknown())).optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  effectiveAt: z.string().nullable().optional(),
  reviewedAt: z.string().nullable().optional(),
})

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const policies = await service.list(organizationId)
    res.status(200).json({ policies })
  } catch (err) {
    logger.error(err, 'list compliance policies failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list compliance policies' })
  }
})

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const policy = await service.getById(organizationId, req.params.id)
    res.status(200).json({ policy })
  } catch (err) {
    logger.error(err, 'get compliance policy failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get compliance policy' })
  }
})

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = createSchema.parse(req.body)
    const policy = await service.create(organizationId, req.user!.id, input)
    logger.info({ organizationId, id: policy.id }, 'compliance policy created')
    res.status(201).json({ policy })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    logger.error(err, 'create compliance policy failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create compliance policy' })
  }
})

router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = updateSchema.parse(req.body)
    const policy = await service.update(organizationId, req.user!.id, req.params.id, input)
    logger.info({ organizationId, id: req.params.id }, 'compliance policy updated')
    res.status(200).json({ policy })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    logger.error(err, 'update compliance policy failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update compliance policy' })
  }
})

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await service.delete(organizationId, req.user!.id, req.params.id)
    logger.info({ organizationId, id: req.params.id }, 'compliance policy deleted')
    res.status(200).json({ message: 'Compliance policy deleted' })
  } catch (err) {
    logger.error(err, 'delete compliance policy failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete compliance policy' })
  }
})

export default router
