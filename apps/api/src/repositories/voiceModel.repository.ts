import { supabaseAdmin } from '../lib/supabase'

export interface VoiceModelRow {
  id: string
  providerKey: string
  modelId: string
  name: string
  type: 'tts' | 'stt'
  language: string
  gender: 'male' | 'female' | 'neutral' | 'unknown'
  isActive: boolean
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export class VoiceModelRepository {
  async listByProvider(providerKey: string, type?: string) {
    let query = supabaseAdmin
      .from('voice_models')
      .select('*')
      .eq('provider_key', providerKey)
      .is('deleted_at', null)
      .order('language', { ascending: true })

    if (type) query = query.eq('type', type)

    const { data, error } = await query
    if (error) throw error
    return (data || []).map(this.mapRow)
  }

  async listActiveByLanguage(type: string, language?: string) {
    let query = supabaseAdmin
      .from('voice_models')
      .select('*')
      .eq('type', type)
      .eq('is_active', true)
      .is('deleted_at', null)

    if (language) query = query.eq('language', language)

    const { data, error } = await query
    if (error) throw error
    return (data || []).map(this.mapRow)
  }

  async findById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('voice_models')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    return data ? this.mapRow(data) : null
  }

  async create(input: {
    providerKey: string
    modelId: string
    name: string
    type: 'tts' | 'stt'
    language: string
    gender?: string
    metadata?: Record<string, unknown>
  }) {
    const { data, error } = await supabaseAdmin
      .from('voice_models')
      .insert({
        provider_key: input.providerKey,
        model_id: input.modelId,
        name: input.name,
        type: input.type,
        language: input.language,
        gender: input.gender ?? 'unknown',
        metadata: input.metadata ?? {},
      })
      .select()
      .single()

    if (error) throw error
    return this.mapRow(data)
  }

  async update(id: string, input: {
    name?: string
    isActive?: boolean
    metadata?: Record<string, unknown>
  }) {
    const payload: Record<string, unknown> = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.isActive !== undefined) payload.is_active = input.isActive
    if (input.metadata !== undefined) payload.metadata = input.metadata

    const { data, error } = await supabaseAdmin
      .from('voice_models')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return this.mapRow(data)
  }

  async softDelete(id: string) {
    const { error } = await supabaseAdmin
      .from('voice_models')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  }

  private mapRow(row: any): VoiceModelRow {
    return {
      id: row.id,
      providerKey: row.provider_key,
      modelId: row.model_id,
      name: row.name,
      type: row.type,
      language: row.language,
      gender: row.gender,
      isActive: row.is_active,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    }
  }
}
