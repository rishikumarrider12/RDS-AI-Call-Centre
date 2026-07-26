import { CostRepository } from '../repositories/cost.repository'
import { NotificationRepository } from '../repositories/notification.repository'
import type {
  CostRecord,
  Budget,
  SpendingAlert,
  CostSummary,
  BudgetStatus,
  CostDashboard,
} from '@rds/types'

// Default unit costs (USD). In production these would come from a pricing
// configuration table / provider billing; kept here as sensible defaults so
// cost tracking works end-to-end without external billing integration.
export const DEFAULT_UNIT_COSTS: Record<string, { unit: string; unitCost: number }> = {
  telephony: { unit: 'minute', unitCost: 0.012 },
  ai: { unit: 'minute', unitCost: 0.09 },
  stt: { unit: 'minute', unitCost: 0.006 },
  tts: { unit: 'char', unitCost: 0.000015 },
  storage: { unit: 'MB', unitCost: 0.00002 },
  other: { unit: 'unit', unitCost: 0 },
}

function round2(n: number): number {
  return Number(n.toFixed(2))
}

function currentPeriodBounds(period: 'monthly' | 'daily'): { start: string; end: string } {
  const now = new Date()
  if (period === 'daily') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

export class CostService {
  private repository = new CostRepository()
  private notifications = new NotificationRepository()

  // Derive a cost record from a usage record for a given day.
  async recordUsageCost(organizationId: string, usage: {
    recordDate: string
    aiMinutes: number
    telephonyMinutes: number
    sttMinutes?: number
    ttsCharacters?: number
    storageBytes?: number
    currency?: string
  }): Promise<CostRecord[]> {
    const currency = usage.currency || 'USD'
    const records: CostRecord[] = []
    const add = async (category: string, quantity: number) => {
      if (quantity <= 0) return
      const def = DEFAULT_UNIT_COSTS[category] || DEFAULT_UNIT_COSTS.other
      const cost = round2(quantity * def.unitCost)
      records.push(
        await this.repository.upsertCost({
          organizationId,
          recordDate: usage.recordDate,
          category,
          quantity,
          unit: def.unit,
          unitCost: def.unitCost,
          cost,
          currency,
        })
      )
    }
    await add('telephony', usage.telephonyMinutes)
    await add('ai', usage.aiMinutes)
    await add('stt', usage.sttMinutes ?? 0)
    await add('tts', usage.ttsCharacters ?? 0)
    await add('storage', (usage.storageBytes ?? 0) / (1024 * 1024))
    return records
  }

  async getCostSummary(
    organizationId: string,
    options: { dateFrom?: string; dateTo?: string } = {}
  ): Promise<{ summary: CostSummary }> {
    return this.repository.getCostSummary(organizationId, options)
  }

  async listCosts(
    organizationId: string,
    options: { dateFrom?: string; dateTo?: string; category?: string; page?: number; pageSize?: number } = {}
  ) {
    return this.repository.listCosts(organizationId, options)
  }

  async listUsage(
    organizationId: string,
    options: { dateFrom?: string; dateTo?: string; page?: number; pageSize?: number } = {}
  ) {
    return this.repository.listUsage(organizationId, options)
  }

  async listBudgets(organizationId: string): Promise<Budget[]> {
    return this.repository.listBudgets(organizationId)
  }

  async upsertBudget(
    organizationId: string,
    input: {
      category: string
      period?: 'monthly' | 'daily'
      limitAmount: number
      currency?: string
      warnThreshold?: number
      alertThreshold?: number
      enabled?: boolean
    }
  ): Promise<Budget> {
    const budget = await this.repository.upsertBudget({ organizationId, ...input })
    // Re-evaluate immediately after a change.
    await this.evaluateBudget(organizationId, budget)
    return budget
  }

  async deleteBudget(organizationId: string, id: string): Promise<void> {
    await this.repository.deleteBudget(organizationId, id)
  }

  // Compute spent for a budget's current period. The 'total' budget sums all
  // categories; category budgets sum only their category.
  private async computeSpent(organizationId: string, budget: Budget): Promise<number> {
    const { start, end } = currentPeriodBounds(budget.period)
    const { summary } = await this.repository.getCostSummary(organizationId, { dateFrom: start, dateTo: end })
    if (budget.category === 'total') return summary.totalCost
    const found = summary.byCategory.find((c) => c.category === budget.category)
    return found ? found.cost : 0
  }

  async getBudgetStatuses(organizationId: string): Promise<BudgetStatus[]> {
    const budgets = await this.repository.listBudgets(organizationId)
    const statuses: BudgetStatus[] = []
    for (const budget of budgets) {
      const { start, end } = currentPeriodBounds(budget.period)
      const spent = await this.computeSpent(organizationId, budget)
      const remaining = round2(budget.limitAmount - spent)
      const utilization = budget.limitAmount > 0 ? spent / budget.limitAmount : 0
      const status: BudgetStatus['status'] =
        !budget.enabled ? 'ok' : utilization >= budget.alertThreshold ? 'exceeded' : utilization >= budget.warnThreshold ? 'warning' : 'ok'
      statuses.push({
        budget,
        spent: round2(spent),
        remaining,
        utilization: round2(utilization),
        status,
        periodStart: start,
        periodEnd: end,
      })
    }
    return statuses
  }

  // Evaluate a single budget; create + notify on threshold crossing.
  async evaluateBudget(organizationId: string, budget: Budget): Promise<SpendingAlert | null> {
    if (!budget.enabled) return null
    const spent = await this.computeSpent(organizationId, budget)
    const utilization = budget.limitAmount > 0 ? spent / budget.limitAmount : 0
    const currency = budget.currency

    let level: 'warning' | 'limit' | null = null
    let threshold = 0
    if (utilization >= budget.alertThreshold) {
      level = 'limit'
      threshold = budget.alertThreshold
    } else if (utilization >= budget.warnThreshold) {
      level = 'warning'
      threshold = budget.warnThreshold
    }
    if (!level) return null

    const alert = await this.repository.createAlert({
      organizationId,
      budgetId: budget.id,
      category: budget.category,
      level,
      threshold,
      spent: round2(spent),
      limitAmount: budget.limitAmount,
      currency,
    })

    await this.notifications.create(organizationId, {
      type: 'in-app',
      channel: 'billing',
      title: level === 'limit' ? 'Budget limit reached' : 'Budget warning',
      body: `Spend for ${budget.category} is ${round2(utilization * 100)}% of the ${budget.period} budget (${round2(spent)} / ${budget.limitAmount} ${currency}).`,
      data: { budgetId: budget.id, level, utilization: round2(utilization) },
    })

    return alert
  }

  // Evaluate all budgets for an org (used by a scheduler / on demand).
  async evaluateAllBudgets(organizationId: string): Promise<SpendingAlert[]> {
    const budgets = await this.repository.listBudgets(organizationId)
    const alerts: SpendingAlert[] = []
    for (const budget of budgets) {
      const alert = await this.evaluateBudget(organizationId, budget)
      if (alert) alerts.push(alert)
    }
    return alerts
  }

  async listAlerts(
    organizationId: string,
    options: { page?: number; pageSize?: number } = {}
  ) {
    return this.repository.listAlerts(organizationId, options)
  }

  async getDashboard(organizationId: string): Promise<CostDashboard> {
    const { start, end } = currentPeriodBounds('monthly')
    const { summary } = await this.repository.getCostSummary(organizationId, { dateFrom: start, dateTo: end })
    const budgets = await this.getBudgetStatuses(organizationId)
    const { alerts } = await this.repository.listAlerts(organizationId, { pageSize: 10 })
    const { usage } = await this.repository.listUsage(organizationId, { dateFrom: start, dateTo: end, pageSize: 31 })

    const usageWithCost = usage.map((u: any) => {
      const cost = round2(
        u.aiMinutes * DEFAULT_UNIT_COSTS.ai.unitCost +
          u.telephonyMinutes * DEFAULT_UNIT_COSTS.telephony.unitCost
      )
      return { ...u, cost }
    })

    return {
      currency: summary.currency,
      summary,
      budgets,
      recentAlerts: alerts,
      usage: usageWithCost,
    }
  }
}
