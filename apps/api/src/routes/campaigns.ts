import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { CampaignService } from '../services/campaign.service'
import { resolveDbUserId } from '../lib/actors'
import { logger } from '../lib/logger'

const router = Router()
const campaignService = new CampaignService()

const campaignInputSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().nullable().optional(),
  type: z.enum(['outbound', 'inbound']).optional(),
  direction: z.enum(['outbound', 'inbound']).optional(),
  aiAgentId: z.string().uuid().nullable().optional(),
  aiScriptId: z.string().uuid().nullable().optional(),
  voiceProfileId: z.string().uuid().nullable().optional(),
  fromNumberId: z.string().uuid().nullable().optional(),
  contactListId: z.string().uuid().nullable().optional(),
  schedule: z.record(z.unknown()).optional(),
  retryPolicy: z.record(z.unknown()).optional(),
  dialingStrategy: z.enum(['progressive', 'predictive', 'power']).nullable().optional(),
  maxConcurrent: z.number().int().nonnegative().nullable().optional(),
  script: z.string().optional(),
  voice: z.string().optional(),
})

const updateSchema = campaignInputSchema.partial().extend({
  status: z.enum(['draft', 'scheduled', 'running', 'paused', 'ended']).optional(),
})

const statusSchema = z.object({
  status: z.enum(['draft', 'scheduled', 'running', 'paused', 'ended']),
})

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) {
    throw new Error('No organization associated with this account')
  }
  return orgId
}

// List campaigns (pagination, search, status filter)
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const search = typeof req.query.search === 'string' ? req.query.search : undefined
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 10
    const result = await campaignService.list(organizationId, { search, status, page, pageSize })
    res.status(200).json(result)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'list campaigns failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list campaigns' })
  }
})

// Create campaign
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = campaignInputSchema.parse(req.body)
    const createdById = await resolveDbUserId(req.user!.id)
    const campaign = await campaignService.create(organizationId, createdById, input)
    logger.info({ organizationId, id: campaign.id }, 'campaign created')
    res.status(201).json({ campaign })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'create campaign failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create campaign' })
  }
})

// Get single campaign
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const campaign = await campaignService.getById(organizationId, req.params.id)
    res.status(200).json({ campaign })
  } catch (err) {
    logger.error(err, 'get campaign failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get campaign' })
  }
})

// Update campaign
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = updateSchema.parse(req.body)
    const campaign = await campaignService.update(organizationId, req.params.id, input)
    logger.info({ organizationId, id: req.params.id }, 'campaign updated')
    res.status(200).json({ campaign })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'update campaign failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update campaign' })
  }
})

// Change status (draft / active / paused / completed)
router.patch('/:id/status', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const { status } = statusSchema.parse(req.body)
    const campaign = await campaignService.setStatus(organizationId, req.params.id, status)
    logger.info({ organizationId, id: req.params.id, status }, 'campaign status changed')
    res.status(200).json({ campaign })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'campaign status change failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to change campaign status' })
  }
})

// Delete campaign (soft)
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await campaignService.delete(organizationId, req.params.id)
    logger.info({ organizationId, id: req.params.id }, 'campaign deleted')
    res.status(200).json({ message: 'Campaign deleted successfully' })
  } catch (err) {
    logger.error(err, 'delete campaign failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete campaign' })
  }
})

// Start campaign
router.post('/:id/start', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const createdById = await resolveDbUserId(req.user!.id)
    const campaign = await campaignService.start(organizationId, createdById, req.params.id)
    res.status(200).json({ campaign })
  } catch (err) {
    logger.error(err, 'start campaign failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to start campaign' })
  }
})

// Pause campaign
router.post('/:id/pause', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const createdById = await resolveDbUserId(req.user!.id)
    const campaign = await campaignService.pause(organizationId, createdById, req.params.id)
    res.status(200).json({ campaign })
  } catch (err) {
    logger.error(err, 'pause campaign failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to pause campaign' })
  }
})

// Resume campaign
router.post('/:id/resume', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const createdById = await resolveDbUserId(req.user!.id)
    const campaign = await campaignService.resume(organizationId, createdById, req.params.id)
    res.status(200).json({ campaign })
  } catch (err) {
    logger.error(err, 'resume campaign failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to resume campaign' })
  }
})

// Stop campaign
router.post('/:id/stop', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const createdById = await resolveDbUserId(req.user!.id)
    const campaign = await campaignService.stop(organizationId, createdById, req.params.id)
    res.status(200).json({ campaign })
  } catch (err) {
    logger.error(err, 'stop campaign failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to stop campaign' })
  }
})

// Duplicate campaign
router.post('/:id/duplicate', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const createdById = await resolveDbUserId(req.user!.id)
    const campaign = await campaignService.duplicate(organizationId, createdById, req.params.id)
    res.status(201).json({ campaign })
  } catch (err) {
    logger.error(err, 'duplicate campaign failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to duplicate campaign' })
  }
})

export default router
