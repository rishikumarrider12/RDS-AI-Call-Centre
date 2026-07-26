import { supabaseAdmin } from '../lib/supabase'

export interface CreateWebhookInput {
  organizationId: string
  url: string
  secret: string
  events: string[]
  isActive?: boolean
}

export interface UpdateWebhookInput {
  url?: string
  secret?: string
  events?: string[]
  isActive?: boolean
}

export class WebhookRepository {
  async list(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('webhooks')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }

  async findById(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('webhooks')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async create(input: CreateWebhookInput) {
    const { data, error } = await supabaseAdmin
      .from('webhooks')
      .insert({
        organization_id: input.organizationId,
        url: input.url,
        secret: input.secret,
        events: input.events,
        is_active: input.isActive ?? true,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(id: string, input: UpdateWebhookInput) {
    const payload: Record<string, unknown> = {}
    if (input.url !== undefined) payload.url = input.url
    if (input.secret !== undefined) payload.secret = input.secret
    if (input.events !== undefined) payload.events = input.events
    if (input.isActive !== undefined) payload.is_active = input.isActive
    const { data, error } = await supabaseAdmin
      .from('webhooks')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async softDelete(id: string) {
    const { error } = await supabaseAdmin
      .from('webhooks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }

  async listDeliveries(
    organizationId: string,
    webhookId: string,
    options: { page?: number; pageSize?: number }
  ) {
    const page = options.page && options.page > 0 ? options.page : 1
    const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 25
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabaseAdmin
      .from('webhook_deliveries')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error
    return {
      deliveries: data || [],
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async findDelivery(organizationId: string, deliveryId: string) {
    const { data, error } = await supabaseAdmin
      .from('webhook_deliveries')
      .select('*')
      .eq('id', deliveryId)
      .eq('organization_id', organizationId)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async updateDelivery(id: string, payload: Record<string, unknown>) {
    const { error } = await supabaseAdmin
      .from('webhook_deliveries')
      .update(payload)
      .eq('id', id)
    if (error) throw error
  }
}
