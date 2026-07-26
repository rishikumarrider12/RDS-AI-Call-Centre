import { supabaseAdmin } from '../lib/supabase'
import type { PerformanceBaseline } from '@rds/types'

function toBaseline(row: any): PerformanceBaseline {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    endpoint: row.endpoint,
    method: row.method,
    p50Ms: Number(row.p50_ms),
    p95Ms: Number(row.p95_ms),
    p99Ms: Number(row.p99_ms),
    maxConcurrent: row.max_concurrent ? Number(row.max_concurrent) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class PerformanceRepository {
  async listBaselines(organizationId: string): Promise<PerformanceBaseline[]> {
    const { data, error } = await supabaseAdmin
      .from('performance_baselines')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map(toBaseline)
  }

  async createBaseline(input: {
    organizationId: string
    name: string
    endpoint: string
    method: string
    p50Ms: number
    p95Ms: number
    p99Ms: number
    maxConcurrent?: number | null
  }): Promise<PerformanceBaseline> {
    const { data, error } = await supabaseAdmin
      .from('performance_baselines')
      .insert({
        organization_id: input.organizationId,
        name: input.name,
        endpoint: input.endpoint,
        method: input.method,
        p50_ms: input.p50Ms,
        p95_ms: input.p95Ms,
        p99_ms: input.p99Ms,
        max_concurrent: input.maxConcurrent ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return toBaseline(data)
  }

  async deleteBaseline(organizationId: string, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('performance_baselines')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', id)
    if (error) throw error
  }
}
