import { supabaseAdmin } from '../lib/supabase'

export interface CreateSubscriptionInput {
  organizationId: string
  plan: string
  status?: 'active' | 'trialing' | 'past_due' | 'canceled'
  currentPeriodStart: string
  currentPeriodEnd: string
  trialEndsAt?: string | null
  metadata?: Record<string, unknown>
}

export interface UpdateSubscriptionInput {
  plan?: string
  status?: 'active' | 'trialing' | 'past_due' | 'canceled'
  currentPeriodStart?: string
  currentPeriodEnd?: string
  trialEndsAt?: string | null
  cancelAtPeriodEnd?: boolean
  canceledAt?: string | null
  metadata?: Record<string, unknown>
}

export class SubscriptionRepository {
  async list(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }

  async getCurrent(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async findById(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async create(input: CreateSubscriptionInput) {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        organization_id: input.organizationId,
        plan: input.plan,
        status: input.status ?? 'active',
        current_period_start: input.currentPeriodStart,
        current_period_end: input.currentPeriodEnd,
        trial_ends_at: input.trialEndsAt ?? null,
        metadata: input.metadata ?? {},
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(id: string, input: UpdateSubscriptionInput) {
    const payload: Record<string, unknown> = {}
    if (input.plan !== undefined) payload.plan = input.plan
    if (input.status !== undefined) payload.status = input.status
    if (input.currentPeriodStart !== undefined) payload.current_period_start = input.currentPeriodStart
    if (input.currentPeriodEnd !== undefined) payload.current_period_end = input.currentPeriodEnd
    if (input.trialEndsAt !== undefined) payload.trial_ends_at = input.trialEndsAt
    if (input.cancelAtPeriodEnd !== undefined) payload.cancel_at_period_end = input.cancelAtPeriodEnd
    if (input.canceledAt !== undefined) payload.canceled_at = input.canceledAt
    if (input.metadata !== undefined) payload.metadata = input.metadata
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async softDelete(id: string) {
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }
}
