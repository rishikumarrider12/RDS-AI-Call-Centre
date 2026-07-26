import { supabaseAdmin } from '../lib/supabase'

export interface NotificationChannelRow {
  id: string
  organization_id: string
  name: string
  type: string
  config: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export class NotificationChannelRepository {
  async list(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('notification_channels')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as NotificationChannelRow[]
  }

  async findById(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('notification_channels')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data as NotificationChannelRow | null
  }

  async create(organizationId: string, input: {
    name: string
    type: string
    config?: Record<string, unknown>
    isActive?: boolean
  }) {
    const { data, error } = await supabaseAdmin
      .from('notification_channels')
      .insert({
        organization_id: organizationId,
        name: input.name,
        type: input.type,
        config: input.config ?? {},
        is_active: input.isActive ?? true,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(id: string, input: {
    name?: string
    type?: string
    config?: Record<string, unknown>
    isActive?: boolean
  }) {
    const payload: Record<string, unknown> = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.type !== undefined) payload.type = input.type
    if (input.config !== undefined) payload.config = input.config
    if (input.isActive !== undefined) payload.is_active = input.isActive

    const { data, error } = await supabaseAdmin
      .from('notification_channels')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async softDelete(id: string) {
    const { error } = await supabaseAdmin
      .from('notification_channels')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }
}
