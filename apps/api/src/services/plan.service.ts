import { PlanRepository } from '../repositories/plan.repository'
import type { Plan } from '@rds/types'
import { recordAudit } from '../lib/audit'

export class PlanService {
  private repository = new PlanRepository()

  private toPlan(row: any): Plan {
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      slug: row.slug,
      description: row.description ?? null,
      priceMonthly: Number(row.price_monthly),
      priceYearly: Number(row.price_yearly),
      currency: row.currency,
      limits: row.limits ?? {},
      features: row.features ?? [],
      isActive: row.is_active,
      sortOrder: Number(row.sort_order),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async list(organizationId: string): Promise<Plan[]> {
    const rows = await this.repository.list(organizationId)
    return rows.map((r: any) => this.toPlan(r))
  }

  async getById(organizationId: string, id: string): Promise<Plan> {
    const row = await this.repository.findById(organizationId, id)
    if (!row) throw new Error('Plan not found')
    return this.toPlan(row)
  }

  async getBySlug(organizationId: string, slug: string): Promise<Plan | null> {
    const row = await this.repository.findBySlug(organizationId, slug)
    return row ? this.toPlan(row) : null
  }

  async create(organizationId: string, createdById: string, input: {
    name: string
    slug: string
    description?: string | null
    priceMonthly: number
    priceYearly: number
    currency?: string
    limits?: Record<string, unknown>
    features?: Array<Record<string, unknown>>
    sortOrder?: number
  }): Promise<Plan> {
    if (!input.name.trim()) throw new Error('Plan name is required')
    if (!input.slug.trim()) throw new Error('Plan slug is required')
    const existing = await this.repository.findBySlug(organizationId, input.slug)
    if (existing) throw new Error('A plan with this slug already exists')

    const row = await this.repository.create(organizationId, {
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      priceMonthly: input.priceMonthly,
      priceYearly: input.priceYearly,
      currency: input.currency || 'USD',
      limits: input.limits || {},
      features: input.features || [],
      sortOrder: input.sortOrder ?? 0,
    })

    await recordAudit({
      organizationId,
      action: 'plan.create',
      actorId: createdById,
      resourceType: 'plan',
      resourceId: row.id,
      after: row as unknown as Record<string, unknown>,
    })

    return this.toPlan(row)
  }

  async update(organizationId: string, createdById: string, id: string, input: {
    name?: string
    slug?: string
    description?: string | null
    priceMonthly?: number
    priceYearly?: number
    currency?: string
    limits?: Record<string, unknown>
    features?: Array<Record<string, unknown>>
    isActive?: boolean
    sortOrder?: number
  }): Promise<Plan> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Plan not found')

    if (input.slug && input.slug !== existing.slug) {
      const duplicate = await this.repository.findBySlug(organizationId, input.slug)
      if (duplicate) throw new Error('A plan with this slug already exists')
    }

    const row = await this.repository.update(organizationId, id, input)

    await recordAudit({
      organizationId,
      action: 'plan.update',
      actorId: createdById,
      resourceType: 'plan',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
      after: row as unknown as Record<string, unknown>,
    })

    return this.toPlan(row)
  }

  async delete(organizationId: string, createdById: string, id: string): Promise<void> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Plan not found')
    await this.repository.softDelete(organizationId, id)

    await recordAudit({
      organizationId,
      action: 'plan.delete',
      actorId: createdById,
      resourceType: 'plan',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
    })
  }
}
