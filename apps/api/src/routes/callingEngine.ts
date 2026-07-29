import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { requireAnyRole } from '../middleware/auth'
import { CallingEngineService } from '../services/callingEngine.service'
import { resolveDbUserId } from '../lib/actors'
import { recordAudit } from '../lib/audit'
import { logger } from '../lib/logger'

const router = Router()
const callingEngineService = new CallingEngineService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) throw new Error('No organization associated with this account')
  return orgId
}

const summarySchema = z.object({
  summary: z.string().min(1),
  sentiment: z.enum(['positive', 'neutral', 'negative']).nullable().optional(),
  intent: z.string().nullable().optional(),
  keyTopics: z.array(z.string()).default([]),
  actionItems: z.array(z.string()).default([]),
  riskLevel: z.enum(['low', 'medium', 'high']).nullable().optional(),
  confidence: z.number().min(0).max(1).default(0),
  modelUsed: z.string().optional(),
  tokensUsed: z.number().int().nonnegative().optional(),
  cost: z.number().nonnegative().optional(),
  currency: z.string().default('USD'),
})

const suggestionSchema = z.object({
  suggestionType: z.enum(['response', 'escalation', 'pause', 'transfer', 'note', 'follow_up']),
  content: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  metadata: z.record(z.unknown()).optional(),
})

const sentimentSchema = z.object({
  channel: z.enum(['customer', 'agent', 'system']),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  confidence: z.number().min(0).max(1),
  emotion: z.string().nullable().optional(),
  transcriptLineId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
})

const intentSchema = z.object({
  intent: z.string().min(1),
  confidence: z.number().min(0).max(1),
  category: z.string().nullable().optional(),
  entities: z.record(z.unknown()).default({}),
})

const metricsSchema = z.object({
  totalDurationSeconds: z.number().int().nonnegative().optional(),
  talkRatioCustomer: z.number().min(0).max(1).optional(),
  talkRatioAgent: z.number().min(0).max(1).optional(),
  talkRatioSystem: z.number().min(0).max(1).optional(),
  interruptionCount: z.number().int().nonnegative().optional(),
  silenceDurationSeconds: z.number().int().nonnegative().optional(),
  averageSentimentScore: z.number().optional(),
  sentimentTrend: z.enum(['improving', 'stable', 'declining']).optional(),
  aiResponseLatencyMs: z.number().int().nonnegative().optional(),
  summaryGenerated: z.boolean().optional(),
})

router.get('/:callId/summary', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const callId = req.params.callId
    const summary = await callingEngineService.getSummary(organizationId, callId)
    res.status(200).json({ summary })
  } catch (err) {
    logger.error(err, 'get AI summary failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get AI summary' })
  }
})

router.post('/:callId/summary', authenticate, requireAnyRole(['org_admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const callId = req.params.callId
    const actorId = await resolveDbUserId(req.user!.id)
    const input = summarySchema.parse(req.body)
    const summary = await callingEngineService.generateSummary(organizationId, callId, {
      ...input,
      sentiment: input.sentiment ?? null,
      intent: input.intent ?? null,
      riskLevel: input.riskLevel ?? null,
    })
    res.status(201).json({ summary })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'generate AI summary failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to generate AI summary' })
  }
})

router.get('/:callId/sentiment', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const callId = req.params.callId
    const sentiments = await callingEngineService.getSentimentAnalysis(organizationId, callId)
    res.status(200).json({ sentiments })
  } catch (err) {
    logger.error(err, 'get sentiment analysis failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get sentiment analysis' })
  }
})

router.post('/:callId/sentiment', authenticate, requireAnyRole(['org_admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const callId = req.params.callId
    const input = sentimentSchema.parse(req.body)
    const sentiment = await callingEngineService.recordSentiment(organizationId, callId, {
      ...input,
      emotion: input.emotion ?? undefined,
      transcriptLineId: input.transcriptLineId ?? undefined,
    })
    res.status(201).json({ sentiment })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'record sentiment failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to record sentiment' })
  }
})

router.get('/:callId/intents', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const callId = req.params.callId
    const intents = await callingEngineService.getIntents(organizationId, callId)
    res.status(200).json({ intents })
  } catch (err) {
    logger.error(err, 'get intents failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get intents' })
  }
})

router.post('/:callId/intents', authenticate, requireAnyRole(['org_admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const callId = req.params.callId
    const input = intentSchema.parse(req.body)
    const intent = await callingEngineService.classifyIntent(organizationId, callId, {
      ...input,
      category: input.category ?? undefined,
    })
    res.status(201).json({ intent })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'classify intent failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to classify intent' })
  }
})

router.get('/:callId/agent-assist', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const callId = req.params.callId
    const applied = typeof req.query.applied === 'string' ? req.query.applied === 'true' : undefined
    const priority = typeof req.query.priority === 'string' ? req.query.priority : undefined
    const suggestionType = typeof req.query.suggestionType === 'string' ? req.query.suggestionType : undefined
    const suggestions = await callingEngineService.getAgentAssistSuggestions(organizationId, callId, {
      applied,
      priority,
      suggestionType,
    })
    res.status(200).json(suggestions)
  } catch (err) {
    logger.error(err, 'get agent assist suggestions failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get agent assist suggestions' })
  }
})

router.post('/:callId/agent-assist', authenticate, requireAnyRole(['org_admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const callId = req.params.callId
    const input = suggestionSchema.parse(req.body)
    const suggestion = await callingEngineService.createSuggestion(organizationId, callId, input)
    res.status(201).json({ suggestion })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'create agent assist suggestion failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create suggestion' })
  }
})

router.patch('/:callId/agent-assist/:id/apply', authenticate, requireAnyRole(['org_admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const callId = req.params.callId
    const id = req.params.id
    const suggestion = await callingEngineService.applySuggestion(organizationId, callId, id)
    res.status(200).json({ suggestion })
  } catch (err) {
    logger.error(err, 'apply agent assist suggestion failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to apply suggestion' })
  }
})

router.get('/:callId/metrics', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const callId = req.params.callId
    const metrics = await callingEngineService.getMetrics(organizationId, callId)
    res.status(200).json({ metrics })
  } catch (err) {
    logger.error(err, 'get AI metrics failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get AI metrics' })
  }
})

router.put('/:callId/metrics', authenticate, requireAnyRole(['org_admin', 'super_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const callId = req.params.callId
    const input = metricsSchema.parse(req.body)
    const metrics = await callingEngineService.upsertMetrics(organizationId, callId, input)
    res.status(200).json({ metrics })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'upsert AI metrics failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update AI metrics' })
  }
})

router.get('/:callId/intelligence', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const callId = req.params.callId
    const dashboard = await callingEngineService.getIntelligenceDashboard(organizationId, callId)
    res.status(200).json({ dashboard })
  } catch (err) {
    logger.error(err, 'get AI intelligence dashboard failed')
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get AI intelligence dashboard' })
  }
})

export default router