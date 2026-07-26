import { VoiceModelRepository } from '../repositories/voiceModel.repository'
import type { VoiceModel } from '@rds/types'
import { recordAudit } from '../lib/audit'

export class VoiceModelService {
  private repository = new VoiceModelRepository()

  async listModels(providerKey: string, type?: string): Promise<VoiceModel[]> {
    const rows = await this.repository.listByProvider(providerKey, type)
    return rows.map((r) => this.mapRow(r))
  }

  async getModel(id: string): Promise<VoiceModel | null> {
    const row = await this.repository.findById(id)
    return row ? this.mapRow(row) : null
  }

  async createModel(organizationId: string, actorId: string, input: {
    providerKey: string
    modelId: string
    name: string
    type: 'tts' | 'stt'
    language: string
    gender?: string
    metadata?: Record<string, unknown>
  }): Promise<VoiceModel> {
    const row = await this.repository.create(input)
    await recordAudit({
      organizationId,
      action: 'voice_model.created',
      actorId,
      actorType: 'user',
      resourceType: 'voice_model',
      resourceId: row.id,
      after: row as unknown as Record<string, unknown>,
    })
    return this.mapRow(row)
  }

  async updateModel(organizationId: string, actorId: string, id: string, input: {
    name?: string
    isActive?: boolean
    metadata?: Record<string, unknown>
  }): Promise<VoiceModel> {
    const existing = await this.repository.findById(id)
    if (!existing) throw new Error('Voice model not found')
    const row = await this.repository.update(id, input)
    await recordAudit({
      organizationId,
      action: 'voice_model.updated',
      actorId,
      actorType: 'user',
      resourceType: 'voice_model',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
      after: row as unknown as Record<string, unknown>,
    })
    return this.mapRow(row)
  }

  async deleteModel(organizationId: string, actorId: string, id: string): Promise<void> {
    const existing = await this.repository.findById(id)
    if (!existing) throw new Error('Voice model not found')
    await this.repository.softDelete(id)
    await recordAudit({
      organizationId,
      action: 'voice_model.deleted',
      actorId,
      actorType: 'user',
      resourceType: 'voice_model',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
    })
  }

  private mapRow(row: any): VoiceModel {
    return {
      id: row.id,
      providerKey: row.providerKey,
      modelId: row.modelId,
      name: row.name,
      type: row.type,
      language: row.language,
      gender: row.gender,
      isActive: row.isActive,
      metadata: row.metadata ?? {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }
}
