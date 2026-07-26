import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { SecurityIncidentService } from '../services/securityIncident.service'
import { logger } from '../lib/logger'

const router = Router()
const service = new SecurityIncidentService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) throw new Error('No organization associated with this account')
  return orgId
}

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  reportedBy: z.string().uuid().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  occurredAt: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional().default({}),
})

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['open', 'investigating', 'resolved', 'closed']).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  occurredAt: z.string().nullable().optional(),
  resolvedAt: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
})

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const incidents = await service.list(organizationId)
    res.status(200).json({ incidents })
  } catch (err) {
    logger.error(err, 'list security incidents failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list security incidents' })
  }
})

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const incident = await service.getById(organizationId, req.params.id)
    res.status(200).json({ incident })
  } catch (err) {
    logger.error(err, 'get security incident failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get security incident' })
  }
})

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = createSchema.parse(req.body)
    const incident = await service.create(organizationId, req.user!.id, input)
    logger.info({ organizationId, id: incident.id }, 'security incident reported')
    res.status(201).json({ incident })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    logger.error(err, 'create security incident failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to report security incident' })
  }
})

router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = updateSchema.parse(req.body)
    const incident = await service.update(organizationId, req.user!.id, req.params.id, input)
    logger.info({ organizationId, id: req.params.id }, 'security incident updated')
    res.status(200).json({ incident })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    logger.error(err, 'update security incident failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update security incident' })
  }
})

router.post('/:id/resolve', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const incident = await service.resolve(organizationId, req.user!.id, req.params.id)
    logger.info({ organizationId, id: req.params.id }, 'security incident resolved')
    res.status(200).json({ incident })
  } catch (err) {
    logger.error(err, 'resolve security incident failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to resolve security incident' })
  }
})

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await service.delete(organizationId, req.user!.id, req.params.id)
    logger.info({ organizationId, id: req.params.id }, 'security incident deleted')
    res.status(200).json({ message: 'Security incident deleted' })
  } catch (err) {
    logger.error(err, 'delete security incident failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete security incident' })
  }
})

export default router
