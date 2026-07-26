import { CampaignRepository } from '../repositories/campaign.repository'
import type { Campaign, CampaignSummary } from '@rds/types'
import { recordAudit } from '../lib/audit'

export class CampaignService {
  private repository = new CampaignRepository()

  private toCampaign(dbCampaign: any): Campaign {
    return {
      id: dbCampaign.id,
      organizationId: dbCampaign.organization_id,
      name: dbCampaign.name,
      description: dbCampaign.description ?? null,
      type: dbCampaign.type,
      status: dbCampaign.status,
      direction: dbCampaign.direction,
      aiAgentId: dbCampaign.ai_agent_id ?? null,
      aiScriptId: dbCampaign.ai_script_id ?? null,
      voiceProfileId: dbCampaign.voice_profile_id ?? null,
      fromNumberId: dbCampaign.from_number_id ?? null,
      contactListId: dbCampaign.contact_list_id ?? null,
      schedule: dbCampaign.schedule ?? {},
      retryPolicy: dbCampaign.retry_policy ?? {},
      dialingStrategy: dbCampaign.dialing_strategy ?? null,
      maxConcurrent: dbCampaign.max_concurrent ?? null,
      totalContacts: dbCampaign.total_contacts ?? 0,
      completedContacts: dbCampaign.completed_contacts ?? 0,
      failedContacts: dbCampaign.failed_contacts ?? 0,
      script: dbCampaign.script ?? '',
      voice: dbCampaign.voice ?? '',
      startedAt: dbCampaign.started_at ?? null,
      endedAt: dbCampaign.ended_at ?? null,
      createdAt: dbCampaign.created_at,
      updatedAt: dbCampaign.updated_at,
    }
  }

  private toSummary(row: any): CampaignSummary {
    return {
      id: row.id,
      name: row.name,
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      status: row.status,
      totalContacts: row.total_contacts ?? 0,
      completedContacts: row.completed_contacts ?? 0,
      failedContacts: row.failed_contacts ?? 0,
      completionRate: Number(row.completion_rate ?? 0),
      totalCalls: Number(row.total_calls ?? 0),
      connectedCalls: Number(row.connected_calls ?? 0),
      failedCalls: Number(row.failed_calls ?? 0),
      totalMinutes: Number(row.total_minutes ?? 0),
      totalCost: Number(row.total_cost ?? 0),
    }
  }

  async list(
    organizationId: string,
    options: { search?: string; status?: string; page?: number; pageSize?: number }
  ) {
    const result = await this.repository.list(organizationId, options)
    return {
      data: result.campaigns.map((c) => this.toSummary(c)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    }
  }

  async getById(organizationId: string, id: string): Promise<Campaign> {
    const dbCampaign = await this.repository.findById(organizationId, id)
    if (!dbCampaign) throw new Error('Campaign not found')
    return this.toCampaign(dbCampaign)
  }

  async create(
    organizationId: string,
    createdById: string,
    input: {
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
  ): Promise<Campaign> {
    if (!input.name || input.name.trim().length < 2) {
      throw new Error('Campaign name must be at least 2 characters')
    }
    const dbCampaign = await this.repository.create(organizationId, createdById, input)
    return this.toCampaign(dbCampaign)
  }

  async update(
    organizationId: string,
    id: string,
    input: {
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
  ): Promise<Campaign> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Campaign not found')
    const dbCampaign = await this.repository.update(id, input)
    return this.toCampaign(dbCampaign)
  }

  async setStatus(
    organizationId: string,
    id: string,
    status: 'draft' | 'scheduled' | 'running' | 'paused' | 'ended'
  ): Promise<Campaign> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Campaign not found')
    const dbCampaign = await this.repository.setStatus(id, status)
    return this.toCampaign(dbCampaign)
  }

  async delete(organizationId: string, id: string) {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Campaign not found')
    await this.repository.softDelete(id)
  }

  async start(organizationId: string, actorId: string, id: string): Promise<Campaign> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Campaign not found')
    const dbCampaign = await this.repository.setStatus(id, 'running')
    const campaign = this.toCampaign(dbCampaign)
    await recordAudit({
      organizationId,
      action: 'campaign.start',
      actorId,
      resourceType: 'campaign',
      resourceId: id,
      after: campaign as unknown as Record<string, unknown>,
    })
    return campaign
  }

  async pause(organizationId: string, actorId: string, id: string): Promise<Campaign> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Campaign not found')
    const dbCampaign = await this.repository.setStatus(id, 'paused')
    const campaign = this.toCampaign(dbCampaign)
    await recordAudit({
      organizationId,
      action: 'campaign.pause',
      actorId,
      resourceType: 'campaign',
      resourceId: id,
      after: campaign as unknown as Record<string, unknown>,
    })
    return campaign
  }

  async resume(organizationId: string, actorId: string, id: string): Promise<Campaign> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Campaign not found')
    const dbCampaign = await this.repository.setStatus(id, 'running')
    const campaign = this.toCampaign(dbCampaign)
    await recordAudit({
      organizationId,
      action: 'campaign.resume',
      actorId,
      resourceType: 'campaign',
      resourceId: id,
      after: campaign as unknown as Record<string, unknown>,
    })
    return campaign
  }

  async stop(organizationId: string, actorId: string, id: string): Promise<Campaign> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Campaign not found')
    const dbCampaign = await this.repository.setStatus(id, 'ended')
    const campaign = this.toCampaign(dbCampaign)
    await recordAudit({
      organizationId,
      action: 'campaign.stop',
      actorId,
      resourceType: 'campaign',
      resourceId: id,
      after: campaign as unknown as Record<string, unknown>,
    })
    return campaign
  }

  async duplicate(organizationId: string, actorId: string, id: string): Promise<Campaign> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Campaign not found')
    const dbCampaign = await this.repository.create(organizationId, actorId, {
      name: `${existing.name} (Copy)`,
      description: existing.description,
      type: existing.type,
      direction: existing.direction,
      aiAgentId: existing.ai_agent_id,
      aiScriptId: existing.ai_script_id,
      voiceProfileId: existing.voice_profile_id,
      fromNumberId: existing.from_number_id,
      contactListId: existing.contact_list_id,
      schedule: existing.schedule,
      retryPolicy: existing.retry_policy,
      dialingStrategy: existing.dialing_strategy,
      maxConcurrent: existing.max_concurrent,
      script: existing.script,
      voice: existing.voice,
    })
    const campaign = this.toCampaign(dbCampaign)
    await recordAudit({
      organizationId,
      action: 'campaign.duplicate',
      actorId,
      resourceType: 'campaign',
      resourceId: campaign.id,
      after: campaign as unknown as Record<string, unknown>,
    })
    return campaign
  }
}
