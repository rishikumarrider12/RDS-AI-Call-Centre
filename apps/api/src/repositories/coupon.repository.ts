import { supabaseAdmin } from '../lib/supabase'

export interface CouponRow {
  id: string
  organization_id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed' | 'free_trial'
  discount_value: number
  currency: string
  max_redemptions: number | null
  redeemed_count: number
  valid_from: string | null
  valid_until: string | null
  applies_to_plan: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export class CouponRepository {
  async list(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as CouponRow[]
  }

  async findById(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data as CouponRow | null
  }

  async findByCode(organizationId: string, code: string) {
    const { data, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('code', code)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data as CouponRow | null
  }

  async create(organizationId: string, input: {
    code: string
    description?: string | null
    discountType: 'percentage' | 'fixed' | 'free_trial'
    discountValue: number
    currency?: string
    maxRedemptions?: number | null
    validFrom?: string | null
    validUntil?: string | null
    appliesToPlan?: string | null
  }) {
    const { data, error } = await supabaseAdmin
      .from('coupons')
      .insert({
        organization_id: organizationId,
        code: input.code,
        description: input.description ?? null,
        discount_type: input.discountType,
        discount_value: input.discountValue,
        currency: input.currency || 'USD',
        max_redemptions: input.maxRedemptions ?? null,
        valid_from: input.validFrom ?? null,
        valid_until: input.validUntil ?? null,
        applies_to_plan: input.appliesToPlan ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(organizationId: string, id: string, input: {
    code?: string
    description?: string | null
    discountType?: 'percentage' | 'fixed' | 'free_trial'
    discountValue?: number
    currency?: string
    maxRedemptions?: number | null
    validFrom?: string | null
    validUntil?: string | null
    appliesToPlan?: string | null
    isActive?: boolean
  }) {
    const payload: Record<string, unknown> = {}
    if (input.code !== undefined) payload.code = input.code
    if (input.description !== undefined) payload.description = input.description
    if (input.discountType !== undefined) payload.discount_type = input.discountType
    if (input.discountValue !== undefined) payload.discount_value = input.discountValue
    if (input.currency !== undefined) payload.currency = input.currency
    if (input.maxRedemptions !== undefined) payload.max_redemptions = input.maxRedemptions
    if (input.validFrom !== undefined) payload.valid_from = input.validFrom
    if (input.validUntil !== undefined) payload.valid_until = input.validUntil
    if (input.appliesToPlan !== undefined) payload.applies_to_plan = input.appliesToPlan
    if (input.isActive !== undefined) payload.is_active = input.isActive

    const { data, error } = await supabaseAdmin
      .from('coupons')
      .update(payload)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async incrementRedemption(organizationId: string, id: string) {
    const existing = await this.findById(organizationId, id)
    if (!existing) throw new Error('Coupon not found')
    const newCount = (existing.redeemed_count || 0) + 1
    const { data, error } = await supabaseAdmin
      .from('coupons')
      .update({ redeemed_count: newCount })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async softDelete(organizationId: string, id: string) {
    const { error } = await supabaseAdmin
      .from('coupons')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId)
    if (error) throw error
  }
}
