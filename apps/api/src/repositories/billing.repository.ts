import { supabaseAdmin } from '../lib/supabase'

export interface InvoiceListFilters {
  status?: string
  page?: number
  pageSize?: number
}

export interface UsageListFilters {
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export class BillingRepository {
  async getDashboard(organizationId: string) {
    const [subscription, invoicesRes, usageRes, wallet] = await Promise.all([
      supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('invoices')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabaseAdmin
        .from('usage_records')
        .select('*')
        .eq('organization_id', organizationId)
        .order('record_date', { ascending: false })
        .limit(30),
      supabaseAdmin
        .from('wallets')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle(),
    ])

    if (subscription.error) throw subscription.error
    if (invoicesRes.error) throw invoicesRes.error
    if (usageRes.error) throw usageRes.error
    if (wallet.error) throw wallet.error

    const invoices = invoicesRes.data || []
    const usage = usageRes.data || []

    const totalSpent = invoices
      .filter((i: any) => i.status === 'paid')
      .reduce((sum: number, i: any) => sum + Number(i.amount), 0)
    const outstanding = invoices
      .filter((i: any) => i.status === 'open' || i.status === 'draft')
      .reduce((sum: number, i: any) => sum + Number(i.amount), 0)

    const currentPeriodCalls = usage.reduce((sum: number, u: any) => sum + Number(u.calls_count), 0)
    const currentPeriodMinutes = usage.reduce(
      (sum: number, u: any) => sum + Number(u.ai_minutes) + Number(u.telephony_minutes) + Number(u.stt_minutes),
      0
    )

    const currency =
      (invoices[0]?.currency as string) || (wallet.data?.currency as string) || 'USD'

    return {
      subscription: subscription.data,
      invoices,
      usage,
      wallet: wallet.data,
      summary: {
        totalSpent: Number(totalSpent.toFixed(2)),
        outstanding: Number(outstanding.toFixed(2)),
        currency,
        currentPeriodCalls,
        currentPeriodMinutes: Number(currentPeriodMinutes.toFixed(2)),
      },
    }
  }

  async listInvoices(organizationId: string, options: InvoiceListFilters) {
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
      invoices: data || [],
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async getInvoice(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async listUsage(organizationId: string, options: UsageListFilters) {
    const page = options.page && options.page > 0 ? options.page : 1
    const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 31
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabaseAdmin
      .from('usage_records')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('record_date', { ascending: false })
      .range(from, to)

    if (options.dateFrom) query = query.gte('record_date', options.dateFrom)
    if (options.dateTo) query = query.lte('record_date', options.dateTo)

    const { data, error, count } = await query
    if (error) throw error
    return {
      usage: data || [],
      total: count ?? 0,
      page,
      pageSize,
    }
  }
}
