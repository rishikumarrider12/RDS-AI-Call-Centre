import { supabaseAdmin } from '../lib/supabase'

export interface PaymentRow {
  id: string
  organization_id: string
  invoice_id: string | null
  amount: number
  currency: string
  method: string
  providerPaymentId: string | null
  status: string
  failureReason: string | null
  processedAt: string | null
  created_at: string
}

export class PaymentRepository {
  async list(organizationId: string, options: { page?: number; pageSize?: number; status?: string }) {
    const page = options.page && options.page > 0 ? options.page : 1
    const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 25
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabaseAdmin
      .from('payments')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (options.status) query = query.eq('status', options.status)

    const { data, error, count } = await query
    if (error) throw error
    return {
      payments: (data || []) as PaymentRow[],
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async create(organizationId: string, input: {
    invoiceId?: string | null
    amount: number
    currency?: string
    method: string
    providerPaymentId?: string | null
    status?: string
    failureReason?: string | null
  }) {
    const { data, error } = await supabaseAdmin
      .from('payments')
      .insert({
        organization_id: organizationId,
        invoice_id: input.invoiceId ?? null,
        amount: input.amount,
        currency: input.currency || 'USD',
        method: input.method,
        provider_payment_id: input.providerPaymentId ?? null,
        status: input.status || 'pending',
        failure_reason: input.failureReason ?? null,
        processed_at: input.status === 'succeeded' ? new Date().toISOString() : null,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async updateStatus(id: string, status: string, failureReason?: string | null) {
    const payload: Record<string, unknown> = { status }
    if (status === 'succeeded') payload.processed_at = new Date().toISOString()
    if (failureReason !== undefined) payload.failure_reason = failureReason

    const { data, error } = await supabaseAdmin
      .from('payments')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
}
