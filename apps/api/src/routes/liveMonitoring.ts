import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { LiveDashboardService } from '../services/liveMonitoring.service'
import { QueueMonitoringService } from '../services/agentMonitoring.service'
import { AgentMonitoringService } from '../services/agentMonitoring.service'
import { logger } from '../lib/logger'

const router = Router()
const liveService = new LiveDashboardService()
const queueService = new QueueMonitoringService()
const agentService = new AgentMonitoringService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) throw new Error('No organization associated with this account')
  return orgId
}

router.get('/dashboard', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const stats = await liveService.getStats(organizationId)
    res.status(200).json({ stats })
  } catch (err) {
    logger.error(err, 'live dashboard stats failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load live stats' })
  }
})

router.get('/active-calls', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    const calls = await liveService.getActiveCalls(organizationId, status)
    res.status(200).json({ calls })
  } catch (err) {
    logger.error(err, 'list active calls failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list active calls' })
  }
})

router.get('/queue-status', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const queues = await liveService.getQueueStatus(organizationId)
    res.status(200).json({ queues })
  } catch (err) {
    logger.error(err, 'queue status failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load queue status' })
  }
})

router.get('/agents', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const agents = await liveService.getAgentStatus(organizationId)
    res.status(200).json({ agents })
  } catch (err) {
    logger.error(err, 'agent status failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load agent status' })
  }
})

router.get('/call-volume', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const hours = req.query.hours ? parseInt(req.query.hours as string, 10) : 24
    const volume = await liveService.getCallVolume(organizationId, hours)
    res.status(200).json({ volume })
  } catch (err) {
    logger.error(err, 'call volume failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load call volume' })
  }
})

router.get('/events', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50
    const events = await liveService.getRecentEvents(organizationId, limit)
    res.status(200).json({ events })
  } catch (err) {
    logger.error(err, 'live events failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load events' })
  }
})

router.get('/queues/overview', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const overview = await queueService.getOverview(organizationId)
    res.status(200).json(overview)
  } catch (err) {
    logger.error(err, 'queue overview failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load queue overview' })
  }
})

router.get('/agents/overview', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const overview = await agentService.getAgentOverview(organizationId)
    res.status(200).json(overview)
  } catch (err) {
    logger.error(err, 'agent overview failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load agent overview' })
  }
})

const eventSchema = z.object({
  callId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  eventType: z.string().min(1),
  payload: z.record(z.unknown()).optional(),
  severity: z.string().optional(),
})

router.post('/events', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = eventSchema.parse(req.body)
    const event = await liveService['liveRepo'].addLiveEvent(organizationId, {
      callId: input.callId,
      agentId: input.agentId,
      eventType: input.eventType,
      payload: input.payload || {},
      severity: input.severity || 'info',
    })
    res.status(201).json({ event })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'create live event failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create event' })
  }
})

export default router
