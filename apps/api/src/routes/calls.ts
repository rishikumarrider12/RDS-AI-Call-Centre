import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth'
import { CallService } from '../services/call.service'
import { CallingEngineService } from '../services/callingEngine.service'
import { resolveDbUserId } from '../lib/actors'
import { logger } from '../lib/logger'
import { z } from 'zod'

const router = Router()
const callService = new CallService()
const callingEngine = new CallingEngineService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) {
    throw new Error('No organization associated with this account')
  }
  return orgId
}

const startCallSchema = z.object({
  campaignId: z.string().uuid().nullable().optional(),
  contactId: z.string().uuid().nullable().optional(),
  agentId: z.string().uuid().nullable().optional(),
  toNumber: z.string().min(1),
  fromNumber: z.string().min(1),
  direction: z.enum(['outbound', 'inbound']).default('outbound'),
  fromNumberId: z.string().uuid().nullable().optional(),
  callQueueId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
})

const transferCallSchema = z.object({
  toAgentId: z.string().uuid(),
})

// Call history (filters + pagination)
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const search = typeof req.query.search === 'string' ? req.query.search : undefined
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    const campaignId = typeof req.query.campaignId === 'string' ? req.query.campaignId : undefined
    const direction = req.query.direction === 'outbound' || req.query.direction === 'inbound'
      ? (req.query.direction as 'outbound' | 'inbound')
      : undefined
    const contactId = typeof req.query.contactId === 'string' ? req.query.contactId : undefined
    const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined
    const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 10
    const result = await callService.list(organizationId, {
      search,
      status,
      campaignId,
      direction,
      contactId,
      dateFrom,
      dateTo,
      page,
      pageSize,
    })
    res.status(200).json(result)
  } catch (err) {
    logger.error(err, 'list calls failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list calls' })
  }
})

// Active calls (uses v_active_calls view)
router.get('/active', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const calls = await callService.getActive(organizationId)
    res.status(200).json({ calls })
  } catch (err) {
    logger.error(err, 'get active calls failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get active calls' })
  }
})

// Single call details
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const call = await callService.getById(organizationId, req.params.id)
    res.status(200).json({ call })
  } catch (err) {
    logger.error(err, 'get call failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get call' })
  }
})

// Start a new call
router.post('/start', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = startCallSchema.parse(req.body)
    const createdById = await resolveDbUserId(req.user!.id)
    const call = await callingEngine.start(organizationId, createdById, input)
    res.status(201).json({ call })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'start call failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to start call' })
  }
})

// End call
router.post('/:id/end', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const createdById = await resolveDbUserId(req.user!.id)
    const call = await callingEngine.end(organizationId, createdById, req.params.id)
    res.status(200).json({ call })
  } catch (err) {
    logger.error(err, 'end call failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to end call' })
  }
})

// Pause call
router.post('/:id/pause', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const createdById = await resolveDbUserId(req.user!.id)
    const call = await callingEngine.pause(organizationId, createdById, req.params.id)
    res.status(200).json({ call })
  } catch (err) {
    logger.error(err, 'pause call failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to pause call' })
  }
})

// Resume call
router.post('/:id/resume', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const createdById = await resolveDbUserId(req.user!.id)
    const call = await callingEngine.resume(organizationId, createdById, req.params.id)
    res.status(200).json({ call })
  } catch (err) {
    logger.error(err, 'resume call failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to resume call' })
  }
})

// Transfer call
router.post('/:id/transfer', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const createdById = await resolveDbUserId(req.user!.id)
    const { toAgentId } = transferCallSchema.parse(req.body)
    const call = await callingEngine.transfer(organizationId, createdById, req.params.id, toAgentId)
    res.status(200).json({ call })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'transfer call failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to transfer call' })
  }
})

// Call transcript
router.get('/:id/transcript', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const transcript = await callingEngine.getTranscript(organizationId, req.params.id)
    res.status(200).json({ transcript })
  } catch (err) {
    logger.error(err, 'get transcript failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get transcript' })
  }
})

// Call events timeline
router.get('/:id/events', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const events = await callingEngine.getEvents(organizationId, req.params.id)
    res.status(200).json({ events })
  } catch (err) {
    logger.error(err, 'get events failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get events' })
  }
})

export default router
