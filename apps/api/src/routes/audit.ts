import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { AuditService } from '../services/audit.service'
import { sendCsv, sendJson } from '../lib/export'
import { logger } from '../lib/logger'

const router = Router()
const auditService = new AuditService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) {
    throw new Error('No organization associated with this account')
  }
  return orgId
}

const exportSchema = z.object({
  format: z.enum(['csv', 'json']).optional().default('csv'),
  action: z.string().optional(),
  actorType: z.string().optional(),
  resourceType: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const action = typeof req.query.action === 'string' ? req.query.action : undefined
    const actorType = typeof req.query.actorType === 'string' ? req.query.actorType : undefined
    const resourceType = typeof req.query.resourceType === 'string' ? req.query.resourceType : undefined
    const search = typeof req.query.search === 'string' ? req.query.search : undefined
    const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined
    const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 25
    const result = await auditService.list(organizationId, {
      action,
      actorType,
      resourceType,
      search,
      dateFrom,
      dateTo,
      page,
      pageSize,
    })
    res.status(200).json(result)
  } catch (err) {
    logger.error(err, 'list audit logs failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list audit logs' })
  }
})

router.get('/actions', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const actions = await auditService.distinctActions(organizationId)
    res.status(200).json({ actions })
  } catch (err) {
    logger.error(err, 'list audit actions failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list audit actions' })
  }
})

router.get('/export', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const parsed = exportSchema.parse({
      format: req.query.format,
      action: req.query.action,
      actorType: req.query.actorType,
      resourceType: req.query.resourceType,
      search: req.query.search,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    })
    const rows = await auditService.exportRows(organizationId, {
      action: parsed.action,
      actorType: parsed.actorType,
      resourceType: parsed.resourceType,
      search: parsed.search,
      dateFrom: parsed.dateFrom,
      dateTo: parsed.dateTo,
    })

    const flat = rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      action: r.action,
      actorType: r.actorType,
      actorName: r.actorName ?? '',
      actorEmail: r.actorEmail ?? '',
      resourceType: r.resourceType ?? '',
      resourceId: r.resourceId ?? '',
      ipAddress: r.ipAddress ?? '',
      hasChanges: r.before || r.after ? 'yes' : 'no',
    }))

    const columns = [
      { key: 'id', header: 'ID' },
      { key: 'createdAt', header: 'Timestamp' },
      { key: 'action', header: 'Action' },
      { key: 'actorType', header: 'Actor Type' },
      { key: 'actorName', header: 'Actor' },
      { key: 'actorEmail', header: 'Actor Email' },
      { key: 'resourceType', header: 'Resource Type' },
      { key: 'resourceId', header: 'Resource ID' },
      { key: 'ipAddress', header: 'IP Address' },
      { key: 'hasChanges', header: 'Has Changes' },
    ]

    const stamp = new Date().toISOString().slice(0, 10)
    if (parsed.format === 'json') {
      return sendJson(res, `audit-logs-${stamp}.json`, flat)
    }
    return sendCsv(res, `audit-logs-${stamp}.csv`, flat, columns)
  } catch (err) {
    logger.error(err, 'export audit logs failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to export audit logs' })
  }
})

export default router
