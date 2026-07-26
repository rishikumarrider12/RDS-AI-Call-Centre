import { supabaseAdmin } from '../lib/supabase'

export interface LiveMetricRow {
  id: string
  organization_id: string
  metric_type: string
  value: number
  metadata: Record<string, unknown>
  recorded_at: string
  created_at: string
}

export interface QueueMetricRow {
  id: string
  organization_id: string
  call_queue_id: string | null
  queue_name: string
  waiting_count: number
  active_count: number
  completed_count: number
  abandoned_count: number
  avg_wait_seconds: number
  max_wait_seconds: number
  recorded_at: string
  created_at: string
}

export class MetricsRepository {
  async recordMetric(organizationId: string, metricType: string, value: number, metadata: Record<string, unknown> = {}) {
    const { data, error } = await supabaseAdmin
      .from('live_metrics')
      .insert({
        organization_id: organizationId,
        metric_type: metricType,
        value,
        metadata,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getMetrics(organizationId: string, metricType: string, since?: string) {
    let query = supabaseAdmin
      .from('live_metrics')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('metric_type', metricType)
      .order('recorded_at', { ascending: true })
      .limit(200)

    if (since) {
      query = query.gte('recorded_at', since)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []) as LiveMetricRow[]
  }

  async getLatestMetrics(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('live_metrics')
      .select('*')
      .eq('organization_id', organizationId)
      .order('recorded_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return (data || []) as LiveMetricRow[]
  }

  async recordQueueMetrics(organizationId: string, queueId: string | null, queueName: string, metrics: {
    waitingCount: number
    activeCount: number
    completedCount: number
    abandonedCount: number
    avgWaitSeconds: number
    maxWaitSeconds: number
  }) {
    const { data, error } = await supabaseAdmin
      .from('queue_metrics')
      .insert({
        organization_id: organizationId,
        call_queue_id: queueId,
        queue_name: queueName,
        waiting_count: metrics.waitingCount,
        active_count: metrics.activeCount,
        completed_count: metrics.completedCount,
        abandoned_count: metrics.abandonedCount,
        avg_wait_seconds: metrics.avgWaitSeconds,
        max_wait_seconds: metrics.maxWaitSeconds,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getQueueMetrics(organizationId: string, queueId?: string) {
    let query = supabaseAdmin
      .from('queue_metrics')
      .select('*')
      .eq('organization_id', organizationId)
      .order('recorded_at', { ascending: false })
      .limit(100)

    if (queueId) {
      query = query.eq('call_queue_id', queueId)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []) as QueueMetricRow[]
  }

  async cleanupOldMetrics() {
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - 48)

    const { error } = await supabaseAdmin
      .from('live_metrics')
      .delete()
      .lt('recorded_at', cutoff.toISOString())

    if (error) throw error
  }
}
