import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { ComplianceService } from '../services/compliance.service'
import { logger } from '../lib/logger'
import { DEFAULT_DISCLOSURE_TEXT } from '../services/compliance.service'

const router = Router()
const complianceService = new ComplianceService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) {
    throw new Error('No organization associated with this account')
  }
  return orgId
}

function actor(req: Request) {
  return {
    actorId: req.user?.id ?? null,
    actorName: req.user?.fullName ?? null,
    actorEmail: req.user?.email ?? null,
  }
}

function clientIp(req: Request): string | null {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim()
  return req.socket.remoteAddress ?? null
}

const consentSchema = z.object({
  contactId: z.string().uuid().nullable().optional(),
  campaignId: z.string().uuid().nullable().optional(),
  callId: z.string().uuid().nullable().optional(),
  consented: z.boolean().optional(),
  method: z
    .enum(['verbal', 'ivr', 'keypress', 'written', 'automated_disclosure'])
    .optional(),
  disclosureText: z.string().nullable().optional(),
})

const dndSchema = z.object({
  phone: z.string().min(3),
  source: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
})

const retentionSchema = z.object({
  resourceType: z.string().min(1),
  retentionDays: z.number().int().min(0),
  action: z.enum(['anonymize', 'delete']).optional(),
})

// Status overview
router.get('/status', authenticate, async (req: Request, res: Response) => {
  try {
    const status = await complianceService.getStatus(requireOrg(req))
    res.status(200).json({ status })
  } catch (err) {
    logger.error(err, 'get compliance status failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load compliance status' })
  }
})

router.get('/disclosure-text', authenticate, (_req: Request, res: Response) => {
  res.status(200).json({ text: DEFAULT_DISCLOSURE_TEXT })
})

// Consent (5.4)
router.post('/consent', authenticate, async (req: Request, res: Response) => {
  try {
    const input = consentSchema.parse(req.body)
    const record = await complianceService.recordConsent({
      organizationId: requireOrg(req),
      ...actor(req),
      ...input,
      ipAddress: clientIp(req),
    })
    res.status(201).json({ record })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    logger.error(err, 'record consent failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to record consent' })
  }
})

router.get('/consent', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const contactId = typeof req.query.contactId === 'string' ? req.query.contactId : undefined
    if (!contactId) return res.status(400).json({ error: 'contactId query parameter is required' })
    const records = await complianceService.getConsentForContact(organizationId, contactId)
    res.status(200).json({ records })
  } catch (err) {
    logger.error(err, 'list consent failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list consent records' })
  }
})

// DND registry (5.5)
router.get('/dnd', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const search = typeof req.query.search === 'string' ? req.query.search : undefined
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 25
    const result = await complianceService.listDnd(organizationId, { search, page, pageSize })
    res.status(200).json(result)
  } catch (err) {
    logger.error(err, 'list dnd failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list DND entries' })
  }
})

router.get('/dnd/check', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const phone = typeof req.query.phone === 'string' ? req.query.phone : undefined
    if (!phone) return res.status(400).json({ error: 'phone query parameter is required' })
    const result = await complianceService.checkDnd(organizationId, phone)
    res.status(200).json(result)
  } catch (err) {
    logger.error(err, 'check dnd failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to check DND' })
  }
})

router.post('/dnd', authenticate, async (req: Request, res: Response) => {
  try {
    const input = dndSchema.parse(req.body)
    const entry = await complianceService.addDnd({
      organizationId: requireOrg(req),
      ...actor(req),
      phone: input.phone,
      source: input.source ?? 'manual',
      reason: input.reason,
    })
    res.status(201).json({ entry })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    logger.error(err, 'add dnd failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to add DND entry' })
  }
})

router.delete('/dnd/:phone', authenticate, async (req: Request, res: Response) => {
  try {
    await complianceService.removeDnd({
      organizationId: requireOrg(req),
      ...actor(req),
      phone: decodeURIComponent(req.params.phone),
    })
    res.status(200).json({ message: 'DND entry removed' })
  } catch (err) {
    logger.error(err, 'remove dnd failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to remove DND entry' })
  }
})

// Retention policies (5.8)
router.get('/retention', authenticate, async (req: Request, res: Response) => {
  try {
    const policies = await complianceService.getRetentionPolicies(requireOrg(req))
    res.status(200).json({ policies })
  } catch (err) {
    logger.error(err, 'list retention failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list retention policies' })
  }
})

router.put('/retention', authenticate, async (req: Request, res: Response) => {
  try {
    const input = retentionSchema.parse(req.body)
    const policy = await complianceService.upsertRetentionPolicy({
      organizationId: requireOrg(req),
      ...actor(req),
      ...input,
    })
    res.status(200).json({ policy })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    logger.error(err, 'upsert retention failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to save retention policy' })
  }
})

// Data subject requests (5.9)
router.post('/data-export', authenticate, async (req: Request, res: Response) => {
  try {
    const request = await complianceService.requestExport({
      organizationId: requireOrg(req),
      requestedBy: req.user?.id ?? '',
    })
    res.status(201).json({ request })
  } catch (err) {
    logger.error(err, 'request export failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to request data export' })
  }
})

router.get('/data-export/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const request = await complianceService.getExport(requireOrg(req), req.params.id)
    if (!request) return res.status(404).json({ error: 'Export request not found' })
    res.status(200).json({ request })
  } catch (err) {
    logger.error(err, 'get export failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load export request' })
  }
})

router.post('/data-deletion', authenticate, async (req: Request, res: Response) => {
  try {
    const scope = typeof req.body?.scope === 'string' ? req.body.scope : null
    const request = await complianceService.requestDeletion({
      organizationId: requireOrg(req),
      requestedBy: req.user?.id ?? '',
      scope,
    })
    res.status(201).json({ request })
  } catch (err) {
    logger.error(err, 'request deletion failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to request data deletion' })
  }
})

router.get('/data-deletion/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const request = await complianceService.getDeletion(requireOrg(req), req.params.id)
    if (!request) return res.status(404).json({ error: 'Deletion request not found' })
    res.status(200).json({ request })
  } catch (err) {
    logger.error(err, 'get deletion failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load deletion request' })
  }
})

// Audit summary (5.6)
router.get('/audit-summary', authenticate, async (req: Request, res: Response) => {
  try {
    const summary = await complianceService.getAuditSummary(requireOrg(req))
    res.status(200).json({ summary })
  } catch (err) {
    logger.error(err, 'audit summary failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load audit summary' })
  }
})

export default router
