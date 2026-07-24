import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { ContactManagementService } from '../services/contactManagement.service'
import { logger } from '../lib/logger'

const router = Router()
const contactManagementService = new ContactManagementService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) {
    throw new Error('No organization associated with this account')
  }
  return orgId
}

const segmentSchema = z.object({
  name: z.string().min(1, 'Segment name is required'),
  description: z.string().nullable().optional(),
  filters: z.record(z.unknown()).optional(),
})

const updateSegmentSchema = segmentSchema.partial()

// Dashboard stats
router.get('/dashboard', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const stats = await contactManagementService.getDashboardStats(organizationId)
    res.status(200).json({ stats })
  } catch (err) {
    logger.error(err, 'contact dashboard stats failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load stats' })
  }
})

// Import history
router.get('/import-history', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20
    const contactListId = typeof req.query.contactListId === 'string' ? req.query.contactListId : undefined
    const result = await contactManagementService.getImportHistory(organizationId, { page, pageSize, contactListId })
    res.status(200).json(result)
  } catch (err) {
    logger.error(err, 'import history failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load import history' })
  }
})

// List segments
router.get('/segments', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const segments = await contactManagementService.listSegments(organizationId)
    res.status(200).json({ segments })
  } catch (err) {
    logger.error(err, 'list segments failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list segments' })
  }
})

// Create segment
router.post('/segments', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = segmentSchema.parse(req.body)
    const segment = await contactManagementService.createSegment(organizationId, input)
    res.status(201).json({ segment })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'create segment failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create segment' })
  }
})

// Get segment
router.get('/segments/:segmentId', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const segment = await contactManagementService.getSegment(organizationId, req.params.segmentId)
    res.status(200).json({ segment })
  } catch (err) {
    logger.error(err, 'get segment failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get segment' })
  }
})

// Update segment
router.put('/segments/:segmentId', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = updateSegmentSchema.parse(req.body)
    const segment = await contactManagementService.updateSegment(organizationId, req.params.segmentId, input)
    res.status(200).json({ segment })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'update segment failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update segment' })
  }
})

// Delete segment
router.delete('/segments/:segmentId', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await contactManagementService.deleteSegment(organizationId, req.params.segmentId)
    res.status(200).json({ message: 'Segment deleted successfully' })
  } catch (err) {
    logger.error(err, 'delete segment failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete segment' })
  }
})

// Refresh segment members
router.post('/segments/:segmentId/refresh', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await contactManagementService.refreshSegment(organizationId, req.params.segmentId)
    res.status(200).json({ message: 'Segment refreshed successfully' })
  } catch (err) {
    logger.error(err, 'refresh segment failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to refresh segment' })
  }
})

// Get segment contacts
router.get('/segments/:segmentId/contacts', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const search = typeof req.query.search === 'string' ? req.query.search : undefined
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 25
    const result = await contactManagementService.getSegmentContacts(organizationId, req.params.segmentId, { page, pageSize, search })
    res.status(200).json(result)
  } catch (err) {
    logger.error(err, 'get segment contacts failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get segment contacts' })
  }
})

// Duplicate contacts
router.get('/duplicates', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 200
    const duplicates = await contactManagementService.getDuplicates(organizationId, status, limit)
    res.status(200).json({ duplicates })
  } catch (err) {
    logger.error(err, 'list duplicates failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list duplicates' })
  }
})

// Resolve duplicate
router.post('/duplicates/:duplicateId/resolve', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const { status } = req.body as { status: 'reviewed' | 'merged' | 'ignored' }
    if (!status) {
      return res.status(400).json({ error: 'Status is required' })
    }
    await contactManagementService.resolveDuplicate(organizationId, req.params.duplicateId, status)
    res.status(200).json({ message: 'Duplicate resolved successfully' })
  } catch (err) {
    logger.error(err, 'resolve duplicate failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to resolve duplicate' })
  }
})

// Export contacts CSV
router.get('/export', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const contactListId = typeof req.query.contactListId === 'string' ? req.query.contactListId : undefined
    const search = typeof req.query.search === 'string' ? req.query.search : undefined
    const csv = await contactManagementService.exportContacts(organizationId, { contactListId, search })
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="contacts-export.csv"')
    res.send(csv)
  } catch (err) {
    logger.error(err, 'export contacts failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to export contacts' })
  }
})

export default router
