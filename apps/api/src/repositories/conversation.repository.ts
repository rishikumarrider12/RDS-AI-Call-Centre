import { supabaseAdmin } from '../lib/supabase'
import type {
  AIConversation,
  ConversationMessage,
  LLMProviderConfig,
  PromptTemplate,
  AIMemory,
  LLMUsage,
  ConversationStatus,
} from '@rds/types'

export class ConversationRepository {
  // Conversations
  async listConversations(organizationId: string, options: {
    status?: ConversationStatus
    agentId?: string
    campaignId?: string
    contactId?: string
    search?: string
    dateFrom?: string
    dateTo?: string
    page?: number
    pageSize?: number
  } = {}) {
    const page = options.page && options.page > 0 ? options.page : 1
    const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 10
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabaseAdmin
      .from('ai_conversations')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (options.status) query = query.eq('status', options.status)
    if (options.agentId) query = query.eq('agent_id', options.agentId)
    if (options.campaignId) query = query.eq('campaign_id', options.campaignId)
    if (options.contactId) query = query.eq('contact_id', options.contactId)
    if (options.dateFrom) query = query.gte('started_at', options.dateFrom)
    if (options.dateTo) query = query.lte('started_at', options.dateTo)
    if (options.search && options.search.trim()) {
      const term = `%${options.search.trim()}%`
      query = query.or(`intent.ilike.${term},model.ilike.${term}`)
    }

    const { data, error, count } = await query
    if (error) throw error
    return {
      conversations: (data || []).map(this.mapConversation),
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async getConversation(organizationId: string, id: string): Promise<AIConversation | null> {
    const { data, error } = await supabaseAdmin
      .from('ai_conversations')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle()
    if (error) throw error
    return data ? this.mapConversation(data) : null
  }

  async createConversation(organizationId: string, input: Record<string, unknown>): Promise<AIConversation> {
    const { data, error } = await supabaseAdmin
      .from('ai_conversations')
      .insert({
        organization_id: organizationId,
        agent_id: input.agentId ?? null,
        campaign_id: input.campaignId ?? null,
        call_id: input.callId ?? null,
        contact_id: input.contactId ?? null,
        provider: input.provider ?? 'openai',
        model: input.model ?? 'gpt-4o-mini',
        metadata: input.metadata ?? {},
      })
      .select()
      .single()
    if (error) throw error
    return this.mapConversation(data)
  }

  async updateConversation(id: string, patch: Record<string, unknown>): Promise<AIConversation> {
    const { data, error } = await supabaseAdmin
      .from('ai_conversations')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return this.mapConversation(data)
  }

  async endConversation(id: string): Promise<AIConversation> {
    return this.updateConversation(id, { status: 'ended', ended_at: new Date().toISOString() })
  }

  // Messages
  async listMessages(conversationId: string, options: { page?: number; pageSize?: number } = {}) {
    const page = options.page && options.page > 0 ? options.page : 1
    const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 50
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabaseAdmin
      .from('conversation_messages')
      .select('*', { count: 'exact' })
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(from, to)

    if (error) throw error
    return {
      messages: (data || []).map(this.mapMessage),
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async addMessage(conversationId: string, organizationId: string, input: Record<string, unknown>): Promise<ConversationMessage> {
    const { data, error } = await supabaseAdmin
      .from('conversation_messages')
      .insert({
        conversation_id: conversationId,
        organization_id: organizationId,
        role: input.role ?? 'user',
        content: input.content ?? '',
        intent: input.intent ?? null,
        sentiment: input.sentiment ?? null,
        confidence: input.confidence ?? null,
        tokens_used: input.tokensUsed ?? null,
        latency_ms: input.latencyMs ?? null,
        provider: input.provider ?? null,
        model: input.model ?? null,
        metadata: input.metadata ?? {},
      })
      .select()
      .single()
    if (error) throw error
    return this.mapMessage(data)
  }

  // LLM Providers
  async listProviders(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('llm_providers')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map(this.mapProvider)
  }

  async getProvider(organizationId: string, id: string): Promise<LLMProviderConfig | null> {
    const { data, error } = await supabaseAdmin
      .from('llm_providers')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data ? this.mapProvider(data) : null
  }

  async createProvider(organizationId: string, input: Record<string, unknown>): Promise<LLMProviderConfig> {
    const { data, error } = await supabaseAdmin
      .from('llm_providers')
      .insert({
        organization_id: organizationId,
        name: input.name,
        provider: input.provider,
        api_key_encrypted: input.apiKey ?? null,
        api_base_url: input.apiBaseUrl ?? null,
        default_model: input.defaultModel,
        temperature: input.temperature ?? 0.7,
        max_tokens: input.maxTokens ?? 1024,
        top_p: input.topP ?? null,
        frequency_penalty: input.frequencyPenalty ?? null,
        presence_penalty: input.presencePenalty ?? null,
        stop_sequences: input.stopSequences ?? [],
        metadata: input.metadata ?? {},
      })
      .select()
      .single()
    if (error) throw error
    return this.mapProvider(data)
  }

  async updateProvider(organizationId: string, id: string, input: Record<string, unknown>): Promise<LLMProviderConfig> {
    const { data, error } = await supabaseAdmin
      .from('llm_providers')
      .update(input)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .select()
      .single()
    if (error) throw error
    return this.mapProvider(data)
  }

  async softDeleteProvider(organizationId: string, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('llm_providers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
    if (error) throw error
  }

  // Prompt templates
  async listPromptTemplates(organizationId: string, options: { search?: string } = {}) {
    let query = supabaseAdmin
      .from('prompt_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (options.search && options.search.trim()) {
      query = query.ilike('name', `%${options.search.trim()}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []).map(this.mapPromptTemplate)
  }

  async getPromptTemplate(organizationId: string, id: string): Promise<PromptTemplate | null> {
    const { data, error } = await supabaseAdmin
      .from('prompt_templates')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data ? this.mapPromptTemplate(data) : null
  }

  async createPromptTemplate(organizationId: string, input: Record<string, unknown>): Promise<PromptTemplate> {
    const { data, error } = await supabaseAdmin
      .from('prompt_templates')
      .insert({
        organization_id: organizationId,
        name: input.name,
        description: input.description ?? null,
        system_prompt: input.systemPrompt,
        user_prompt_template: input.userPromptTemplate ?? null,
        variables: input.variables ?? [],
        tags: input.tags ?? [],
        version: 1,
      })
      .select()
      .single()
    if (error) throw error
    return this.mapPromptTemplate(data)
  }

  async updatePromptTemplate(organizationId: string, id: string, input: Record<string, unknown>): Promise<PromptTemplate> {
    const { data, error } = await supabaseAdmin
      .from('prompt_templates')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .select()
      .single()
    if (error) throw error
    return this.mapPromptTemplate(data)
  }

  async softDeletePromptTemplate(organizationId: string, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('prompt_templates')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
    if (error) throw error
  }

  // Memory
  async listMemory(organizationId: string, options: { contactId?: string; agentId?: string } = {}) {
    let query = supabaseAdmin
      .from('ai_memory')
      .select('*')
      .eq('organization_id', organizationId)
      .order('importance_score', { ascending: false })

    if (options.contactId) query = query.eq('contact_id', options.contactId)
    if (options.agentId) query = query.eq('agent_id', options.agentId)

    const { data, error } = await query
    if (error) throw error
    return (data || []).map(this.mapMemory)
  }

  async createMemory(organizationId: string, input: Record<string, unknown>): Promise<AIMemory> {
    const { data, error } = await supabaseAdmin
      .from('ai_memory')
      .insert({
        organization_id: organizationId,
        contact_id: input.contactId ?? null,
        agent_id: input.agentId ?? null,
        conversation_id: input.conversationId ?? null,
        memory_type: input.memoryType,
        content: input.content,
        importance_score: input.importanceScore ?? 0.5,
        expires_at: input.expiresAt ?? null,
        metadata: input.metadata ?? {},
      })
      .select()
      .single()
    if (error) throw error
    return this.mapMemory(data)
  }

  // Usage
  async recordUsage(organizationId: string, input: Record<string, unknown>): Promise<LLMUsage> {
    const { data, error } = await supabaseAdmin
      .from('llm_usage')
      .insert({
        organization_id: organizationId,
        conversation_id: input.conversationId ?? null,
        message_id: input.messageId ?? null,
        provider: input.provider,
        model: input.model,
        prompt_tokens: input.promptTokens,
        completion_tokens: input.completionTokens,
        total_tokens: input.totalTokens,
        latency_ms: input.latencyMs ?? null,
        cost: input.cost ?? null,
        currency: input.currency ?? 'USD',
        recorded_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw error
    return this.mapUsage(data)
  }

  async getUsage(organizationId: string, options: { dateFrom?: string; dateTo?: string } = {}) {
    let query = supabaseAdmin
      .from('llm_usage')
      .select('*')
      .eq('organization_id', organizationId)

    if (options.dateFrom) query = query.gte('recorded_at', options.dateFrom)
    if (options.dateTo) query = query.lte('recorded_at', options.dateTo)

    const { data, error } = await query
    if (error) throw error
    return (data || []).map(this.mapUsage)
  }

  private mapConversation(row: any): AIConversation {
    return {
      id: row.id,
      organizationId: row.organization_id,
      agentId: row.agent_id ?? null,
      campaignId: row.campaign_id ?? null,
      callId: row.call_id ?? null,
      contactId: row.contact_id ?? null,
      provider: row.provider,
      model: row.model,
      intent: row.intent ?? null,
      sentiment: row.sentiment ?? null,
      status: row.status,
      startedAt: row.started_at,
      endedAt: row.ended_at ?? null,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private mapMessage(row: any): ConversationMessage {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      organizationId: row.organization_id,
      role: row.role,
      content: row.content,
      intent: row.intent ?? null,
      sentiment: row.sentiment ?? null,
      confidence: row.confidence ?? null,
      tokensUsed: row.tokens_used ?? null,
      latencyMs: row.latency_ms ?? null,
      provider: row.provider ?? null,
      model: row.model ?? null,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
    }
  }

  private mapProvider(row: any): LLMProviderConfig {
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      provider: row.provider,
      apiKeyEncrypted: row.api_key_encrypted ?? null,
      apiBaseUrl: row.api_base_url ?? null,
      defaultModel: row.default_model,
      temperature: Number(row.temperature),
      maxTokens: Number(row.max_tokens),
      topP: row.top_p ?? null,
      frequencyPenalty: row.frequency_penalty ?? null,
      presencePenalty: row.presence_penalty ?? null,
      stopSequences: Array.isArray(row.stop_sequences) ? row.stop_sequences : [],
      metadata: row.metadata ?? {},
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private mapPromptTemplate(row: any): PromptTemplate {
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      description: row.description ?? null,
      systemPrompt: row.system_prompt,
      userPromptTemplate: row.user_prompt_template ?? null,
      variables: Array.isArray(row.variables) ? row.variables : [],
      tags: Array.isArray(row.tags) ? row.tags : [],
      version: row.version,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private mapMemory(row: any): AIMemory {
    return {
      id: row.id,
      organizationId: row.organization_id,
      contactId: row.contact_id ?? null,
      agentId: row.agent_id ?? null,
      conversationId: row.conversation_id ?? null,
      memoryType: row.memory_type,
      content: row.content,
      importanceScore: Number(row.importance_score),
      expiresAt: row.expires_at ?? null,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private mapUsage(row: any): LLMUsage {
    return {
      id: row.id,
      organizationId: row.organization_id,
      conversationId: row.conversation_id ?? null,
      messageId: row.message_id ?? null,
      provider: row.provider,
      model: row.model,
      promptTokens: Number(row.prompt_tokens),
      completionTokens: Number(row.completion_tokens),
      totalTokens: Number(row.total_tokens),
      latencyMs: row.latency_ms ? Number(row.latency_ms) : null,
      cost: row.cost ? Number(row.cost) : null,
      currency: row.currency,
      recordedAt: row.recorded_at,
      createdAt: row.created_at,
    }
  }
}
