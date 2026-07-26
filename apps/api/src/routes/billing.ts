import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { BillingService } from '../services/billing.service'
import { sendCsv, sendJson } from '../lib/export'
import { logger } from '../lib/logger'

const router = Router()
const billingService = new BillingService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) {
    throw new Error('No organization associated with this account')
  }
  return orgId
}

const exportSchema = z.object({
  format: z.enum(['csv', 'json']).optional().default('csv'),
  resource: z.enum(['invoices', 'usage']).optional().default('invoices'),
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const dashboard = await billingService.getDashboard(organizationId)
    res.status(200).json(dashboard)
  } catch (err) {
    logger.error(err, 'billing dashboard failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load billing dashboard' })
  }
})

router.get('/invoices', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 25
    const result = await billingService.listInvoices(organizationId, { status, page, pageSize })
    res.status(200).json(result)
  } catch (err) {
    logger.error(err, 'list invoices failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list invoices' })
  }
})

router.get('/invoices/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const invoice = await billingService.getInvoice(organizationId, req.params.id)
    res.status(200).json({ invoice })
  } catch (err) {
    logger.error(err, 'get invoice failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get invoice' })
  }
})

router.get('/usage', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined
    const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 31
    const result = await billingService.listUsage(organizationId, { dateFrom, dateTo, page, pageSize })
    res.status(200).json(result)
  } catch (err) {
    logger.error(err, 'list usage failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list usage' })
  }
})

router.get('/export', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const parsed = exportSchema.parse({
      format: req.query.format,
      resource: req.query.resource,
      status: req.query.status,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    })

    const stamp = new Date().toISOString().slice(0, 10)

    if (parsed.resource === 'usage') {
      const result = await billingService.listUsage(organizationId, {
        dateFrom: parsed.dateFrom,
        dateTo: parsed.dateTo,
        pageSize: 1000,
      })
      const flat = result.data.map((u) => ({
        date: u.recordDate,
        aiMinutes: u.aiMinutes,
        telephonyMinutes: u.telephonyMinutes,
        sttMinutes: u.sttMinutes,
        ttsCharacters: u.ttsCharacters,
        calls: u.callsCount,
        storageBytes: u.storageBytes,
      }))
      const columns = [
        { key: 'date', header: 'Date' },
        { key: 'aiMinutes', header: 'AI Minutes' },
        { key: 'telephonyMinutes', header: 'Telephony Minutes' },
        { key: 'sttMinutes', header: 'STT Minutes' },
        { key: 'ttsCharacters', header: 'TTS Characters' },
        { key: 'calls', header: 'Calls' },
        { key: 'storageBytes', header: 'Storage Bytes' },
      ]
      if (parsed.format === 'json') return sendJson(res, `usage-${stamp}.json`, flat)
      return sendCsv(res, `usage-${stamp}.csv`, flat, columns)
    }

    const result = await billingService.listInvoices(organizationId, {
      status: parsed.status,
      pageSize: 1000,
    })
    const flat = result.data.map((i) => ({
      id: i.id,
      date: i.createdAt,
      amount: i.amount,
      currency: i.currency,
      status: i.status,
      dueAt: i.dueAt ?? '',
      paidAt: i.paidAt ?? '',
      lineItems: JSON.stringify(i.lineItems),
    }))
    const columns = [
      { key: 'id', header: 'Invoice ID' },
      { key: 'date', header: 'Created' },
      { key: 'amount', header: 'Amount' },
      { key: 'currency', header: 'Currency' },
      { key: 'status', header: 'Status' },
      { key: 'dueAt', header: 'Due At' },
      { key: 'paidAt', header: 'Paid At' },
      { key: 'lineItems', header: 'Line Items' },
    ]
    if (parsed.format === 'json') return sendJson(res, `invoices-${stamp}.json`, flat)
    return sendCsv(res, `invoices-${stamp}.csv`, flat, columns)
  } catch (err) {
    logger.error(err, 'export billing failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to export billing data' })
  }
})

export default router
