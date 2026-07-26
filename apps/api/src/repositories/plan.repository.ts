import { supabaseAdmin } from '../lib/supabase'

export interface PlanRow {
  id: string
  organization_id: string
  name: string
  slug: string
  description: string | null
  price_monthly: number
  price_yearly: number
  currency: string
  limits: Record<string, unknown>
  features: Array<Record<string, unknown>>
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export class PlanRepository {
  async list(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return (data || []) as PlanRow[]
  }

  async findById(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data as PlanRow | null
  }

  async findBySlug(organizationId: string, slug: string) {
    const { data, error } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('slug', slug)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data as PlanRow | null
  }

  async create(organizationId: string, input: {
    name: string
    slug: string
    description?: string | null
    priceMonthly: number
    priceYearly: number
    currency?: string
    limits?: Record<string, unknown>
    features?: Array<Record<string, unknown>>
    sortOrder?: number
  }) {
    const { data, error } = await supabaseAdmin
      .from('plans')
      .insert({
        organization_id: organizationId,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        price_monthly: input.priceMonthly,
        price_yearly: input.priceYearly,
        currency: input.currency || 'USD',
        limits: input.limits || {},
        features: input.features || [],
        sort_order: input.sortOrder ?? 0,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(organizationId: string, id: string, input: {
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
  }) {
    const payload: Record<string, unknown> = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.slug !== undefined) payload.slug = input.slug
    if (input.description !== undefined) payload.description = input.description
    if (input.priceMonthly !== undefined) payload.price_monthly = input.priceMonthly
    if (input.priceYearly !== undefined) payload.price_yearly = input.priceYearly
    if (input.currency !== undefined) payload.currency = input.currency
    if (input.limits !== undefined) payload.limits = input.limits
    if (input.features !== undefined) payload.features = input.features
    if (input.isActive !== undefined) payload.is_active = input.isActive
    if (input.sortOrder !== undefined) payload.sort_order = input.sortOrder

    const { data, error } = await supabaseAdmin
      .from('plans')
      .update(payload)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async softDelete(organizationId: string, id: string) {
    const { error } = await supabaseAdmin
      .from('plans')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId)
    if (error) throw error
  }
}
