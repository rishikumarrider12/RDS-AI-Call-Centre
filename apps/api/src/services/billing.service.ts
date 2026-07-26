import { BillingRepository } from '../repositories/billing.repository'
import type { BillingDashboard, Invoice, UsageRecord } from '@rds/types'

export class BillingService {
  private repository = new BillingRepository()

  private toInvoice(row: any): Invoice {
    return {
      id: row.id,
      organizationId: row.organization_id,
      subscriptionId: row.subscription_id ?? null,
      amount: Number(row.amount),
      currency: row.currency,
      status: row.status,
      dueAt: row.due_at ?? null,
      paidAt: row.paid_at ?? null,
      lineItems: row.line_items ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private toUsage(row: any): UsageRecord {
    return {
      id: row.id,
      organizationId: row.organization_id,
      recordDate: row.record_date,
      aiMinutes: Number(row.ai_minutes),
      telephonyMinutes: Number(row.telephony_minutes),
      callsCount: Number(row.calls_count),
      storageBytes: Number(row.storage_bytes),
      sttMinutes: Number(row.stt_minutes),
      ttsCharacters: Number(row.tts_characters),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async getDashboard(organizationId: string): Promise<BillingDashboard> {
    const data = await this.repository.getDashboard(organizationId)
    return {
      subscription: data.subscription ? this.toSubscriptionLike(data.subscription) : null,
      invoices: data.invoices.map((i: any) => this.toInvoice(i)),
      usage: data.usage.map((u: any) => this.toUsage(u)),
      wallet: data.wallet
        ? {
            id: data.wallet.id,
            organizationId: data.wallet.organization_id,
            balance: Number(data.wallet.balance),
            currency: data.wallet.currency,
            createdAt: data.wallet.created_at,
            updatedAt: data.wallet.updated_at,
          }
        : null,
      summary: data.summary,
    }
  }

  private toSubscriptionLike(row: any) {
    return {
      id: row.id,
      organizationId: row.organization_id,
      plan: row.plan,
      status: row.status,
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      trialEndsAt: row.trial_ends_at ?? null,
      cancelAtPeriodEnd: row.cancel_at_period_end ?? false,
      canceledAt: row.canceled_at ?? null,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async listInvoices(
    organizationId: string,
    options: { status?: string; page?: number; pageSize?: number }
  ) {
    const result = await this.repository.listInvoices(organizationId, options)
    return {
      data: result.invoices.map((i: any) => this.toInvoice(i)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    }
  }

  async getInvoice(organizationId: string, id: string): Promise<Invoice> {
    const row = await this.repository.getInvoice(organizationId, id)
    if (!row) throw new Error('Invoice not found')
    return this.toInvoice(row)
  }

  async listUsage(
    organizationId: string,
    options: { dateFrom?: string; dateTo?: string; page?: number; pageSize?: number }
  ) {
    const result = await this.repository.listUsage(organizationId, options)
    return {
      data: result.usage.map((u: any) => this.toUsage(u)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    }
  }
}
