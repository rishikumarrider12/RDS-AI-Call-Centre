import { supabaseAdmin } from '../lib/supabase'

export interface CreateCampaignInput {
  name: string
  description?: string | null
  type?: 'outbound' | 'inbound'
  direction?: 'outbound' | 'inbound'
  aiAgentId?: string | null
  aiScriptId?: string | null
  voiceProfileId?: string | null
  fromNumberId?: string | null
  contactListId?: string | null
  schedule?: Record<string, unknown>
  retryPolicy?: Record<string, unknown>
  dialingStrategy?: 'progressive' | 'predictive' | 'power' | null
  maxConcurrent?: number | null
  script?: string
  voice?: string
}

export interface UpdateCampaignInput {
  name?: string
  description?: string | null
  type?: 'outbound' | 'inbound'
  status?: 'draft' | 'scheduled' | 'running' | 'paused' | 'ended'
  direction?: 'outbound' | 'inbound'
  aiAgentId?: string | null
  aiScriptId?: string | null
  voiceProfileId?: string | null
  fromNumberId?: string | null
  contactListId?: string | null
  schedule?: Record<string, unknown>
  retryPolicy?: Record<string, unknown>
  dialingStrategy?: 'progressive' | 'predictive' | 'power' | null
  maxConcurrent?: number | null
  script?: string
  voice?: string
}

export class CampaignRepository {
  async list(
    organizationId: string,
    options: { search?: string; status?: string; page?: number; pageSize?: number }
  ) {
    const page = options.page && options.page > 0 ? options.page : 1
    const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 10
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabaseAdmin
      .from('v_campaign_summary')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('name', { ascending: true })
      .range(from, to)

    if (options.status) {
      query = query.eq('status', options.status)
    }
    if (options.search && options.search.trim()) {
      query = query.ilike('name', `%${options.search.trim()}%`)
    }

    const { data, error, count } = await query
    if (error) throw error
    return {
      campaigns: data || [],
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async findById(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async create(organizationId: string, createdById: string, input: CreateCampaignInput) {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .insert({
        organization_id: organizationId,
        created_by: createdById,
        name: input.name,
        description: input.description ?? null,
        type: input.type ?? 'outbound',
        direction: input.direction ?? input.type ?? 'outbound',
        ai_agent_id: input.aiAgentId ?? null,
        ai_script_id: input.aiScriptId ?? null,
        voice_profile_id: input.voiceProfileId ?? null,
        from_number_id: input.fromNumberId ?? null,
        contact_list_id: input.contactListId ?? null,
        schedule: input.schedule ?? {},
        retry_policy: input.retryPolicy ?? {},
        dialing_strategy: input.dialingStrategy ?? null,
        max_concurrent: input.maxConcurrent ?? null,
        script: input.script ?? '',
        voice: input.voice ?? '',
        status: 'draft',
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(id: string, input: UpdateCampaignInput) {
    const payload: Record<string, unknown> = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.description !== undefined) payload.description = input.description
    if (input.type !== undefined) payload.type = input.type
    if (input.status !== undefined) payload.status = input.status
    if (input.direction !== undefined) payload.direction = input.direction
    if (input.aiAgentId !== undefined) payload.ai_agent_id = input.aiAgentId
    if (input.aiScriptId !== undefined) payload.ai_script_id = input.aiScriptId
    if (input.voiceProfileId !== undefined) payload.voice_profile_id = input.voiceProfileId
    if (input.fromNumberId !== undefined) payload.from_number_id = input.fromNumberId
    if (input.contactListId !== undefined) payload.contact_list_id = input.contactListId
    if (input.schedule !== undefined) payload.schedule = input.schedule
    if (input.retryPolicy !== undefined) payload.retry_policy = input.retryPolicy
    if (input.dialingStrategy !== undefined) payload.dialing_strategy = input.dialingStrategy
    if (input.maxConcurrent !== undefined) payload.max_concurrent = input.maxConcurrent
    if (input.script !== undefined) payload.script = input.script
    if (input.voice !== undefined) payload.voice = input.voice

    // Maintain started/ended timestamps on status transitions
    if (input.status === 'running') payload.started_at = new Date().toISOString()
    if (input.status === 'ended' || input.status === 'paused') payload.ended_at = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async softDelete(id: string) {
    const { error } = await supabaseAdmin
      .from('campaigns')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }

  async setStatus(id: string, status: string) {
    const payload: Record<string, unknown> = { status }
    if (status === 'running') payload.started_at = new Date().toISOString()
    if (status === 'ended' || status === 'paused') payload.ended_at = new Date().toISOString()
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
}
