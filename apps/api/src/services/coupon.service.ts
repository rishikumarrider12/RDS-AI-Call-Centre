import { CouponRepository } from '../repositories/coupon.repository'
import type { Coupon } from '@rds/types'
import { recordAudit } from '../lib/audit'

export class CouponService {
  private repository = new CouponRepository()

  private toCoupon(row: any): Coupon {
    return {
      id: row.id,
      organizationId: row.organization_id,
      code: row.code,
      description: row.description ?? null,
      discountType: row.discount_type,
      discountValue: Number(row.discount_value),
      currency: row.currency,
      maxRedemptions: row.max_redemptions ?? null,
      redeemedCount: Number(row.redeemed_count),
      validFrom: row.valid_from ?? null,
      validUntil: row.valid_until ?? null,
      appliesToPlan: row.applies_to_plan ?? null,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async list(organizationId: string): Promise<Coupon[]> {
    const rows = await this.repository.list(organizationId)
    return rows.map((r: any) => this.toCoupon(r))
  }

  async getById(organizationId: string, id: string): Promise<Coupon> {
    const row = await this.repository.findById(organizationId, id)
    if (!row) throw new Error('Coupon not found')
    return this.toCoupon(row)
  }

  async getByCode(organizationId: string, code: string): Promise<Coupon | null> {
    const row = await this.repository.findByCode(organizationId, code)
    return row ? this.toCoupon(row) : null
  }

  async create(organizationId: string, createdById: string, input: {
    code: string
    description?: string | null
    discountType: 'percentage' | 'fixed' | 'free_trial'
    discountValue: number
    currency?: string
    maxRedemptions?: number | null
    validFrom?: string | null
    validUntil?: string | null
    appliesToPlan?: string | null
  }): Promise<Coupon> {
    if (!input.code.trim()) throw new Error('Coupon code is required')
    const existing = await this.repository.findByCode(organizationId, input.code)
    if (existing) throw new Error('A coupon with this code already exists')

    const row = await this.repository.create(organizationId, input)

    await recordAudit({
      organizationId,
      action: 'coupon.create',
      actorId: createdById,
      resourceType: 'coupon',
      resourceId: row.id,
      after: row as unknown as Record<string, unknown>,
    })

    return this.toCoupon(row)
  }

  async update(organizationId: string, createdById: string, id: string, input: {
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
  }): Promise<Coupon> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Coupon not found')

    if (input.code && input.code !== existing.code) {
      const duplicate = await this.repository.findByCode(organizationId, input.code)
      if (duplicate) throw new Error('A coupon with this code already exists')
    }

    const row = await this.repository.update(organizationId, id, input)

    await recordAudit({
      organizationId,
      action: 'coupon.update',
      actorId: createdById,
      resourceType: 'coupon',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
      after: row as unknown as Record<string, unknown>,
    })

    return this.toCoupon(row)
  }

  async validate(organizationId: string, code: string, planSlug?: string): Promise<{ valid: boolean; coupon: Coupon | null; reason?: string }> {
    const coupon = await this.repository.findByCode(organizationId, code)
    if (!coupon) return { valid: false, coupon: null, reason: 'Coupon not found' }
    if (!coupon.is_active) return { valid: false, coupon: null, reason: 'Coupon is inactive' }
    if (coupon.redeemed_count >= (coupon.max_redemptions ?? Infinity)) {
      return { valid: false, coupon: null, reason: 'Coupon has reached max redemptions' }
    }
    const now = new Date().toISOString()
    if (coupon.valid_from && now < coupon.valid_from) return { valid: false, coupon: null, reason: 'Coupon is not yet valid' }
    if (coupon.valid_until && now > coupon.valid_until) return { valid: false, coupon: null, reason: 'Coupon has expired' }
    if (coupon.applies_to_plan && planSlug && coupon.applies_to_plan !== planSlug) {
      return { valid: false, coupon: null, reason: 'Coupon does not apply to this plan' }
    }
    return { valid: true, coupon: this.toCoupon(coupon) }
  }

  async redeem(organizationId: string, createdById: string, id: string): Promise<Coupon> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Coupon not found')

    const validation = await this.validate(organizationId, existing.code)
    if (!validation.valid) throw new Error(validation.reason || 'Coupon is not valid')

    const row = await this.repository.incrementRedemption(organizationId, id)

    await recordAudit({
      organizationId,
      action: 'coupon.redeem',
      actorId: createdById,
      resourceType: 'coupon',
      resourceId: id,
      after: { redeemedCount: row.redeemed_count } as Record<string, unknown>,
    })

    return this.toCoupon(row)
  }

  async delete(organizationId: string, createdById: string, id: string): Promise<void> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Coupon not found')
    await this.repository.softDelete(organizationId, id)

    await recordAudit({
      organizationId,
      action: 'coupon.delete',
      actorId: createdById,
      resourceType: 'coupon',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
    })
  }
}
