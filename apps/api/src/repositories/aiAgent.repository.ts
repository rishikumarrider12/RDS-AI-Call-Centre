import { supabaseAdmin } from '../lib/supabase'
import type { AIAgent, AIAgentInput, AIAgentFilter } from '@rds/types'

function toAIAgent(row: any): AIAgent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description ?? null,
    systemPrompt: row.system_prompt,
    llmProvider: row.llm_provider,
    llmModel: row.llm_model,
    ttsProvider: row.tts_provider,
    ttsVoiceId: row.tts_voice_id,
    sttProvider: row.stt_provider,
    sttModel: row.stt_model,
    temperature: Number(row.temperature),
    maxTokens: Number(row.max_tokens),
    stopSequences: Array.isArray(row.stop_sequences) ? row.stop_sequences : [],
    metadata: (row.metadata as Record<string, unknown>) || {},
    status: row.status || 'active',
    lastTestedAt: row.last_tested_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class AIAgentRepository {
  async list(organizationId: string, filters?: AIAgentFilter): Promise<AIAgent[]> {
    let query = supabaseAdmin
      .from('ai_agents')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (filters?.search && filters.search.trim()) {
      query = query.ilike('name', `%${filters.search.trim()}%`)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []).map(toAIAgent)
  }

  async getById(organizationId: string, id: string): Promise<AIAgent | null> {
    const { data, error } = await supabaseAdmin
      .from('ai_agents')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data ? toAIAgent(data) : null
  }

  async create(organizationId: string, input: AIAgentInput): Promise<AIAgent> {
    const { data, error } = await supabaseAdmin
      .from('ai_agents')
      .insert({
        organization_id: organizationId,
        name: input.name,
        description: input.description ?? null,
        system_prompt: input.systemPrompt,
        llm_provider: input.llmProvider,
        llm_model: input.llmModel,
        tts_provider: input.ttsProvider,
        tts_voice_id: input.ttsVoiceId,
        stt_provider: input.sttProvider,
        stt_model: input.sttModel,
        temperature: input.temperature ?? 0.7,
        max_tokens: input.maxTokens ?? 256,
        stop_sequences: input.stopSequences ?? [],
        metadata: input.metadata ?? {},
        status: input.status || 'active',
      })
      .select()
      .single()
    if (error) throw error
    return toAIAgent(data)
  }

  async update(organizationId: string, id: string, input: Partial<AIAgentInput> & { status?: string }): Promise<AIAgent> {
    const { data, error } = await supabaseAdmin
      .from('ai_agents')
      .update({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description ?? null }),
        ...(input.systemPrompt !== undefined && { system_prompt: input.systemPrompt }),
        ...(input.llmProvider !== undefined && { llm_provider: input.llmProvider }),
        ...(input.llmModel !== undefined && { llm_model: input.llmModel }),
        ...(input.ttsProvider !== undefined && { tts_provider: input.ttsProvider }),
        ...(input.ttsVoiceId !== undefined && { tts_voice_id: input.ttsVoiceId }),
        ...(input.sttProvider !== undefined && { stt_provider: input.sttProvider }),
        ...(input.sttModel !== undefined && { stt_model: input.sttModel }),
        ...(input.temperature !== undefined && { temperature: input.temperature }),
        ...(input.maxTokens !== undefined && { max_tokens: input.maxTokens }),
        ...(input.stopSequences !== undefined && { stop_sequences: input.stopSequences }),
        ...(input.metadata !== undefined && { metadata: input.metadata }),
        ...(input.status !== undefined && { status: input.status }),
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()
    if (error) throw error
    return toAIAgent(data)
  }

  async softDelete(organizationId: string, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('ai_agents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('id', id)
      .is('deleted_at', null)
    if (error) throw error
  }

  async duplicate(organizationId: string, id: string): Promise<AIAgent> {
    const existing = await this.getById(organizationId, id)
    if (!existing) throw new Error('Agent not found')
    return this.create(organizationId, {
      name: `${existing.name} (Copy)`,
      description: existing.description,
      systemPrompt: existing.systemPrompt,
      llmProvider: existing.llmProvider,
      llmModel: existing.llmModel,
      ttsProvider: existing.ttsProvider,
      ttsVoiceId: existing.ttsVoiceId,
      sttProvider: existing.sttProvider,
      sttModel: existing.sttModel,
      temperature: existing.temperature,
      maxTokens: existing.maxTokens,
      stopSequences: existing.stopSequences,
      metadata: existing.metadata,
      status: 'inactive',
    })
  }

  async markTested(organizationId: string, id: string): Promise<AIAgent> {
    const { data, error } = await supabaseAdmin
      .from('ai_agents')
      .update({
        last_tested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()
    if (error) throw error
    return toAIAgent(data)
  }
}
