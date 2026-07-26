import { supabaseAdmin } from '../lib/supabase'

export interface NotificationLogRow {
  id: string
  organization_id: string
  channel_id: string
  template_id: string | null
  recipient: string
  subject: string | null
  body: string
  status: string
  provider_message_id: string | null
  error_message: string | null
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  clicked_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export class NotificationLogRepository {
  async list(organizationId: string, options: { channelId?: string; status?: string; page?: number; pageSize?: number } = {}) {
    const page = options.page && options.page > 0 ? options.page : 1
    const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 25
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabaseAdmin
      .from('notification_logs')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (options.channelId) query = query.eq('channel_id', options.channelId)
    if (options.status) query = query.eq('status', options.status)

    const { data, error, count } = await query
    if (error) throw error
    return {
      logs: (data || []) as NotificationLogRow[],
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async findById(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('notification_logs')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle()
    if (error) throw error
    return data as NotificationLogRow | null
  }

  async create(organizationId: string, input: {
    channelId: string
    templateId?: string | null
    recipient: string
    subject?: string | null
    body: string
    status?: string
    providerMessageId?: string | null
    errorMessage?: string | null
    metadata?: Record<string, unknown>
  }) {
    const { data, error } = await supabaseAdmin
      .from('notification_logs')
      .insert({
        organization_id: organizationId,
        channel_id: input.channelId,
        template_id: input.templateId ?? null,
        recipient: input.recipient,
        subject: input.subject ?? null,
        body: input.body,
        status: input.status ?? 'pending',
        provider_message_id: input.providerMessageId ?? null,
        error_message: input.errorMessage ?? null,
        metadata: input.metadata ?? {},
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async updateStatus(id: string, status: string, extra: Record<string, unknown> = {}) {
    const payload: Record<string, unknown> = { status, ...extra }
    const { data, error } = await supabaseAdmin
      .from('notification_logs')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
}
