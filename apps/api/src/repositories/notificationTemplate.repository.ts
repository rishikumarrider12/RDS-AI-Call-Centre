import { supabaseAdmin } from '../lib/supabase'

export interface NotificationTemplateRow {
  id: string
  organization_id: string
  channel_id: string
  name: string
  subject: string | null
  body: string
  variables: string[]
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export class NotificationTemplateRepository {
  async list(organizationId: string, channelId?: string) {
    let query = supabaseAdmin
      .from('notification_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (channelId) query = query.eq('channel_id', channelId)

    const { data, error } = await query
    if (error) throw error
    return (data || []) as NotificationTemplateRow[]
  }

  async findById(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('notification_templates')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data as NotificationTemplateRow | null
  }

  async create(organizationId: string, input: {
    channelId: string
    name: string
    subject?: string | null
    body: string
    variables?: string[]
    isActive?: boolean
  }) {
    const { data, error } = await supabaseAdmin
      .from('notification_templates')
      .insert({
        organization_id: organizationId,
        channel_id: input.channelId,
        name: input.name,
        subject: input.subject ?? null,
        body: input.body,
        variables: input.variables ?? [],
        is_active: input.isActive ?? true,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(id: string, input: {
    channelId?: string
    name?: string
    subject?: string | null
    body?: string
    variables?: string[]
    isActive?: boolean
  }) {
    const payload: Record<string, unknown> = {}
    if (input.channelId !== undefined) payload.channel_id = input.channelId
    if (input.name !== undefined) payload.name = input.name
    if (input.subject !== undefined) payload.subject = input.subject
    if (input.body !== undefined) payload.body = input.body
    if (input.variables !== undefined) payload.variables = input.variables
    if (input.isActive !== undefined) payload.is_active = input.isActive

    const { data, error } = await supabaseAdmin
      .from('notification_templates')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async softDelete(id: string) {
    const { error } = await supabaseAdmin
      .from('notification_templates')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }
}
