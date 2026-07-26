import { supabaseAdmin } from '../lib/supabase'
import type { AutoScalingConfig, ScalingMetric } from '@rds/types'

function toConfig(row: any): AutoScalingConfig {
  return {
    id: row.id,
    organizationId: row.organization_id,
    minReplicas: Number(row.min_replicas),
    maxReplicas: Number(row.max_replicas),
    targetCpuPercent: Number(row.target_cpu_percent),
    targetMemoryPercent: Number(row.target_memory_percent),
    scaleUpCooldownSeconds: Number(row.scale_up_cooldown_seconds),
    scaleDownCooldownSeconds: Number(row.scale_down_cooldown_seconds),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class ScalingRepository {
  async getConfig(organizationId: string): Promise<AutoScalingConfig | null> {
    const { data, error } = await supabaseAdmin
      .from('auto_scaling_configs')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle()
    if (error) throw error
    return data ? toConfig(data) : null
  }

  async upsertConfig(input: {
    organizationId: string
    minReplicas: number
    maxReplicas: number
    targetCpuPercent: number
    targetMemoryPercent: number
    scaleUpCooldownSeconds: number
    scaleDownCooldownSeconds: number
  }): Promise<AutoScalingConfig> {
    const { data, error } = await supabaseAdmin
      .from('auto_scaling_configs')
      .upsert(
        {
          organization_id: input.organizationId,
          min_replicas: input.minReplicas,
          max_replicas: input.maxReplicas,
          target_cpu_percent: input.targetCpuPercent,
          target_memory_percent: input.targetMemoryPercent,
          scale_up_cooldown_seconds: input.scaleUpCooldownSeconds,
          scale_down_cooldown_seconds: input.scaleDownCooldownSeconds,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id' }
      )
      .select()
      .single()
    if (error) throw error
    return toConfig(data)
  }

  async listMetrics(organizationId: string): Promise<ScalingMetric[]> {
    const { data, error } = await supabaseAdmin
      .from('scaling_metrics')
      .select('*')
      .eq('organization_id', organizationId)
      .order('recorded_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return (data || []).map((row: any) => ({
      id: row.id,
      organizationId: row.organization_id,
      replicas: Number(row.replicas),
      cpuPercent: Number(row.cpu_percent),
      memoryPercent: Number(row.memory_percent),
      requestsPerSecond: Number(row.requests_per_second),
      recordedAt: row.recorded_at,
    }))
  }

  async insertMetric(input: {
    organizationId: string
    replicas: number
    cpuPercent: number
    memoryPercent: number
    requestsPerSecond: number
  }): Promise<ScalingMetric> {
    const { data, error } = await supabaseAdmin
      .from('scaling_metrics')
      .insert({
        organization_id: input.organizationId,
        replicas: input.replicas,
        cpu_percent: input.cpuPercent,
        memory_percent: input.memoryPercent,
        requests_per_second: input.requestsPerSecond,
      })
      .select()
      .single()
    if (error) throw error
    return {
      id: data.id,
      organizationId: data.organization_id,
      replicas: Number(data.replicas),
      cpuPercent: Number(data.cpu_percent),
      memoryPercent: Number(data.memory_percent),
      requestsPerSecond: Number(data.requests_per_second),
      recordedAt: data.recorded_at,
    }
  }
}
