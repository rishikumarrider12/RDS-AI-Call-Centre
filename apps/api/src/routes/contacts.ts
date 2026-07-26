import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { ContactService } from '../services/contact.service'
import { logger } from '../lib/logger'

const router = Router()
const contactService = new ContactService()

const contactInputSchema = z.object({
  contactListId: z.string().uuid().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  phone: z.string().min(1, 'Phone is required'),
  country: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  dndStatus: z.boolean().optional(),
  source: z.string().nullable().optional(),
})

const updateSchema = contactInputSchema.partial()

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
})

const bulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  data: z.object({
    contactListId: z.string().uuid().nullable().optional(),
    tags: z.array(z.string()).optional(),
    dndStatus: z.boolean().optional(),
  }),
})

const importSchema = z.object({
  csv: z.string().min(1, 'CSV content is required'),
  contactListId: z.string().uuid().nullable().optional(),
  skipDuplicates: z.boolean().optional().default(true),
})

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) {
    throw new Error('No organization associated with this account')
  }
  return orgId
}

// List contacts (search, filter by list, pagination)
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const search = typeof req.query.search === 'string' ? req.query.search : undefined
    const contactListId = typeof req.query.contactListId === 'string' ? req.query.contactListId : undefined
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 10
    const result = await contactService.list(organizationId, { search, contactListId, page, pageSize })
    res.status(200).json(result)
  } catch (err) {
    logger.error(err, 'list contacts failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list contacts' })
  }
})

// CSV import (must be declared before /:id)
router.post('/import', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = importSchema.parse(req.body)
    const result = await contactService.importCsv(organizationId, input.csv, {
      contactListId: input.contactListId ?? null,
      skipDuplicates: input.skipDuplicates,
    })
    logger.info({ organizationId, inserted: result.inserted }, 'contacts imported')
    res.status(200).json(result)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'csv import failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to import contacts' })
  }
})

// Bulk delete
router.post('/bulk-delete', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const { ids } = bulkDeleteSchema.parse(req.body)
    const count = await contactService.bulkDelete(organizationId, ids)
    logger.info({ organizationId, count }, 'contacts bulk deleted')
    res.status(200).json({ message: `Deleted ${count} contact(s)`, deleted: count })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'bulk delete contacts failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete contacts' })
  }
})

// Bulk update
router.post('/bulk-update', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const { ids, data } = bulkUpdateSchema.parse(req.body)
    const count = await contactService.bulkUpdate(organizationId, ids, data)
    logger.info({ organizationId, count }, 'contacts bulk updated')
    res.status(200).json({ message: `Updated ${count} contact(s)`, updated: count })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'bulk update contacts failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update contacts' })
  }
})

// Create contact
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = contactInputSchema.parse(req.body)
    const contact = await contactService.create(organizationId, input)
    logger.info({ organizationId, id: contact.id }, 'contact created')
    res.status(201).json({ contact })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'create contact failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create contact' })
  }
})

// Get single contact
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const contact = await contactService.getById(organizationId, req.params.id)
    res.status(200).json({ contact })
  } catch (err) {
    logger.error(err, 'get contact failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get contact' })
  }
})

// Update contact
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = updateSchema.parse(req.body)
    const contact = await contactService.update(organizationId, req.params.id, input)
    logger.info({ organizationId, id: req.params.id }, 'contact updated')
    res.status(200).json({ contact })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'update contact failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update contact' })
  }
})

// Delete contact
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await contactService.delete(organizationId, req.params.id)
    logger.info({ organizationId, id: req.params.id }, 'contact deleted')
    res.status(200).json({ message: 'Contact deleted successfully' })
  } catch (err) {
    logger.error(err, 'delete contact failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete contact' })
  }
})

export default router
