import { supabaseAdmin } from '../lib/supabase'

export interface TransactionRow {
  id: string
  organization_id: string
  type: 'payment' | 'refund' | 'credit' | 'debit' | 'adjustment'
  amount: number
  currency: string
  invoice_id: string | null
  payment_id: string | null
  credit_id: string | null
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export class TransactionRepository {
  async list(organizationId: string, options: { page?: number; pageSize?: number; type?: string } = {}) {
    const page = options.page && options.page > 0 ? options.page : 1
    const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 25
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabaseAdmin
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (options.type) query = query.eq('type', options.type)

    const { data, error, count } = await query
    if (error) throw error
    return {
      transactions: (data || []) as TransactionRow[],
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async findById(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle()
    if (error) throw error
    return data as TransactionRow | null
  }

  async create(organizationId: string, input: {
    type: 'payment' | 'refund' | 'credit' | 'debit' | 'adjustment'
    amount: number
    currency?: string
    invoiceId?: string | null
    paymentId?: string | null
    creditId?: string | null
    description?: string | null
    metadata?: Record<string, unknown>
  }) {
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .insert({
        organization_id: organizationId,
        type: input.type,
        amount: input.amount,
        currency: input.currency || 'USD',
        invoice_id: input.invoiceId ?? null,
        payment_id: input.paymentId ?? null,
        credit_id: input.creditId ?? null,
        description: input.description ?? null,
        metadata: input.metadata ?? {},
      })
      .select()
      .single()
    if (error) throw error
    return data
  }
}
