import { supabaseAdmin } from '../lib/supabase'

export interface BillingSettingsRow {
  id: string
  organization_id: string
  auto_recharge: boolean
  auto_recharge_threshold: number | null
  auto_recharge_amount: number | null
  currency: string
  billing_email: string | null
  company_name: string | null
  tax_id: string | null
  address: Record<string, unknown>
  notification_preferences: Record<string, unknown>
  created_at: string
  updated_at: string
}

export class BillingSettingsRepository {
  async get(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('billing_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle()
    if (error) throw error
    return data as BillingSettingsRow | null
  }

  async upsert(organizationId: string, input: {
    autoRecharge?: boolean
    autoRechargeThreshold?: number | null
    autoRechargeAmount?: number | null
    currency?: string
    billingEmail?: string | null
    companyName?: string | null
    taxId?: string | null
    address?: Record<string, unknown>
    notificationPreferences?: Record<string, unknown>
  }) {
    const payload: Record<string, unknown> = {}
    if (input.autoRecharge !== undefined) payload.auto_recharge = input.autoRecharge
    if (input.autoRechargeThreshold !== undefined) payload.auto_recharge_threshold = input.autoRechargeThreshold
    if (input.autoRechargeAmount !== undefined) payload.auto_recharge_amount = input.autoRechargeAmount
    if (input.currency !== undefined) payload.currency = input.currency
    if (input.billingEmail !== undefined) payload.billing_email = input.billingEmail
    if (input.companyName !== undefined) payload.company_name = input.companyName
    if (input.taxId !== undefined) payload.tax_id = input.taxId
    if (input.address !== undefined) payload.address = input.address
    if (input.notificationPreferences !== undefined) payload.notification_preferences = input.notificationPreferences

    const { data, error } = await supabaseAdmin
      .from('billing_settings')
      .upsert({ organization_id: organizationId, ...payload }, { onConflict: 'organization_id' })
      .select()
      .single()
    if (error) throw error
    return data
  }
}
