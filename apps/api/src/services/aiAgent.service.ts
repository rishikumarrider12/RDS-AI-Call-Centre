import { AIAgentRepository } from '../repositories/aiAgent.repository'
import type { AIAgent, AIAgentInput, AIAgentFilter } from '@rds/types'
import { recordAudit } from '../lib/audit'

export class AIAgentService {
  private repository = new AIAgentRepository()

  async list(organizationId: string, filters?: AIAgentFilter): Promise<AIAgent[]> {
    return this.repository.list(organizationId, filters)
  }

  async getById(organizationId: string, id: string): Promise<AIAgent> {
    const agent = await this.repository.getById(organizationId, id)
    if (!agent) throw new Error('AI Agent not found')
    return agent
  }

  async create(organizationId: string, createdById: string, input: AIAgentInput): Promise<AIAgent> {
    if (!input.name.trim()) {
      throw new Error('Agent name is required')
    }
    if (!input.systemPrompt.trim()) {
      throw new Error('System prompt is required')
    }
    const agent = await this.repository.create(organizationId, input)
    await recordAudit({
      organizationId,
      action: 'ai_agent.create',
      actorId: createdById,
      resourceType: 'ai_agent',
      resourceId: agent.id,
      after: agent as unknown as Record<string, unknown>,
    })
    return agent
  }

  async update(organizationId: string, createdById: string, id: string, input: Partial<AIAgentInput> & { status?: string }): Promise<AIAgent> {
    const existing = await this.repository.getById(organizationId, id)
    if (!existing) throw new Error('AI Agent not found')
    const agent = await this.repository.update(organizationId, id, input)
    await recordAudit({
      organizationId,
      action: 'ai_agent.update',
      actorId: createdById,
      resourceType: 'ai_agent',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
      after: agent as unknown as Record<string, unknown>,
    })
    return agent
  }

  async delete(organizationId: string, createdById: string, id: string): Promise<void> {
    const existing = await this.repository.getById(organizationId, id)
    if (!existing) throw new Error('AI Agent not found')
    await this.repository.softDelete(organizationId, id)
    await recordAudit({
      organizationId,
      action: 'ai_agent.delete',
      actorId: createdById,
      resourceType: 'ai_agent',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
    })
  }

  async duplicate(organizationId: string, createdById: string, id: string): Promise<AIAgent> {
    const agent = await this.repository.duplicate(organizationId, id)
    await recordAudit({
      organizationId,
      action: 'ai_agent.duplicate',
      actorId: createdById,
      resourceType: 'ai_agent',
      resourceId: agent.id,
      after: agent as unknown as Record<string, unknown>,
    })
    return agent
  }

  async test(organizationId: string, createdById: string, id: string): Promise<AIAgent> {
    const agent = await this.repository.markTested(organizationId, id)
    await recordAudit({
      organizationId,
      action: 'ai_agent.test',
      actorId: createdById,
      resourceType: 'ai_agent',
      resourceId: id,
      after: { lastTestedAt: agent.lastTestedAt } as Record<string, unknown>,
    })
    return agent
  }
}
