import { supabaseAdmin } from '../lib/supabase'

export interface VoiceProviderRow {
  id: string
  key: string
  name: string
  category: 'tts' | 'stt' | 'both'
  description: string | null
  configSchema: Record<string, unknown>
  capabilities: Record<string, unknown>
  isActive: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export class VoiceProviderRepository {
  async listActive() {
    const { data, error } = await supabaseAdmin
      .from('voice_providers')
      .select('*')
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error
    return (data || []).map(this.mapRow)
  }

  async findById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('voice_providers')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    return data ? this.mapRow(data) : null
  }

  async findByKey(key: string) {
    const { data, error } = await supabaseAdmin
      .from('voice_providers')
      .select('*')
      .eq('key', key)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    return data ? this.mapRow(data) : null
  }

  async create(input: {
    key: string
    name: string
    category: 'tts' | 'stt' | 'both'
    description?: string | null
    configSchema?: Record<string, unknown>
    capabilities?: Record<string, unknown>
  }) {
    const { data, error } = await supabaseAdmin
      .from('voice_providers')
      .insert({
        key: input.key,
        name: input.name,
        category: input.category,
        description: input.description ?? null,
        config_schema: input.configSchema ?? {},
        capabilities: input.capabilities ?? {},
      })
      .select()
      .single()

    if (error) throw error
    return this.mapRow(data)
  }

  async update(id: string, input: {
    name?: string
    description?: string | null
    configSchema?: Record<string, unknown>
    capabilities?: Record<string, unknown>
    isActive?: boolean
  }) {
    const payload: Record<string, unknown> = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.description !== undefined) payload.description = input.description
    if (input.configSchema !== undefined) payload.config_schema = input.configSchema
    if (input.capabilities !== undefined) payload.capabilities = input.capabilities
    if (input.isActive !== undefined) payload.is_active = input.isActive

    const { data, error } = await supabaseAdmin
      .from('voice_providers')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return this.mapRow(data)
  }

  async softDelete(id: string) {
    const { error } = await supabaseAdmin
      .from('voice_providers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  }

  private mapRow(row: any): VoiceProviderRow {
    return {
      id: row.id,
      key: row.key,
      name: row.name,
      category: row.category,
      description: row.description ?? null,
      configSchema: row.config_schema ?? {},
      capabilities: row.capabilities ?? {},
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    }
  }
}
