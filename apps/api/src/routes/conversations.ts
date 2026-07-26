import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { requireAnyRole } from '../middleware/auth'
import { ConversationService } from '../services/conversation.service'
import { resolveDbUserId } from '../lib/actors'
import { logger } from '../lib/logger'

const router = Router()
const conversationService = new ConversationService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) throw new Error('No organization associated with this account')
  return orgId
}

const transferSchema = z.object({
  agentId: z.string().uuid(),
})

const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string().min(1),
  intent: z.string().nullable().optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).nullable().optional(),
  confidence: z.number().nullable().optional(),
  tokensUsed: z.number().int().nonnegative().nullable().optional(),
  latencyMs: z.number().int().nonnegative().nullable().optional(),
  provider: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
})

const providerInputSchema = z.object({
  name: z.string().min(1),
  provider: z.enum(['openai', 'anthropic', 'google', 'openrouter', 'ollama']),
  apiKey: z.string().nullable().optional(),
  apiBaseUrl: z.string().url().nullable().optional(),
  defaultModel: z.string().min(1),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().default(1024),
  topP: z.number().nullable().optional(),
  frequencyPenalty: z.number().nullable().optional(),
  presencePenalty: z.number().nullable().optional(),
  stopSequences: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
})

const promptTemplateInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  systemPrompt: z.string().min(1),
  userPromptTemplate: z.string().nullable().optional(),
  variables: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
})

const memoryInputSchema = z.object({
  contactId: z.string().uuid().nullable().optional(),
  agentId: z.string().uuid().nullable().optional(),
  conversationId: z.string().uuid().nullable().optional(),
  memoryType: z.enum(['summary', 'fact', 'preference', 'intent', 'sentiment_history']),
  content: z.string().min(1),
  importanceScore: z.number().min(0).max(1).default(0.5),
  expiresAt: z.string().datetime().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
})

const usageInputSchema = z.object({
  conversationId: z.string().uuid().nullable().optional(),
  messageId: z.string().uuid().nullable().optional(),
  provider: z.string().min(1),
  model: z.string().min(1),
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  latencyMs: z.number().int().nonnegative().nullable().optional(),
  cost: z.number().nonnegative().nullable().optional(),
  currency: z.string().default('USD'),
})

// Dashboard stats
router.get('/dashboard', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const summary = await conversationService.getDashboard(organizationId)
    res.status(200).json({ summary })
  } catch (err) {
    logger.error(err, 'get conversation dashboard failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load dashboard' })
  }
})

// Conversations
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    const agentId = typeof req.query.agentId === 'string' ? req.query.agentId : undefined
    const campaignId = typeof req.query.campaignId === 'string' ? req.query.campaignId : undefined
    const contactId = typeof req.query.contactId === 'string' ? req.query.contactId : undefined
    const search = typeof req.query.search === 'string' ? req.query.search : undefined
    const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined
    const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 10
    const result = await conversationService.listConversations(organizationId, {
      status,
      agentId,
      campaignId,
      contactId,
      search,
      dateFrom,
      dateTo,
      page,
      pageSize,
    })
    res.status(200).json(result)
  } catch (err) {
    logger.error(err, 'list conversations failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list conversations' })
  }
})

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const conversation = await conversationService.getConversation(organizationId, req.params.id)
    res.status(200).json({ conversation })
  } catch (err) {
    logger.error(err, 'get conversation failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get conversation' })
  }
})

router.post('/start', authenticate, requireAnyRole(['org_admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const createdById = await resolveDbUserId(req.user!.id)
    const conversation = await conversationService.startConversation(organizationId, createdById, req.body)
    res.status(201).json({ conversation })
  } catch (err) {
    logger.error(err, 'start conversation failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to start conversation' })
  }
})

router.post('/:id/end', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const createdById = await resolveDbUserId(req.user!.id)
    const conversation = await conversationService.endConversation(organizationId, createdById, req.params.id)
    res.status(200).json({ conversation })
  } catch (err) {
    logger.error(err, 'end conversation failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to end conversation' })
  }
})

router.post('/:id/transfer', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const createdById = await resolveDbUserId(req.user!.id)
    const { agentId } = transferSchema.parse(req.body)
    const conversation = await conversationService.transferConversation(organizationId, createdById, req.params.id, agentId)
    res.status(200).json({ conversation })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'transfer conversation failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to transfer conversation' })
  }
})

router.get('/:id/messages', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 50
    const result = await conversationService.getMessages(organizationId, req.params.id, { page, pageSize })
    res.status(200).json(result)
  } catch (err) {
    logger.error(err, 'get conversation messages failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get messages' })
  }
})

router.post('/:id/messages', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = messageSchema.parse(req.body)
    const message = await conversationService.addMessage(organizationId, req.params.id, input)
    res.status(201).json({ message })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'add message failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to add message' })
  }
})

// LLM Providers
router.get('/providers', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const providers = await conversationService.listProviders(organizationId)
    res.status(200).json({ providers })
  } catch (err) {
    logger.error(err, 'list llm providers failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list providers' })
  }
})

router.get('/providers/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const provider = await conversationService.getProvider(organizationId, req.params.id)
    res.status(200).json({ provider })
  } catch (err) {
    logger.error(err, 'get llm provider failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get provider' })
  }
})

router.post('/providers', authenticate, requireAnyRole(['org_admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const createdById = await resolveDbUserId(req.user!.id)
    const input = providerInputSchema.parse(req.body)
    const provider = await conversationService.createProvider(organizationId, createdById, input)
    res.status(201).json({ provider })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'create llm provider failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create provider' })
  }
})

router.put('/providers/:id', authenticate, requireAnyRole(['org_admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const createdById = await resolveDbUserId(req.user!.id)
    const provider = await conversationService.updateProvider(organizationId, createdById, req.params.id, req.body)
    res.status(200).json({ provider })
  } catch (err) {
    logger.error(err, 'update llm provider failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update provider' })
  }
})

router.delete('/providers/:id', authenticate, requireAnyRole(['org_admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const createdById = await resolveDbUserId(req.user!.id)
    await conversationService.deleteProvider(organizationId, createdById, req.params.id)
    res.status(204).send()
  } catch (err) {
    logger.error(err, 'delete llm provider failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete provider' })
  }
})

// Prompt templates
router.get('/prompt-templates', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const search = typeof req.query.search === 'string' ? req.query.search : undefined
    const templates = await conversationService.listPromptTemplates(organizationId, { search })
    res.status(200).json({ templates })
  } catch (err) {
    logger.error(err, 'list prompt templates failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list prompt templates' })
  }
})

router.get('/prompt-templates/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const template = await conversationService.getPromptTemplate(organizationId, req.params.id)
    res.status(200).json({ template })
  } catch (err) {
    logger.error(err, 'get prompt template failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get prompt template' })
  }
})

router.post('/prompt-templates', authenticate, requireAnyRole(['org_admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const createdById = await resolveDbUserId(req.user!.id)
    const input = promptTemplateInputSchema.parse(req.body)
    const template = await conversationService.createPromptTemplate(organizationId, createdById, input)
    res.status(201).json({ template })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'create prompt template failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create prompt template' })
  }
})

router.put('/prompt-templates/:id', authenticate, requireAnyRole(['org_admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const createdById = await resolveDbUserId(req.user!.id)
    const template = await conversationService.updatePromptTemplate(organizationId, createdById, req.params.id, req.body)
    res.status(200).json({ template })
  } catch (err) {
    logger.error(err, 'update prompt template failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update prompt template' })
  }
})

router.delete('/prompt-templates/:id', authenticate, requireAnyRole(['org_admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const createdById = await resolveDbUserId(req.user!.id)
    await conversationService.deletePromptTemplate(organizationId, createdById, req.params.id)
    res.status(204).send()
  } catch (err) {
    logger.error(err, 'delete prompt template failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete prompt template' })
  }
})

// Memory
router.get('/memory', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const contactId = typeof req.query.contactId === 'string' ? req.query.contactId : undefined
    const agentId = typeof req.query.agentId === 'string' ? req.query.agentId : undefined
    const memory = await conversationService.listMemory(organizationId, { contactId, agentId })
    res.status(200).json({ memory })
  } catch (err) {
    logger.error(err, 'list memory failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list memory' })
  }
})

router.post('/memory', authenticate, requireAnyRole(['org_admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const createdById = await resolveDbUserId(req.user!.id)
    const input = memoryInputSchema.parse(req.body)
    const memory = await conversationService.createMemory(organizationId, createdById, input)
    res.status(201).json({ memory })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'create memory failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create memory' })
  }
})

// Usage
router.get('/usage', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined
    const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined
    const usage = await conversationService.getUsage(organizationId, { dateFrom, dateTo })
    res.status(200).json({ usage })
  } catch (err) {
    logger.error(err, 'get usage failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get usage' })
  }
})

router.post('/usage', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = usageInputSchema.parse(req.body)
    const usage = await conversationService.recordUsage(organizationId, input)
    res.status(201).json({ usage })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'record usage failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to record usage' })
  }
})

export default router
