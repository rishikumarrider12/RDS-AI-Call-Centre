import { supabaseAdmin } from '../lib/supabase'

export interface DuplicateContact {
  id: string
  organization_id: string
  import_job_id: string | null
  contact_id: string
  duplicate_of_phone: string
  duplicate_contact_id: string | null
  status: 'detected' | 'reviewed' | 'merged' | 'ignored'
  resolved_at: string | null
  created_at: string
}

export class DuplicateContactRepository {
  async create(organizationId: string, input: {
    importJobId?: string | null
    contactId: string
    duplicateOfPhone: string
    duplicateContactId?: string | null
  }) {
    const { data, error } = await supabaseAdmin
      .from('duplicate_contacts')
      .insert({
        organization_id: organizationId,
        import_job_id: input.importJobId ?? null,
        contact_id: input.contactId,
        duplicate_of_phone: input.duplicateOfPhone,
        duplicate_contact_id: input.duplicateContactId ?? null,
        status: 'detected',
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async list(organizationId: string, status?: string, limit = 200) {
    let query = supabaseAdmin
      .from('duplicate_contacts')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []) as DuplicateContact[]
  }

  async listByImportJob(importJobId: string) {
    const { data, error } = await supabaseAdmin
      .from('duplicate_contacts')
      .select('*')
      .eq('import_job_id', importJobId)
    if (error) throw error
    return (data || []) as DuplicateContact[]
  }

  async updateStatus(id: string, status: 'detected' | 'reviewed' | 'merged' | 'ignored', resolvedAt?: string) {
    const payload: Record<string, unknown> = { status }
    if (status === 'merged' || status === 'ignored') payload.resolved_at = resolvedAt ?? new Date().toISOString()
    const { data, error } = await supabaseAdmin
      .from('duplicate_contacts')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async countByStatus(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('duplicate_contacts')
      .select('status')
      .eq('organization_id', organizationId)

    if (error) throw error

    const counts: Record<string, number> = {}
    for (const row of data || []) {
      counts[row.status] = (counts[row.status] || 0) + 1
    }
    return counts
  }
}
