import { supabaseAdmin } from '../lib/supabase'

export interface InvoiceRow {
  id: string
  organization_id: string
  subscription_id: string | null
  amount: number
  currency: string
  status: string
  due_at: string | null
  paid_at: string | null
  line_items: Array<Record<string, unknown>>
  created_at: string
  updated_at: string
}

export class InvoiceRepository {
  async list(organizationId: string, options: { status?: string; page?: number; pageSize?: number }) {
    const page = options.page && options.page > 0 ? options.page : 1
    const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 25
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabaseAdmin
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (options.status) query = query.eq('status', options.status)

    const { data, error, count } = await query
    if (error) throw error
    return {
      invoices: (data || []) as InvoiceRow[],
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async findById(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle()
    if (error) throw error
    return data as InvoiceRow | null
  }

  async create(organizationId: string, input: {
    subscriptionId?: string | null
    amount: number
    currency?: string
    status?: string
    dueAt?: string | null
    lineItems?: Array<Record<string, unknown>>
  }) {
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .insert({
        organization_id: organizationId,
        subscription_id: input.subscriptionId ?? null,
        amount: input.amount,
        currency: input.currency || 'USD',
        status: input.status || 'draft',
        due_at: input.dueAt ?? null,
        line_items: input.lineItems || [],
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async updateStatus(organizationId: string, id: string, status: string, paidAt?: string | null) {
    const payload: Record<string, unknown> = { status }
    if (paidAt !== undefined) payload.paid_at = paidAt
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .update(payload)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single()
    if (error) throw error
    return data
  }
}
