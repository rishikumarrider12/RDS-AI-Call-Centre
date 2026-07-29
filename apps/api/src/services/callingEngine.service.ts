import { CallRepository } from '../repositories/call.repository'
import type { Call, CallEvent, CallTranscriptLine, AICallSummary, AICallSummaryInput, AgentAssistSuggestion, AgentAssistSuggestionInput, CallSentiment, CallIntent, AICallMetrics, CallIntelligenceDashboard } from '@rds/types'
import { recordAudit } from '../lib/audit'
import { supabaseAdmin } from '../lib/supabase'

export class CallingEngineService {
  private repository = new CallRepository()

  private mapCall(dbCall: any): Call {
    return {
      id: dbCall.id,
      organizationId: dbCall.organization_id,
      campaignId: dbCall.campaign_id ?? null,
      contactId: dbCall.contact_id ?? null,
      agentId: dbCall.agent_id ?? null,
      callQueueId: dbCall.call_queue_id ?? null,
      direction: dbCall.direction,
      status: dbCall.status,
      outcome: dbCall.outcome ?? null,
      provider: dbCall.provider ?? null,
      providerCallSid: dbCall.provider_call_sid ?? null,
      toNumber: dbCall.to_number,
      fromNumber: dbCall.from_number,
      durationSeconds: dbCall.duration_seconds ?? 0,
      billSeconds: dbCall.bill_seconds ?? 0,
      recordingUrl: dbCall.recording_url ?? null,
      recordingDuration: dbCall.recording_duration ?? null,
      cost: dbCall.cost ?? null,
      currency: dbCall.currency ?? null,
      dialAttempt: dbCall.dial_attempt ?? 1,
      startAt: dbCall.start_at ?? null,
      answerAt: dbCall.answer_at ?? null,
      endAt: dbCall.end_at ?? null,
      hangupCause: dbCall.hangupCause ?? dbCall.hangup_cause ?? null,
      transcript: dbCall.transcript ?? null,
      summary: dbCall.summary ?? null,
      metadata: dbCall.metadata ?? {},
      createdAt: dbCall.created_at,
      updatedAt: dbCall.updated_at,
    }
  }

  // AI Call Summaries

  async generateSummary(organizationId: string, callId: string, input: AICallSummaryInput): Promise<AICallSummary> {
    const dbCall = await this.repository.findById(organizationId, callId)
    if (!dbCall) throw new Error('Call not found')

    const { data, error } = await supabaseAdmin
      .from('ai_call_summaries')
      .insert({
        call_id: callId,
        organization_id: organizationId,
        summary: input.summary,
        sentiment: input.sentiment,
        intent: input.intent ?? null,
        key_topics: input.keyTopics ?? [],
        action_items: input.actionItems ?? [],
        risk_level: input.riskLevel ?? null,
        confidence: input.confidence ?? 0,
        model_used: input.modelUsed ?? null,
        tokens_used: input.tokensUsed ?? null,
        cost: input.cost ?? null,
        currency: input.currency ?? 'USD',
      })
      .select()
      .single()

    if (error) throw error

    await this.repository.updateStatus(callId, dbCall.status, { summary_id: data.id })

    await recordAudit({
      organizationId,
      action: 'ai_summary.generate',
      actorId: 'system',
      actorType: 'system',
      resourceType: 'ai_call_summary',
      resourceId: data.id,
      after: { callId, sentiment: data.sentiment, riskLevel: data.risk_level },
    })

    return this.mapAICallSummary(data)
  }

  async getSummary(organizationId: string, callId: string): Promise<AICallSummary | null> {
    const { data, error } = await supabaseAdmin
      .from('ai_call_summaries')
      .select('*')
      .eq('call_id', callId)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    if (!data) return null
    return this.mapAICallSummary(data)
  }

  // Agent Assist Suggestions

  async getAgentAssistSuggestions(organizationId: string, callId: string, options: {
    applied?: boolean
    priority?: string
    suggestionType?: string
    page?: number
    pageSize?: number
  } = {}) {
    const page = options.page ?? 1
    const pageSize = options.pageSize ?? 10
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabaseAdmin
      .from('agent_assist_suggestions')
      .select('*', { count: 'exact' })
      .eq('call_id', callId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (options.applied !== undefined) query = query.eq('is_applied', options.applied)
    if (options.priority) query = query.eq('priority', options.priority)
    if (options.suggestionType) query = query.eq('suggestion_type', options.suggestionType)

    const { data, error, count } = await query
    if (error) throw error
    return {
      suggestions: (data || []).map(this.mapAgentAssistSuggestion),
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async applySuggestion(organizationId: string, callId: string, id: string): Promise<AgentAssistSuggestion> {
    const { data, error } = await supabaseAdmin
      .from('agent_assist_suggestions')
      .update({ is_applied: true, applied_at: new Date().toISOString() })
      .eq('id', id)
      .eq('call_id', callId)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('Suggestion not found')

    const suggestion = this.mapAgentAssistSuggestion(data)
    await recordAudit({
      organizationId,
      action: 'agent_assist.apply',
      actorId: 'system',
      actorType: 'system',
      resourceType: 'agent_assist_suggestion',
      resourceId: id,
      after: { applied: true, suggestionType: suggestion.suggestionType },
    })

    return suggestion
  }

  async createSuggestion(organizationId: string, callId: string, input: AgentAssistSuggestionInput): Promise<AgentAssistSuggestion> {
    const { data, error } = await supabaseAdmin
      .from('agent_assist_suggestions')
      .insert({
        call_id: callId,
        organization_id: organizationId,
        suggestion_type: input.suggestionType,
        content: input.content,
        priority: input.priority ?? 'medium',
        is_applied: false,
        metadata: input.metadata ?? {},
      })
      .select()
      .single()

    if (error) throw error
    return this.mapAgentAssistSuggestion(data)
  }

  // Sentiment Tracking

  async getSentimentAnalysis(organizationId: string, callId: string): Promise<CallSentiment[]> {
    const { data, error } = await supabaseAdmin
      .from('call_sentiment')
      .select('*')
      .eq('call_id', callId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data || []).map(this.mapCallSentiment)
  }

  async recordSentiment(organizationId: string, callId: string, input: {
    channel: 'customer' | 'agent' | 'system'
    sentiment: 'positive' | 'neutral' | 'negative'
    confidence: number
    emotion?: string
    transcriptLineId?: string
    metadata?: Record<string, unknown>
  }): Promise<CallSentiment> {
    const { data, error } = await supabaseAdmin
      .from('call_sentiment')
      .insert({
        call_id: callId,
        organization_id: organizationId,
        channel: input.channel,
        sentiment: input.sentiment,
        confidence: input.confidence,
        emotion: input.emotion ?? null,
        transcript_line_id: input.transcriptLineId ?? null,
        metadata: input.metadata ?? {},
      })
      .select()
      .single()

    if (error) throw error
    return this.mapCallSentiment(data)
  }

  // Intent Classification

  async getIntents(organizationId: string, callId: string): Promise<CallIntent[]> {
    const { data, error } = await supabaseAdmin
      .from('call_intents')
      .select('*')
      .eq('call_id', callId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data || []).map(this.mapCallIntent)
  }

  async classifyIntent(organizationId: string, callId: string, input: {
    intent: string
    confidence: number
    category?: string
    entities?: Record<string, unknown>
  }): Promise<CallIntent> {
    const { data, error } = await supabaseAdmin
      .from('call_intents')
      .insert({
        call_id: callId,
        organization_id: organizationId,
        intent: input.intent,
        confidence: input.confidence,
        category: input.category ?? null,
        entities: input.entities ?? {},
      })
      .select()
      .single()

    if (error) throw error
    return this.mapCallIntent(data)
  }

  // AI Call Metrics

  async getMetrics(organizationId: string, callId: string): Promise<AICallMetrics | null> {
    const { data, error } = await supabaseAdmin
      .from('ai_call_metrics')
      .select('*')
      .eq('call_id', callId)
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (error) throw error
    if (!data) return null
    return this.mapAICallMetrics(data)
  }

  async upsertMetrics(organizationId: string, callId: string, input: {
    totalDurationSeconds?: number
    talkRatioCustomer?: number
    talkRatioAgent?: number
    talkRatioSystem?: number
    interruptionCount?: number
    silenceDurationSeconds?: number
    averageSentimentScore?: number
    sentimentTrend?: 'improving' | 'stable' | 'declining'
    aiResponseLatencyMs?: number
    summaryGenerated?: boolean
  }): Promise<AICallMetrics> {
    const { data, error } = await supabaseAdmin
      .from('ai_call_metrics')
      .upsert({
        call_id: callId,
        organization_id: organizationId,
        total_duration_seconds: input.totalDurationSeconds ?? null,
        talk_ratio_customer: input.talkRatioCustomer ?? null,
        talk_ratio_agent: input.talkRatioAgent ?? null,
        talk_ratio_system: input.talkRatioSystem ?? null,
        interruption_count: input.interruptionCount ?? null,
        silence_duration_seconds: input.silenceDurationSeconds ?? null,
        average_sentiment_score: input.averageSentimentScore ?? null,
        sentiment_trend: input.sentimentTrend ?? null,
        ai_response_latency_ms: input.aiResponseLatencyMs ?? null,
        summary_generated: input.summaryGenerated ?? false,
      }, { onConflict: 'call_id' })
      .select()
      .single()

    if (error) throw error
    return this.mapAICallMetrics(data)
  }

  // AI Intelligence Dashboard

  async getIntelligenceDashboard(organizationId: string, callId: string): Promise<CallIntelligenceDashboard> {
    const [summary, sentiments, intents, suggestionsResult, metrics] = await Promise.all([
      this.getSummary(organizationId, callId),
      this.getSentimentAnalysis(organizationId, callId),
      this.getIntents(organizationId, callId),
      this.getAgentAssistSuggestions(organizationId, callId, { pageSize: 50 }),
      this.getMetrics(organizationId, callId),
    ])

    const overallSentiment = sentiments.length > 0
      ? sentiments.reduce((acc, s) => {
          const scores: Record<string, number> = { positive: 1, neutral: 0, negative: -1 }
          return acc + (scores[s.sentiment] * s.confidence)
        }, 0) / sentiments.length
      : 0

    const overallSentimentLabel: 'positive' | 'neutral' | 'negative' | null =
      overallSentiment > 0.2 ? 'positive' : overallSentiment < -0.2 ? 'negative' : overallSentiment !== 0 ? 'neutral' : null

    const riskLevel = summary?.riskLevel ?? (suggestionsResult.suggestions.some(s => s.priority === 'urgent' || s.priority === 'high') ? 'high' : 'low')

    return {
      callId,
      summary: summary ?? null,
      sentiments,
      intents,
      suggestions: suggestionsResult.suggestions,
      metrics: metrics ?? null,
      overallSentiment: overallSentimentLabel,
      riskLevel,
    }
  }

  // Private mappers

  private mapAICallSummary(db: any): AICallSummary {
    return {
      id: db.id,
      callId: db.call_id,
      organizationId: db.organization_id,
      summary: db.summary,
      sentiment: db.sentiment,
      intent: db.intent,
      keyTopics: db.key_topics ?? [],
      actionItems: db.action_items ?? [],
      riskLevel: db.risk_level,
      confidence: db.confidence ?? 0,
      modelUsed: db.model_used,
      tokensUsed: db.tokens_used,
      cost: db.cost,
      currency: db.currency,
      createdAt: db.created_at,
      updatedAt: db.updated_at,
    }
  }

  private mapAgentAssistSuggestion(db: any): AgentAssistSuggestion {
    return {
      id: db.id,
      callId: db.call_id,
      organizationId: db.organization_id,
      agentId: db.agent_id,
      suggestionType: db.suggestion_type as AgentAssistSuggestion['suggestionType'],
      content: db.content,
      priority: db.priority as AgentAssistSuggestion['priority'],
      isApplied: db.is_applied,
      appliedAt: db.applied_at,
      metadata: db.metadata ?? {},
      createdAt: db.created_at,
    }
  }

  private mapCallSentiment(db: any): CallSentiment {
    return {
      id: db.id,
      callId: db.call_id,
      organizationId: db.organization_id,
      channel: db.channel as CallSentiment['channel'],
      sentiment: db.sentiment as CallSentiment['sentiment'],
      confidence: db.confidence ?? 0,
      emotion: db.emotion,
      transcriptLineId: db.transcript_line_id,
      metadata: db.metadata ?? {},
      createdAt: db.created_at,
    }
  }

  private mapCallIntent(db: any): CallIntent {
    return {
      id: db.id,
      callId: db.call_id,
      organizationId: db.organization_id,
      intent: db.intent,
      confidence: db.confidence ?? 0,
      category: db.category,
      entities: db.entities ?? {},
      metadata: db.metadata ?? {},
      createdAt: db.created_at,
    }
  }

  private mapAICallMetrics(db: any): AICallMetrics {
    return {
      id: db.id,
      callId: db.call_id,
      organizationId: db.organization_id,
      totalDurationSeconds: db.total_duration_seconds,
      talkRatioCustomer: db.talk_ratio_customer,
      talkRatioAgent: db.talk_ratio_agent,
      talkRatioSystem: db.talk_ratio_system,
      interruptionCount: db.interruption_count,
      silenceDurationSeconds: db.silence_duration_seconds,
      averageSentimentScore: db.average_sentiment_score,
      sentimentTrend: db.sentiment_trend as AICallMetrics['sentimentTrend'],
      aiResponseLatencyMs: db.ai_response_latency_ms,
      summaryGenerated: db.summary_generated,
      createdAt: db.created_at,
    }
  }
}

