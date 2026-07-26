import { supabaseAdmin } from '../lib/supabase'

export interface SecurityIncidentRow {
  id: string
  organization_id: string
  title: string
  description: string | null
  severity: string
  status: string
  reported_by: string | null
  assigned_to: string | null
  occurred_at: string | null
  resolved_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export class SecurityIncidentRepository {
  async list(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('security_incidents')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('occurred_at', { ascending: false })
    if (error) throw error
    return (data || []) as SecurityIncidentRow[]
  }

  async findById(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('security_incidents')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data as SecurityIncidentRow | null
  }

  async create(organizationId: string, input: {
    title: string
    description?: string | null
    severity?: string
    reportedBy?: string | null
    assignedTo?: string | null
    occurredAt?: string | null
    metadata?: Record<string, unknown>
  }) {
    const { data, error } = await supabaseAdmin
      .from('security_incidents')
      .insert({
        organization_id: organizationId,
        title: input.title,
        description: input.description ?? null,
        severity: input.severity ?? 'medium',
        reported_by: input.reportedBy ?? null,
        assigned_to: input.assignedTo ?? null,
        occurred_at: input.occurredAt ?? null,
        metadata: input.metadata ?? {},
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(id: string, input: {
    title?: string
    description?: string | null
    severity?: string
    status?: string
    assignedTo?: string | null
    occurredAt?: string | null
    resolvedAt?: string | null
    metadata?: Record<string, unknown>
  }) {
    const payload: Record<string, unknown> = {}
    if (input.title !== undefined) payload.title = input.title
    if (input.description !== undefined) payload.description = input.description
    if (input.severity !== undefined) payload.severity = input.severity
    if (input.status !== undefined) payload.status = input.status
    if (input.assignedTo !== undefined) payload.assigned_to = input.assignedTo
    if (input.occurredAt !== undefined) payload.occurred_at = input.occurredAt
    if (input.resolvedAt !== undefined) payload.resolved_at = input.resolvedAt
    if (input.metadata !== undefined) payload.metadata = input.metadata

    const { data, error } = await supabaseAdmin
      .from('security_incidents')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async softDelete(id: string) {
    const { error } = await supabaseAdmin
      .from('security_incidents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }
}
