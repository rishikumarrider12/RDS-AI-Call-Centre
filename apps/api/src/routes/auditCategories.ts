import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { AuditCategoryService } from '../services/auditCategory.service'
import { logger } from '../lib/logger'

const router = Router()
const service = new AuditCategoryService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) throw new Error('No organization associated with this account')
  return orgId
}

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable().optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional().default(true),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
})

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const categories = await service.list(organizationId)
    res.status(200).json({ categories })
  } catch (err) {
    logger.error(err, 'list audit categories failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list audit categories' })
  }
})

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const category = await service.getById(organizationId, req.params.id)
    res.status(200).json({ category })
  } catch (err) {
    logger.error(err, 'get audit category failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get audit category' })
  }
})

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = createSchema.parse(req.body)
    const category = await service.create(organizationId, req.user!.id, input)
    logger.info({ organizationId, id: category.id }, 'audit category created')
    res.status(201).json({ category })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    logger.error(err, 'create audit category failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create audit category' })
  }
})

router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = updateSchema.parse(req.body)
    const category = await service.update(organizationId, req.user!.id, req.params.id, input)
    logger.info({ organizationId, id: req.params.id }, 'audit category updated')
    res.status(200).json({ category })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    logger.error(err, 'update audit category failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update audit category' })
  }
})

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await service.delete(organizationId, req.user!.id, req.params.id)
    logger.info({ organizationId, id: req.params.id }, 'audit category deleted')
    res.status(200).json({ message: 'Audit category deleted' })
  } catch (err) {
    logger.error(err, 'delete audit category failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete audit category' })
  }
})

export default router
