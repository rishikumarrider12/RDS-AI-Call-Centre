import { supabaseAdmin } from '../lib/supabase'

export class CallRepository {
  async list(
    organizationId: string,
    options: {
      search?: string
      status?: string
      campaignId?: string
      direction?: 'outbound' | 'inbound'
      contactId?: string
      dateFrom?: string
      dateTo?: string
      page?: number
      pageSize?: number
    }
  ) {
    const page = options.page && options.page > 0 ? options.page : 1
    const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 10
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabaseAdmin
      .from('calls')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (options.status) query = query.eq('status', options.status)
    if (options.campaignId) query = query.eq('campaign_id', options.campaignId)
    if (options.contactId) query = query.eq('contact_id', options.contactId)
    if (options.direction) query = query.eq('direction', options.direction)
    if (options.dateFrom) query = query.gte('created_at', options.dateFrom)
    if (options.dateTo) query = query.lte('created_at', options.dateTo)
    if (options.search && options.search.trim()) {
      const term = `%${options.search.trim()}%`
      query = query.or(`to_number.ilike.${term},from_number.ilike.${term},provider_call_sid.ilike.${term}`)
    }

    const { data, error, count } = await query
    if (error) throw error
    return {
      calls: data || [],
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async findById(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('calls')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async getContact(contactId: string) {
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .select('id, first_name, last_name, phone')
      .eq('id', contactId)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async getCampaign(campaignId: string) {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('id, name')
      .eq('id', campaignId)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async getAgent(agentId: string) {
    const { data, error } = await supabaseAdmin
      .from('ai_agents')
      .select('id, name')
      .eq('id', agentId)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async getTranscripts(callId: string) {
    const { data, error } = await supabaseAdmin
      .from('call_transcripts')
      .select('*')
      .eq('call_id', callId)
      .order('sequence', { ascending: true })
    if (error) throw error
    return data || []
  }

  async active(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('v_active_calls')
      .select('*')
      .eq('organization_id', organizationId)
      .order('answer_at', { ascending: false })
    if (error) throw error
    return data || []
  }

  async createCall(organizationId: string, createdById: string, input: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin
      .from('calls')
      .insert({
        organization_id: organizationId,
        campaign_id: input.campaignId ?? null,
        contact_id: input.contactId ?? null,
        agent_id: input.agentId ?? null,
        from_number_id: input.fromNumberId ?? null,
        call_queue_id: input.callQueueId ?? null,
        direction: input.direction ?? 'outbound',
        status: 'queued',
        to_number: input.toNumber,
        from_number: input.fromNumber,
        metadata: input.metadata ?? {},
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async updateStatus(id: string, status: string, extra: Record<string, unknown> = {}) {
    const payload: Record<string, unknown> = { status, ...extra }
    const { data, error } = await supabaseAdmin
      .from('calls')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async createAiCall(organizationId: string, callId: string, input: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin
      .from('ai_calls')
      .insert({
        organization_id: organizationId,
        call_id: callId,
        campaign_id: input.campaignId ?? null,
        contact_id: input.contactId ?? null,
        agent_id: input.agentId ?? null,
        status: 'queued',
        direction: input.direction ?? 'outbound',
        llm_provider: input.llmProvider ?? null,
        llm_model: input.llmModel ?? null,
        prompt_used: input.promptUsed ?? null,
        metadata: input.metadata ?? {},
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async updateAiCall(callId: string, patch: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin
      .from('ai_calls')
      .update(patch)
      .eq('call_id', callId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async createSession(callId: string, organizationId: string, input: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin
      .from('call_sessions')
      .insert({
        call_id: callId,
        organization_id: organizationId,
        agent_id: input.agentId ?? null,
        contact_id: input.contactId ?? null,
        status: input.status ?? 'active',
        hold_reason: input.holdReason ?? null,
        transferred_to_agent_id: input.transferredToAgentId ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async updateSession(callId: string, patch: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin
      .from('call_sessions')
      .update(patch)
      .eq('call_id', callId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async getSession(callId: string) {
    const { data, error } = await supabaseAdmin
      .from('call_sessions')
      .select('*')
      .eq('call_id', callId)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async addEvent(callId: string, organizationId: string, eventType: string, payload: Record<string, unknown>, createdBy?: string | null) {
    const { data, error } = await supabaseAdmin
      .from('call_events')
      .insert({
        call_id: callId,
        organization_id: organizationId,
        event_type: eventType,
        payload,
        created_by: createdBy ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async getEvents(callId: string) {
    const { data, error } = await supabaseAdmin
      .from('call_events')
      .select('*')
      .eq('call_id', callId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  }

  async addMetric(callId: string, organizationId: string, metrics: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin
      .from('call_metrics')
      .insert({
        call_id: callId,
        organization_id: organizationId,
        latency_ms: metrics.latencyMs ?? null,
        jitter_ms: metrics.jitterMs ?? null,
        packet_loss: metrics.packetLoss ?? null,
        audio_quality_score: metrics.audioQualityScore ?? null,
        stt_confidence_avg: metrics.sttConfidenceAvg ?? null,
        tts_latency_ms: metrics.ttsLatencyMs ?? null,
        ai_response_time_ms: metrics.aiResponseTimeMs ?? null,
        talk_ratio_customer: metrics.talkRatioCustomer ?? null,
        talk_ratio_agent: metrics.talkRatioAgent ?? null,
        silence_seconds: metrics.silenceSeconds ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async getMetrics(callId: string) {
    const { data, error } = await supabaseAdmin
      .from('call_metrics')
      .select('*')
      .eq('call_id', callId)
      .order('recorded_at', { ascending: true })
    if (error) throw error
    return data || []
  }
}
