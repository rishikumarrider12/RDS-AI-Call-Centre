import { supabaseAdmin } from '../lib/supabase'

export interface AuditListFilters {
  action?: string
  actorType?: string
  resourceType?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export class AuditRepository {
  async list(organizationId: string, options: AuditListFilters) {
    const page = options.page && options.page > 0 ? options.page : 1
    const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 25
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabaseAdmin
      .from('v_audit_trail')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (options.action) query = query.eq('action', options.action)
    if (options.actorType) query = query.eq('actor_type', options.actorType)
    if (options.resourceType) query = query.eq('resource_type', options.resourceType)
    if (options.dateFrom) query = query.gte('created_at', options.dateFrom)
    if (options.dateTo) query = query.lte('created_at', options.dateTo)
    if (options.search && options.search.trim()) {
      const term = `%${options.search.trim()}%`
      query = query.or(`action.ilike.${term},actor_name.ilike.${term},actor_email.ilike.${term},resource_type.ilike.${term}`)
    }

    const { data, error, count } = await query
    if (error) throw error
    return {
      logs: data || [],
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  /**
   * Returns all matching rows (no pagination) for export.
   */
  async exportRows(organizationId: string, options: AuditListFilters) {
    let query = supabaseAdmin
      .from('v_audit_trail')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (options.action) query = query.eq('action', options.action)
    if (options.actorType) query = query.eq('actor_type', options.actorType)
    if (options.resourceType) query = query.eq('resource_type', options.resourceType)
    if (options.dateFrom) query = query.gte('created_at', options.dateFrom)
    if (options.dateTo) query = query.lte('created_at', options.dateTo)
    if (options.search && options.search.trim()) {
      const term = `%${options.search.trim()}%`
      query = query.or(`action.ilike.${term},actor_name.ilike.${term},actor_email.ilike.${term},resource_type.ilike.${term}`)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  async getDistinctActions(organizationId: string): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('action')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
    if (error) throw error
    const set = new Set((data || []).map((r: any) => r.action).filter(Boolean))
    return Array.from(set).sort()
  }
}
