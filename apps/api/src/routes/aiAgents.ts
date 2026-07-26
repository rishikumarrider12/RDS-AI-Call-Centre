import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { requireAnyRole } from '../middleware/auth'
import { AIAgentService } from '../services/aiAgent.service'
import { resolveDbUserId } from '../lib/actors'
import { logger } from '../lib/logger'

const router = Router()
const aiAgentService = new AIAgentService()

const agentInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
  systemPrompt: z.string().min(1, 'System prompt is required'),
  llmProvider: z.enum(['openai', 'anthropic', 'local']),
  llmModel: z.string().min(1),
  ttsProvider: z.string().min(1),
  ttsVoiceId: z.string().min(1),
  sttProvider: z.string().min(1),
  sttModel: z.string().min(1),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().default(256),
  stopSequences: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
  status: z.enum(['active', 'inactive', 'testing']).default('active'),
})

const updateSchema = agentInputSchema.partial()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) throw new Error('No organization associated with this account')
  return orgId
}

// List AI agents
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const search = typeof req.query.search === 'string' ? req.query.search : undefined
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    const agents = await aiAgentService.list(organizationId, { search, status })
    res.status(200).json({ agents })
  } catch (err) {
    logger.error(err, 'list ai agents failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list AI agents' })
  }
})

// Get single AI agent
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const agent = await aiAgentService.getById(organizationId, req.params.id)
    res.status(200).json({ agent })
  } catch (err) {
    logger.error(err, 'get ai agent failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get AI agent' })
  }
})

// Create AI agent
router.post('/', authenticate, requireAnyRole(['org_admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const createdById = await resolveDbUserId(req.user!.id)
    const input = agentInputSchema.parse(req.body)
    const agent = await aiAgentService.create(organizationId, createdById, input)
    res.status(201).json({ agent })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'create ai agent failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create AI agent' })
  }
})

// Update AI agent
router.put('/:id', authenticate, requireAnyRole(['org_admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = updateSchema.parse(req.body)
    const agent = await aiAgentService.update(organizationId, req.user!.id, req.params.id, input)
    res.status(200).json({ agent })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'update ai agent failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update AI agent' })
  }
})

// Delete AI agent
router.delete('/:id', authenticate, requireAnyRole(['org_admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await aiAgentService.delete(organizationId, req.user!.id, req.params.id)
    res.status(204).send()
  } catch (err) {
    logger.error(err, 'delete ai agent failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete AI agent' })
  }
})

// Duplicate AI agent
router.post('/:id/duplicate', authenticate, requireAnyRole(['org_admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const createdById = await resolveDbUserId(req.user!.id)
    const agent = await aiAgentService.duplicate(organizationId, createdById, req.params.id)
    res.status(201).json({ agent })
  } catch (err) {
    logger.error(err, 'duplicate ai agent failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to duplicate AI agent' })
  }
})

// Test AI agent
router.post('/:id/test', authenticate, requireAnyRole(['org_admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const createdById = await resolveDbUserId(req.user!.id)
    const agent = await aiAgentService.test(organizationId, createdById, req.params.id)
    res.status(200).json({ agent })
  } catch (err) {
    logger.error(err, 'test ai agent failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to test AI agent' })
  }
})

export default router
