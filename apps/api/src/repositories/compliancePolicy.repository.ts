import { supabaseAdmin } from '../lib/supabase'

export interface CompliancePolicyRow {
  id: string
  organization_id: string
  name: string
  framework: string
  description: string | null
  requirements: Record<string, unknown>[]
  controls: Record<string, unknown>[]
  status: string
  effective_at: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export class CompliancePolicyRepository {
  async list(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('compliance_policies')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as CompliancePolicyRow[]
  }

  async findById(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('compliance_policies')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data as CompliancePolicyRow | null
  }

  async create(organizationId: string, input: {
    name: string
    framework: string
    description?: string | null
    requirements?: Record<string, unknown>[]
    controls?: Record<string, unknown>[]
    status?: string
    effectiveAt?: string | null
    reviewedAt?: string | null
  }) {
    const { data, error } = await supabaseAdmin
      .from('compliance_policies')
      .insert({
        organization_id: organizationId,
        name: input.name,
        framework: input.framework,
        description: input.description ?? null,
        requirements: input.requirements ?? [],
        controls: input.controls ?? [],
        status: input.status ?? 'draft',
        effective_at: input.effectiveAt ?? null,
        reviewed_at: input.reviewedAt ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(id: string, input: {
    name?: string
    framework?: string
    description?: string | null
    requirements?: Record<string, unknown>[]
    controls?: Record<string, unknown>[]
    status?: string
    effectiveAt?: string | null
    reviewedAt?: string | null
  }) {
    const payload: Record<string, unknown> = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.framework !== undefined) payload.framework = input.framework
    if (input.description !== undefined) payload.description = input.description
    if (input.requirements !== undefined) payload.requirements = input.requirements
    if (input.controls !== undefined) payload.controls = input.controls
    if (input.status !== undefined) payload.status = input.status
    if (input.effectiveAt !== undefined) payload.effective_at = input.effectiveAt
    if (input.reviewedAt !== undefined) payload.reviewed_at = input.reviewedAt

    const { data, error } = await supabaseAdmin
      .from('compliance_policies')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async softDelete(id: string) {
    const { error } = await supabaseAdmin
      .from('compliance_policies')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }
}
