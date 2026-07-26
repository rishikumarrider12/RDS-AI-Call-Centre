import { BillingSettingsRepository } from '../repositories/billingSettings.repository'
import type { BillingSettings } from '@rds/types'
import { recordAudit } from '../lib/audit'

export class BillingSettingsService {
  private repository = new BillingSettingsRepository()

  private toSettings(row: any): BillingSettings {
    return {
      id: row.id,
      organizationId: row.organization_id,
      autoRecharge: row.auto_recharge,
      autoRechargeThreshold: row.auto_recharge_threshold ?? null,
      autoRechargeAmount: row.auto_recharge_amount ?? null,
      currency: row.currency,
      billingEmail: row.billing_email ?? null,
      companyName: row.company_name ?? null,
      taxId: row.tax_id ?? null,
      address: row.address ?? {},
      notificationPreferences: row.notification_preferences ?? {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async get(organizationId: string): Promise<BillingSettings | null> {
    const row = await this.repository.get(organizationId)
    return row ? this.toSettings(row) : null
  }

  async update(organizationId: string, createdById: string, input: {
    autoRecharge?: boolean
    autoRechargeThreshold?: number | null
    autoRechargeAmount?: number | null
    currency?: string
    billingEmail?: string | null
    companyName?: string | null
    taxId?: string | null
    address?: Record<string, unknown>
    notificationPreferences?: Record<string, unknown>
  }): Promise<BillingSettings> {
    const existing = await this.repository.get(organizationId)

    const row = await this.repository.upsert(organizationId, input)

    await recordAudit({
      organizationId,
      action: 'billing_settings.update',
      actorId: createdById,
      resourceType: 'billing_settings',
      resourceId: row.id,
      before: existing ? existing as unknown as Record<string, unknown> : null,
      after: row as unknown as Record<string, unknown>,
    })

    return this.toSettings(row)
  }
}
