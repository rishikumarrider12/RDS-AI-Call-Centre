import { supabaseAdmin } from '../lib/supabase'

export interface CreateIntegrationInput {
  organizationId: string
  createdById: string
  provider: string
  name: string
  status?: 'active' | 'inactive' | 'error'
  config?: Record<string, unknown>
  webhookUrl?: string | null
}

export interface UpdateIntegrationInput {
  name?: string
  status?: 'active' | 'inactive' | 'error'
  config?: Record<string, unknown>
  webhookUrl?: string | null
}

export class IntegrationRepository {
  async list(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }

  async findById(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('integrations')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async create(input: CreateIntegrationInput) {
    const { data, error } = await supabaseAdmin
      .from('integrations')
      .insert({
        organization_id: input.organizationId,
        created_by: input.createdById,
        provider: input.provider,
        name: input.name,
        status: input.status ?? 'active',
        config: input.config ?? {},
        webhook_url: input.webhookUrl ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(id: string, input: UpdateIntegrationInput) {
    const payload: Record<string, unknown> = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.status !== undefined) payload.status = input.status
    if (input.config !== undefined) payload.config = input.config
    if (input.webhookUrl !== undefined) payload.webhook_url = input.webhookUrl
    const { data, error } = await supabaseAdmin
      .from('integrations')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async softDelete(id: string) {
    const { error } = await supabaseAdmin
      .from('integrations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }
}
