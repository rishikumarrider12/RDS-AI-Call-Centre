import { ConversationRepository } from '../repositories/conversation.repository'
import type {
  AIConversation,
  ConversationMessage,
  LLMProviderConfig,
  LLMProviderInput,
  PromptTemplate,
  PromptTemplateInput,
  AIMemory,
  LLMUsage,
  ConversationSummary,
} from '@rds/types'
import { recordAudit } from '../lib/audit'

export class ConversationService {
  private repository = new ConversationRepository()

  // Dashboard metrics
  async getDashboard(organizationId: string): Promise<ConversationSummary> {
    const conversations = await this.repository.listConversations(organizationId, { pageSize: 1000 })
    const all = conversations.conversations
    const active = all.filter((c) => c.status === 'active').length
    const ended = all.filter((c) => c.status === 'ended')
    const successRate = all.length > 0 ? Math.round((ended.length / all.length) * 100) : 0

    const usage = await this.repository.getUsage(organizationId)
    const totalTokens = usage.reduce((sum, u) => sum + u.totalTokens, 0)
    const dailyCost = usage.reduce((sum, u) => sum + (u.cost || 0), 0)
    const avgLatency = usage.length > 0 ? Math.round(usage.reduce((sum, u) => sum + (u.latencyMs || 0), 0) / usage.length) : 0

    return {
      active,
      avgResponseTime: avgLatency,
      tokenUsage: totalTokens,
      dailyCost,
      successRate,
      aiSatisfaction: 0,
    }
  }

  // Conversations
  async listConversations(organizationId: string, options: {
    status?: string
    agentId?: string
    campaignId?: string
    contactId?: string
    search?: string
    dateFrom?: string
    dateTo?: string
    page?: number
    pageSize?: number
  } = {}) {
    return this.repository.listConversations(organizationId, {
      ...options,
      status: options.status as any,
    })
  }

  async getConversation(organizationId: string, id: string): Promise<AIConversation> {
    const conversation = await this.repository.getConversation(organizationId, id)
    if (!conversation) throw new Error('Conversation not found')
    return conversation
  }

  async startConversation(organizationId: string, actorId: string, input: Record<string, unknown>): Promise<AIConversation> {
    const conversation = await this.repository.createConversation(organizationId, input)
    await this.repository.addMessage(conversation.id, organizationId, {
      role: 'system',
      content: input.systemPrompt || 'You are a helpful AI assistant.',
      provider: input.provider,
      model: input.model,
    })
    await recordAudit({
      organizationId,
      action: 'conversation.start',
      actorId,
      resourceType: 'ai_conversation',
      resourceId: conversation.id,
      after: conversation as unknown as Record<string, unknown>,
    })
    return conversation
  }

  async endConversation(organizationId: string, actorId: string, id: string): Promise<AIConversation> {
    const existing = await this.repository.getConversation(organizationId, id)
    if (!existing) throw new Error('Conversation not found')
    const conversation = await this.repository.endConversation(id)
    await recordAudit({
      organizationId,
      action: 'conversation.end',
      actorId,
      resourceType: 'ai_conversation',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
      after: conversation as unknown as Record<string, unknown>,
    })
    return conversation
  }

  async transferConversation(organizationId: string, actorId: string, id: string, toAgentId: string): Promise<AIConversation> {
    const existing = await this.repository.getConversation(organizationId, id)
    if (!existing) throw new Error('Conversation not found')
    const conversation = await this.repository.updateConversation(id, { agent_id: toAgentId, status: 'transferred' })
    await recordAudit({
      organizationId,
      action: 'conversation.transfer',
      actorId,
      resourceType: 'ai_conversation',
      resourceId: id,
      after: { ...conversation, transferredToAgentId: toAgentId } as unknown as Record<string, unknown>,
    })
    return conversation
  }

  async getMessages(organizationId: string, conversationId: string, options: { page?: number; pageSize?: number } = {}) {
    const conversation = await this.repository.getConversation(organizationId, conversationId)
    if (!conversation) throw new Error('Conversation not found')
    return this.repository.listMessages(conversationId, options)
  }

  async addMessage(organizationId: string, conversationId: string, input: Record<string, unknown>): Promise<ConversationMessage> {
    const conversation = await this.repository.getConversation(organizationId, conversationId)
    if (!conversation) throw new Error('Conversation not found')
    return this.repository.addMessage(conversationId, organizationId, input)
  }

  // LLM Providers
  async listProviders(organizationId: string): Promise<LLMProviderConfig[]> {
    return this.repository.listProviders(organizationId)
  }

  async getProvider(organizationId: string, id: string): Promise<LLMProviderConfig> {
    const provider = await this.repository.getProvider(organizationId, id)
    if (!provider) throw new Error('LLM provider not found')
    return provider
  }

  async createProvider(organizationId: string, actorId: string, input: LLMProviderInput): Promise<LLMProviderConfig> {
    const provider = await this.repository.createProvider(organizationId, input as unknown as Record<string, unknown>)
    await recordAudit({
      organizationId,
      action: 'llm_provider.create',
      actorId,
      resourceType: 'llm_provider',
      resourceId: provider.id,
      after: provider as unknown as Record<string, unknown>,
    })
    return provider
  }

  async updateProvider(organizationId: string, actorId: string, id: string, input: Record<string, unknown>): Promise<LLMProviderConfig> {
    const existing = await this.repository.getProvider(organizationId, id)
    if (!existing) throw new Error('LLM provider not found')
    const provider = await this.repository.updateProvider(organizationId, id, input)
    await recordAudit({
      organizationId,
      action: 'llm_provider.update',
      actorId,
      resourceType: 'llm_provider',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
      after: provider as unknown as Record<string, unknown>,
    })
    return provider
  }

  async deleteProvider(organizationId: string, actorId: string, id: string): Promise<void> {
    const existing = await this.repository.getProvider(organizationId, id)
    if (!existing) throw new Error('LLM provider not found')
    await this.repository.softDeleteProvider(organizationId, id)
    await recordAudit({
      organizationId,
      action: 'llm_provider.delete',
      actorId,
      resourceType: 'llm_provider',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
    })
  }

  // Prompt templates
  async listPromptTemplates(organizationId: string, options: { search?: string } = {}): Promise<PromptTemplate[]> {
    return this.repository.listPromptTemplates(organizationId, options)
  }

  async getPromptTemplate(organizationId: string, id: string): Promise<PromptTemplate> {
    const template = await this.repository.getPromptTemplate(organizationId, id)
    if (!template) throw new Error('Prompt template not found')
    return template
  }

  async createPromptTemplate(organizationId: string, actorId: string, input: PromptTemplateInput): Promise<PromptTemplate> {
    const template = await this.repository.createPromptTemplate(organizationId, input as unknown as Record<string, unknown>)
    await recordAudit({
      organizationId,
      action: 'prompt_template.create',
      actorId,
      resourceType: 'prompt_template',
      resourceId: template.id,
      after: template as unknown as Record<string, unknown>,
    })
    return template
  }

  async updatePromptTemplate(organizationId: string, actorId: string, id: string, input: Record<string, unknown>): Promise<PromptTemplate> {
    const existing = await this.repository.getPromptTemplate(organizationId, id)
    if (!existing) throw new Error('Prompt template not found')
    const template = await this.repository.updatePromptTemplate(organizationId, id, input)
    await recordAudit({
      organizationId,
      action: 'prompt_template.update',
      actorId,
      resourceType: 'prompt_template',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
      after: template as unknown as Record<string, unknown>,
    })
    return template
  }

  async deletePromptTemplate(organizationId: string, actorId: string, id: string): Promise<void> {
    const existing = await this.repository.getPromptTemplate(organizationId, id)
    if (!existing) throw new Error('Prompt template not found')
    await this.repository.softDeletePromptTemplate(organizationId, id)
    await recordAudit({
      organizationId,
      action: 'prompt_template.delete',
      actorId,
      resourceType: 'prompt_template',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
    })
  }

  // Memory
  async listMemory(organizationId: string, options: { contactId?: string; agentId?: string } = {}): Promise<AIMemory[]> {
    return this.repository.listMemory(organizationId, options)
  }

  async createMemory(organizationId: string, actorId: string, input: Record<string, unknown>): Promise<AIMemory> {
    const memory = await this.repository.createMemory(organizationId, input)
    await recordAudit({
      organizationId,
      action: 'ai_memory.create',
      actorId,
      resourceType: 'ai_memory',
      resourceId: memory.id,
      after: memory as unknown as Record<string, unknown>,
    })
    return memory
  }

  // Usage
  async recordUsage(organizationId: string, input: Record<string, unknown>): Promise<LLMUsage> {
    return this.repository.recordUsage(organizationId, input)
  }

  async getUsage(organizationId: string, options: { dateFrom?: string; dateTo?: string } = {}): Promise<LLMUsage[]> {
    return this.repository.getUsage(organizationId, options)
  }
}
