import { VoiceProviderRepository } from '../repositories/voiceProvider.repository'
import type { VoiceProvider, VoiceProviderCategory } from '@rds/types'
import { recordAudit } from '../lib/audit'
import { ProviderDIContainer } from '../lib/providers'

const DI = ProviderDIContainer.getInstance()

export class VoiceProviderService {
  private repository = new VoiceProviderRepository()

  async listProviders(): Promise<VoiceProvider[]> {
    const rows = await this.repository.listActive()
    return rows.map((r) => ({
      id: r.id,
      key: r.key,
      name: r.name,
      category: r.category as VoiceProviderCategory,
      description: r.description ?? null,
      configSchema: r.configSchema,
      capabilities: r.capabilities,
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))
  }

  async getProviderByKey(key: string): Promise<VoiceProvider | null> {
    const row = await this.repository.findByKey(key)
    if (!row) return null
    return {
      id: row.id,
      key: row.key,
      name: row.name,
      category: row.category as VoiceProviderCategory,
      description: row.description ?? null,
      configSchema: row.configSchema,
      capabilities: row.capabilities,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async createProvider(actorId: string, input: {
    key: string
    name: string
    category: 'tts' | 'stt' | 'both'
    description?: string | null
    configSchema?: Record<string, unknown>
    capabilities?: Record<string, unknown>
  }): Promise<VoiceProvider> {
    const row = await this.repository.create(input)
    await recordAudit({
      organizationId: '',
      action: 'voice_provider.created',
      actorId,
      actorType: 'user',
      resourceType: 'voice_provider',
      resourceId: row.id,
      after: row as unknown as Record<string, unknown>,
    })
    return {
      id: row.id,
      key: row.key,
      name: row.name,
      category: row.category as VoiceProviderCategory,
      description: row.description ?? null,
      configSchema: row.configSchema,
      capabilities: row.capabilities,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async updateProvider(actorId: string, id: string, input: {
    name?: string
    description?: string | null
    configSchema?: Record<string, unknown>
    capabilities?: Record<string, unknown>
    isActive?: boolean
  }): Promise<VoiceProvider> {
    const existing = await this.repository.findById(id)
    if (!existing) throw new Error('Voice provider not found')
    const row = await this.repository.update(id, input)
    await recordAudit({
      organizationId: '',
      action: 'voice_provider.updated',
      actorId,
      actorType: 'user',
      resourceType: 'voice_provider',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
      after: row as unknown as Record<string, unknown>,
    })
    return {
      id: row.id,
      key: row.key,
      name: row.name,
      category: row.category as VoiceProviderCategory,
      description: row.description ?? null,
      configSchema: row.configSchema,
      capabilities: row.capabilities,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  async deleteProvider(actorId: string, id: string): Promise<void> {
    const existing = await this.repository.findById(id)
    if (!existing) throw new Error('Voice provider not found')
    await this.repository.softDelete(id)
    await recordAudit({
      organizationId: '',
      action: 'voice_provider.deleted',
      actorId,
      actorType: 'user',
      resourceType: 'voice_provider',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
    })
  }

  getDIContainer(): ProviderDIContainer {
    return DI
  }

  getRegistry(): import('../lib/providers/VoiceProviderRegistry').VoiceProviderRegistry {
    return DI.getRegistry()
  }

  getFactory(): import('../lib/providers/VoiceProviderFactory').VoiceProviderFactory {
    return DI.getFactory()
  }
}
