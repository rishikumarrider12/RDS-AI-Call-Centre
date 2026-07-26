import { SubscriptionRepository } from '../repositories/subscription.repository'
import type { Subscription } from '@rds/types'

export const SUBSCRIPTION_PLANS = ['starter', 'growth', 'enterprise'] as const

export class SubscriptionService {
  private repository = new SubscriptionRepository()

  private toSubscription(row: any): Subscription {
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

  async list(organizationId: string): Promise<Subscription[]> {
    const rows = await this.repository.list(organizationId)
    return rows.map((r: any) => this.toSubscription(r))
  }

  async getCurrent(organizationId: string): Promise<Subscription | null> {
    const row = await this.repository.getCurrent(organizationId)
    return row ? this.toSubscription(row) : null
  }

  async getById(organizationId: string, id: string): Promise<Subscription> {
    const row = await this.repository.findById(organizationId, id)
    if (!row) throw new Error('Subscription not found')
    return this.toSubscription(row)
  }

  async create(
    organizationId: string,
    input: {
      plan: string
      status?: 'active' | 'trialing' | 'past_due' | 'canceled'
      currentPeriodStart?: string
      currentPeriodEnd?: string
      trialEndsAt?: string | null
      metadata?: Record<string, unknown>
    }
  ): Promise<Subscription> {
    if (!SUBSCRIPTION_PLANS.includes(input.plan as any)) {
      throw new Error(`Plan must be one of: ${SUBSCRIPTION_PLANS.join(', ')}`)
    }
    const now = new Date()
    const end = new Date(now)
    end.setMonth(end.getMonth() + 1)
    const row = await this.repository.create({
      organizationId,
      plan: input.plan,
      status: input.status ?? 'active',
      currentPeriodStart: input.currentPeriodStart ?? now.toISOString(),
      currentPeriodEnd: input.currentPeriodEnd ?? end.toISOString(),
      trialEndsAt: input.trialEndsAt ?? null,
      metadata: input.metadata,
    })
    return this.toSubscription(row)
  }

  async update(
    organizationId: string,
    id: string,
    input: {
      plan?: string
      status?: 'active' | 'trialing' | 'past_due' | 'canceled'
      currentPeriodStart?: string
      currentPeriodEnd?: string
      trialEndsAt?: string | null
      metadata?: Record<string, unknown>
    }
  ): Promise<Subscription> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Subscription not found')
    if (input.plan && !SUBSCRIPTION_PLANS.includes(input.plan as any)) {
      throw new Error(`Plan must be one of: ${SUBSCRIPTION_PLANS.join(', ')}`)
    }
    const row = await this.repository.update(id, {
      plan: input.plan,
      status: input.status,
      currentPeriodStart: input.currentPeriodStart,
      currentPeriodEnd: input.currentPeriodEnd,
      trialEndsAt: input.trialEndsAt,
      metadata: input.metadata,
    })
    return this.toSubscription(row)
  }

  async cancel(organizationId: string, id: string): Promise<Subscription> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Subscription not found')
    const row = await this.repository.update(id, {
      cancelAtPeriodEnd: true,
      canceledAt: new Date().toISOString(),
      status: 'canceled',
    })
    return this.toSubscription(row)
  }

  async reactivate(organizationId: string, id: string): Promise<Subscription> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Subscription not found')
    const now = new Date()
    const end = new Date(now)
    end.setMonth(end.getMonth() + 1)
    const row = await this.repository.update(id, {
      cancelAtPeriodEnd: false,
      canceledAt: null,
      status: 'active',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: end.toISOString(),
    })
    return this.toSubscription(row)
  }

  async remove(organizationId: string, id: string) {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Subscription not found')
    await this.repository.softDelete(id)
  }
}
