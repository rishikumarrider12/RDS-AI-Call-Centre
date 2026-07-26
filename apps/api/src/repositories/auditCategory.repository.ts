import { supabaseAdmin } from '../lib/supabase'

export interface AuditCategoryRow {
  id: string
  organization_id: string
  name: string
  slug: string
  description: string | null
  color: string
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export class AuditCategoryRepository {
  async list(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('audit_categories')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('name', { ascending: true })
    if (error) throw error
    return (data || []) as AuditCategoryRow[]
  }

  async findById(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('audit_categories')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data as AuditCategoryRow | null
  }

  async findBySlug(organizationId: string, slug: string) {
    const { data, error } = await supabaseAdmin
      .from('audit_categories')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('slug', slug)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data as AuditCategoryRow | null
  }

  async create(organizationId: string, input: {
    name: string
    slug: string
    description?: string | null
    color?: string
    isActive?: boolean
  }) {
    const { data, error } = await supabaseAdmin
      .from('audit_categories')
      .insert({
        organization_id: organizationId,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        color: input.color ?? '#6366f1',
        is_active: input.isActive ?? true,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(id: string, input: {
    name?: string
    slug?: string
    description?: string | null
    color?: string
    isActive?: boolean
  }) {
    const payload: Record<string, unknown> = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.slug !== undefined) payload.slug = input.slug
    if (input.description !== undefined) payload.description = input.description
    if (input.color !== undefined) payload.color = input.color
    if (input.isActive !== undefined) payload.is_active = input.isActive

    const { data, error } = await supabaseAdmin
      .from('audit_categories')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async softDelete(id: string) {
    const { error } = await supabaseAdmin
      .from('audit_categories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }
}
