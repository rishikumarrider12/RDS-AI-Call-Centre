import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { AccessReviewService } from '../services/accessReview.service'
import { logger } from '../lib/logger'

const router = Router()
const service = new AccessReviewService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) throw new Error('No organization associated with this account')
  return orgId
}

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  reviewerId: z.string().uuid().nullable().optional(),
  status: z.enum(['open', 'in_progress', 'completed', 'archived']).optional().default('open'),
  dueAt: z.string().nullable().optional(),
})

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  reviewerId: z.string().uuid().nullable().optional(),
  status: z.enum(['open', 'in_progress', 'completed', 'archived']).optional(),
  dueAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
})

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const reviews = await service.list(organizationId)
    res.status(200).json({ reviews })
  } catch (err) {
    logger.error(err, 'list access reviews failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list access reviews' })
  }
})

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const review = await service.getById(organizationId, req.params.id)
    res.status(200).json({ review })
  } catch (err) {
    logger.error(err, 'get access review failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get access review' })
  }
})

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = createSchema.parse(req.body)
    const review = await service.create(organizationId, req.user!.id, input)
    logger.info({ organizationId, id: review.id }, 'access review created')
    res.status(201).json({ review })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    logger.error(err, 'create access review failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create access review' })
  }
})

router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = updateSchema.parse(req.body)
    const review = await service.update(organizationId, req.user!.id, req.params.id, input)
    logger.info({ organizationId, id: req.params.id }, 'access review updated')
    res.status(200).json({ review })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    logger.error(err, 'update access review failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update access review' })
  }
})

router.post('/:id/complete', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const review = await service.complete(organizationId, req.user!.id, req.params.id)
    logger.info({ organizationId, id: req.params.id }, 'access review completed')
    res.status(200).json({ review })
  } catch (err) {
    logger.error(err, 'complete access review failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to complete access review' })
  }
})

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await service.delete(organizationId, req.user!.id, req.params.id)
    logger.info({ organizationId, id: req.params.id }, 'access review deleted')
    res.status(200).json({ message: 'Access review deleted' })
  } catch (err) {
    logger.error(err, 'delete access review failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete access review' })
  }
})

export default router
