import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { BillingService } from '../services/billing.service'
import { InvoiceService } from '../services/invoice.service'
import { UsageMeteringService } from '../services/usageMetering.service'
import { SubscriptionService } from '../services/subscription.service'
import { sendCsv, sendJson } from '../lib/export'
import { logger } from '../lib/logger'

const router = Router()
const billingService = new BillingService()
const invoiceService = new InvoiceService()
const usageService = new UsageMeteringService()
const subscriptionService = new SubscriptionService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) throw new Error('No organization associated with this account')
  return orgId
}

const meteringSchema = z.object({
  aiMinutes: z.number().nonnegative().optional().default(0),
  telephonyMinutes: z.number().nonnegative().optional().default(0),
  callsCount: z.number().nonnegative().optional().default(0),
  storageBytes: z.number().nonnegative().optional().default(0),
  sttMinutes: z.number().nonnegative().optional().default(0),
  ttsCharacters: z.number().nonnegative().optional().default(0),
})

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const dashboard = await billingService.getDashboard(organizationId)
    res.status(200).json(dashboard)
  } catch (err) {
    logger.error(err, 'billing center dashboard failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load billing center' })
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

router.post('/invoices/:id/mark-paid', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const invoice = await invoiceService.markPaid(organizationId, req.params.id)
    res.status(200).json({ invoice })
  } catch (err) {
    logger.error(err, 'mark invoice paid failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to mark invoice paid' })
  }
})

router.post('/invoices/:id/void', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const invoice = await invoiceService.markVoid(organizationId, req.params.id)
    res.status(200).json({ invoice })
  } catch (err) {
    logger.error(err, 'void invoice failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to void invoice' })
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

router.post('/meter', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = meteringSchema.parse(req.body)
    await usageService.recordUsage({
      organizationId,
      ...input,
    })
    res.status(204).send()
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'meter usage failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to meter usage' })
  }
})

router.get('/subscriptions', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const subscriptions = await subscriptionService.list(organizationId)
    const current = await subscriptionService.getCurrent(organizationId)
    res.status(200).json({ subscriptions, current: current || null })
  } catch (err) {
    logger.error(err, 'list subscriptions failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list subscriptions' })
  }
})

router.get('/subscriptions/current', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const current = await subscriptionService.getCurrent(organizationId)
    res.status(200).json({ subscription: current || null })
  } catch (err) {
    logger.error(err, 'get current subscription failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get subscription' })
  }
})

router.post('/subscriptions', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const plan = typeof req.body.plan === 'string' ? req.body.plan : 'growth'
    const status = typeof req.body.status === 'string' ? req.body.status : 'active'
    const subscription = await subscriptionService.create(organizationId, {
      plan,
      status: status as any,
      currentPeriodStart: req.body.currentPeriodStart,
      currentPeriodEnd: req.body.currentPeriodEnd,
      trialEndsAt: req.body.trialEndsAt ?? null,
      metadata: req.body.metadata,
    })
    logger.info({ organizationId, id: subscription.id, plan }, 'subscription created via billing-center')
    res.status(201).json({ subscription })
  } catch (err) {
    logger.error(err, 'create subscription failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create subscription' })
  }
})

router.put('/subscriptions/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const subscription = await subscriptionService.update(organizationId, req.params.id, req.body)
    res.status(200).json({ subscription })
  } catch (err) {
    logger.error(err, 'update subscription failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update subscription' })
  }
})

router.post('/subscriptions/:id/cancel', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const subscription = await subscriptionService.cancel(organizationId, req.params.id)
    res.status(200).json({ subscription })
  } catch (err) {
    logger.error(err, 'cancel subscription failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to cancel subscription' })
  }
})

router.post('/subscriptions/:id/reactivate', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const subscription = await subscriptionService.reactivate(organizationId, req.params.id)
    res.status(200).json({ subscription })
  } catch (err) {
    logger.error(err, 'reactivate subscription failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to reactivate subscription' })
  }
})

router.delete('/subscriptions/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await subscriptionService.remove(organizationId, req.params.id)
    res.status(200).json({ message: 'Subscription deleted' })
  } catch (err) {
    logger.error(err, 'delete subscription failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete subscription' })
  }
})

router.get('/export', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const resource = typeof req.query.resource === 'string' ? req.query.resource : 'invoices'
    const format = typeof req.query.format === 'string' ? req.query.format : 'csv'
    const stamp = new Date().toISOString().slice(0, 10)

    if (resource === 'usage') {
      const result = await billingService.listUsage(organizationId, { pageSize: 1000 })
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
      if (format === 'json') return sendJson(res, `usage-${stamp}.json`, flat)
      return sendCsv(res, `usage-${stamp}.csv`, flat, columns)
    }

    const result = await billingService.listInvoices(organizationId, { pageSize: 1000 })
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
    if (format === 'json') return sendJson(res, `invoices-${stamp}.json`, flat)
    return sendCsv(res, `invoices-${stamp}.csv`, flat, columns)
  } catch (err) {
    logger.error(err, 'export billing center failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to export billing data' })
  }
})

export default router
