import { supabaseAdmin } from '../lib/supabase'

export class NotificationRepository {
  async list(
    organizationId: string,
    options: {
      channel?: string
      unreadOnly?: boolean
      page?: number
      pageSize?: number
    }
  ) {
    const page = options.page && options.page > 0 ? options.page : 1
    const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 25
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (options.channel) query = query.eq('channel', options.channel)
    if (options.unreadOnly) query = query.is('read_at', null)

    const { data, error, count } = await query
    if (error) throw error
    return {
      notifications: data || [],
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async findById(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async markRead(id: string) {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }

  async markAllRead(organizationId: string) {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .is('read_at', null)
    if (error) throw error
  }

  async delete(id: string) {
    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', id)
    if (error) throw error
  }

  async getPreferences(organizationId: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('notification_prefs')
      .eq('id', organizationId)
      .maybeSingle()
    if (error) throw error
    return data?.notification_prefs ?? null
  }

  async updatePreferences(organizationId: string, prefs: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update({ notification_prefs: prefs })
      .eq('id', organizationId)
      .select('notification_prefs')
      .single()
    if (error) throw error
    return data?.notification_prefs ?? null
  }

  async create(
    organizationId: string,
    input: {
      type: 'email' | 'sms' | 'push' | 'in-app'
      channel: 'billing' | 'usage' | 'security' | 'support'
      title: string
      body?: string | null
      data?: Record<string, unknown>
      userId?: string | null
    }
  ) {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        organization_id: organizationId,
        user_id: input.userId ?? null,
        type: input.type,
        channel: input.channel,
        title: input.title,
        body: input.body ?? null,
        data: input.data ?? {},
      })
      .select()
      .single()
    if (error) throw error
    return data
  }
}
