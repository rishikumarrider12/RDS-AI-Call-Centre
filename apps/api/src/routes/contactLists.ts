import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { ContactListService } from '../services/contactList.service'
import { resolveDbUserId } from '../lib/actors'
import { logger } from '../lib/logger'

const router = Router()
const contactListService = new ContactListService()

const listSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
})

const updateSchema = listSchema.partial()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) {
    throw new Error('No organization associated with this account')
  }
  return orgId
}

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const lists = await contactListService.list(organizationId)
    res.status(200).json({ lists })
  } catch (err) {
    logger.error(err, 'list contact lists failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list contact lists' })
  }
})

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = listSchema.parse(req.body)
    const createdById = await resolveDbUserId(req.user!.id)
    const list = await contactListService.create(organizationId, createdById, input)
    logger.info({ organizationId, id: list.id }, 'contact list created')
    res.status(201).json({ list })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'create contact list failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create contact list' })
  }
})

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const list = await contactListService.getById(organizationId, req.params.id)
    res.status(200).json({ list })
  } catch (err) {
    logger.error(err, 'get contact list failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get contact list' })
  }
})

router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = updateSchema.parse(req.body)
    const list = await contactListService.update(organizationId, req.params.id, input)
    logger.info({ organizationId, id: req.params.id }, 'contact list updated')
    res.status(200).json({ list })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'update contact list failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update contact list' })
  }
})

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await contactListService.delete(organizationId, req.params.id)
    logger.info({ organizationId, id: req.params.id }, 'contact list deleted')
    res.status(200).json({ message: 'Contact list deleted successfully' })
  } catch (err) {
    logger.error(err, 'delete contact list failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete contact list' })
  }
})

export default router
