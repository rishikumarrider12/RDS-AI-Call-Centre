import { supabaseAdmin } from '../lib/supabase'
import type { SystemHealthComponent, SystemHealthStatus } from '@rds/types'

export interface SystemHealthCheckRow {
  id: string
  organizationId: string
  component: SystemHealthComponent
  status: SystemHealthStatus
  latencyMs: number | null
  details: Record<string, unknown>
  checkedAt: string
  createdAt: string
}

export class HealthRepository {
  async listChecks(organizationId: string, component?: string) {
    let query = supabaseAdmin
      .from('system_health_checks')
      .select('*')
      .eq('organization_id', organizationId)
      .order('checked_at', { ascending: false })
      .limit(100)

    if (component) query = query.eq('component', component)

    const { data, error } = await query
    if (error) throw error
    const rows: SystemHealthCheckRow[] = (data || []).map((row: any) => ({
      id: row.id,
      organizationId: row.organization_id,
      component: row.component as SystemHealthComponent,
      status: row.status as SystemHealthStatus,
      latencyMs: row.latency_ms,
      details: row.details ?? {},
      checkedAt: row.checked_at,
      createdAt: row.created_at,
    }))
    return rows
  }

  async getLatestCheck(organizationId: string, component: string) {
    const { data, error } = await supabaseAdmin
      .from('system_health_checks')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('component', component)
      .order('checked_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    const row: SystemHealthCheckRow = {
      id: data.id,
      organizationId: data.organization_id,
      component: data.component as SystemHealthComponent,
      status: data.status as SystemHealthStatus,
      latencyMs: data.latency_ms,
      details: data.details ?? {},
      checkedAt: data.checked_at,
      createdAt: data.created_at,
    }
    return row
  }

  async recordCheck(organizationId: string, input: {
    component: string
    status: 'healthy' | 'degraded' | 'down' | 'unknown'
    latencyMs?: number | null
    details?: Record<string, unknown>
  }) {
    const { data, error } = await supabaseAdmin
      .from('system_health_checks')
      .insert({
        organization_id: organizationId,
        component: input.component,
        status: input.status,
        latency_ms: input.latencyMs ?? null,
        details: input.details ?? {},
      })
      .select()
      .single()

    if (error) throw error
    const row: SystemHealthCheckRow = {
      id: data.id,
      organizationId: data.organization_id,
      component: data.component as SystemHealthComponent,
      status: data.status as SystemHealthStatus,
      latencyMs: data.latency_ms,
      details: data.details ?? {},
      checkedAt: data.checked_at,
      createdAt: data.created_at,
    }
    return row
  }

  async cleanupOldChecks(organizationId: string, olderThanDays: number = 7) {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString()
    const { error } = await supabaseAdmin
      .from('system_health_checks')
      .delete()
      .eq('organization_id', organizationId)
      .lt('checked_at', cutoff)

    if (error) throw error
  }
}
