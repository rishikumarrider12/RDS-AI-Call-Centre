import { supabaseAdmin } from '../lib/supabase'
import type {
  CostRecord,
  Budget,
  SpendingAlert,
  CostSummary,
  CostSummaryCategory,
} from '@rds/types'

function toCost(row: any): CostRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    recordDate: row.record_date,
    category: row.category,
    quantity: Number(row.quantity),
    unit: row.unit,
    unitCost: Number(row.unit_cost),
    cost: Number(row.cost),
    currency: row.currency,
    createdAt: row.created_at,
  }
}

function toBudget(row: any): Budget {
  return {
    id: row.id,
    organizationId: row.organization_id,
    category: row.category,
    period: row.period,
    limitAmount: Number(row.limit_amount),
    currency: row.currency,
    warnThreshold: Number(row.warn_threshold),
    alertThreshold: Number(row.alert_threshold),
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toAlert(row: any): SpendingAlert {
  return {
    id: row.id,
    organizationId: row.organization_id,
    budgetId: row.budget_id ?? null,
    category: row.category,
    level: row.level,
    threshold: Number(row.threshold),
    spent: Number(row.spent),
    limitAmount: Number(row.limit_amount),
    currency: row.currency,
    notified: row.notified,
    createdAt: row.created_at,
  }
}

function round2(n: number): number {
  return Number(n.toFixed(2))
}

export class CostRepository {
  // ---- Cost records ----
  async upsertCost(input: {
    organizationId: string
    recordDate: string
    category: string
    quantity?: number
    unit?: string
    unitCost?: number
    cost: number
    currency?: string
  }): Promise<CostRecord> {
    const { data, error } = await supabaseAdmin
      .from('cost_tracking')
      .upsert(
        {
          organization_id: input.organizationId,
          record_date: input.recordDate,
          category: input.category,
          quantity: input.quantity ?? 0,
          unit: input.unit ?? 'unit',
          unit_cost: input.unitCost ?? 0,
          cost: input.cost,
          currency: input.currency ?? 'USD',
        },
        { onConflict: 'organization_id,record_date,category' }
      )
      .select()
      .single()
    if (error) throw error
    return toCost(data)
  }

  async getCostSummary(
    organizationId: string,
    options: { dateFrom?: string; dateTo?: string } = {}
  ): Promise<{ summary: CostSummary }> {
    let query = supabaseAdmin
      .from('cost_tracking')
      .select('*')
      .eq('organization_id', organizationId)
      .order('record_date', { ascending: false })
    if (options.dateFrom) query = query.gte('record_date', options.dateFrom)
    if (options.dateTo) query = query.lte('record_date', options.dateTo)

    const { data, error } = await query
    if (error) throw error
    const rows = data || []

    const byCategoryMap = new Map<string, number>()
    let total = 0
    let currency = 'USD'
    let periodStart: string | null = null
    let periodEnd: string | null = null
    for (const r of rows) {
      const c = Number(r.cost)
      byCategoryMap.set(r.category, (byCategoryMap.get(r.category) || 0) + c)
      total += c
      currency = r.currency || currency
      if (!periodStart || r.record_date < periodStart) periodStart = r.record_date
      if (!periodEnd || r.record_date > periodEnd) periodEnd = r.record_date
    }

    const byCategory: CostSummaryCategory[] = Array.from(byCategoryMap.entries()).map(
      ([category, cost]) => ({ category: category as CostSummaryCategory['category'], cost: round2(cost) })
    )

    return {
      summary: {
        currency,
        totalCost: round2(total),
        periodStart,
        periodEnd,
        byCategory,
      },
    }
  }

  async listCosts(
    organizationId: string,
    options: { dateFrom?: string; dateTo?: string; category?: string; page?: number; pageSize?: number } = {}
  ) {
    const page = options.page && options.page > 0 ? options.page : 1
    const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 31
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabaseAdmin
      .from('cost_tracking')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('record_date', { ascending: false })
      .range(from, to)
    if (options.category) query = query.eq('category', options.category)
    if (options.dateFrom) query = query.gte('record_date', options.dateFrom)
    if (options.dateTo) query = query.lte('record_date', options.dateTo)

    const { data, error, count } = await query
    if (error) throw error
    return {
      costs: (data || []).map(toCost),
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  // ---- Usage accounting (reuse usage_records) ----
  async listUsage(
    organizationId: string,
    options: { dateFrom?: string; dateTo?: string; page?: number; pageSize?: number } = {}
  ) {
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
      usage: (data || []).map((u: any) => ({
        recordDate: u.record_date,
        aiMinutes: Number(u.ai_minutes),
        telephonyMinutes: Number(u.telephony_minutes),
        callsCount: Number(u.calls_count),
      })),
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  // ---- Budgets ----
  async listBudgets(organizationId: string): Promise<Budget[]> {
    const { data, error } = await supabaseAdmin
      .from('budgets')
      .select('*')
      .eq('organization_id', organizationId)
      .order('category', { ascending: true })
    if (error) throw error
    return (data || []).map(toBudget)
  }

  async upsertBudget(input: {
    organizationId: string
    category: string
    period?: string
    limitAmount: number
    currency?: string
    warnThreshold?: number
    alertThreshold?: number
    enabled?: boolean
  }): Promise<Budget> {
    const { data, error } = await supabaseAdmin
      .from('budgets')
      .upsert(
        {
          organization_id: input.organizationId,
          category: input.category,
          period: input.period ?? 'monthly',
          limit_amount: input.limitAmount,
          currency: input.currency ?? 'USD',
          warn_threshold: input.warnThreshold ?? 0.8,
          alert_threshold: input.alertThreshold ?? 1.0,
          enabled: input.enabled ?? true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id,category,period' }
      )
      .select()
      .single()
    if (error) throw error
    return toBudget(data)
  }

  async deleteBudget(organizationId: string, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('budgets')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', id)
    if (error) throw error
  }

  // ---- Spending alerts ----
  async createAlert(input: {
    organizationId: string
    budgetId?: string | null
    category: string
    level: string
    threshold: number
    spent: number
    limitAmount: number
    currency?: string
    notified?: boolean
  }): Promise<SpendingAlert> {
    const { data, error } = await supabaseAdmin
      .from('spending_alerts')
      .insert({
        organization_id: input.organizationId,
        budget_id: input.budgetId ?? null,
        category: input.category,
        level: input.level,
        threshold: input.threshold,
        spent: input.spent,
        limit_amount: input.limitAmount,
        currency: input.currency ?? 'USD',
        notified: input.notified ?? false,
      })
      .select()
      .single()
    if (error) throw error
    return toAlert(data)
  }

  async listAlerts(
    organizationId: string,
    options: { page?: number; pageSize?: number } = {}
  ): Promise<{ alerts: SpendingAlert[]; total: number; page: number; pageSize: number }> {
    const page = options.page && options.page > 0 ? options.page : 1
    const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 25
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    const { data, error, count } = await supabaseAdmin
      .from('spending_alerts')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(from, to)
    if (error) throw error
    return {
      alerts: (data || []).map(toAlert),
      total: count ?? 0,
      page,
      pageSize,
    }
  }
}
