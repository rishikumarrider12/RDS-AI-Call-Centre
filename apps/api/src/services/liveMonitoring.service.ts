import { ActiveCallRepository } from '../repositories/activeCall.repository'
import { MetricsRepository } from '../repositories/metrics.repository'
import { LiveMonitoringRepository } from '../repositories/liveMonitoring.repository'
import { supabaseAdmin } from '../lib/supabase'

export interface LiveDashboardStats {
  activeCalls: number
  waitingCalls: number
  connectedAgents: number
  avgCallDuration: number
  callsToday: number
  queueHealth: number
  successRate: number
  totalAgents: number
}

export class LiveDashboardService {
  private activeRepo = new ActiveCallRepository()
  private metricsRepo = new MetricsRepository()
  private liveRepo = new LiveMonitoringRepository()

  async getStats(organizationId: string): Promise<LiveDashboardStats> {
    const [activeStats, todayCalls, agentSessions] = await Promise.all([
      this.activeRepo.getStats(organizationId),
      this.getTodayCalls(organizationId),
      this.liveRepo.listAgentSessions(organizationId),
    ])

    const connectedAgents = agentSessions.filter((s) => s.status === 'busy' || s.status === 'paused').length
    const totalAgents = agentSessions.length
    const queueHealth = totalAgents > 0 ? Math.round((connectedAgents / totalAgents) * 100) : 0

    const successRate = todayCalls > 0 ? Math.round(((activeStats.connected + (todayCalls - activeStats.total)) / Math.max(1, todayCalls)) * 100) : 0

    return {
      activeCalls: activeStats.total,
      waitingCalls: activeStats.waiting,
      connectedAgents,
      avgCallDuration: activeStats.avgDuration,
      callsToday: todayCalls,
      queueHealth,
      successRate,
      totalAgents,
    }
  }

  async getActiveCalls(organizationId: string, status?: string) {
    return this.activeRepo.list(organizationId, status)
  }

  async getQueueStatus(organizationId: string) {
    const queueMetrics = await this.metricsRepo.getQueueMetrics(organizationId)
    const activeCalls = await this.activeRepo.list(organizationId)

    const queueMap = new Map<string, any>()

    for (const qm of queueMetrics) {
      queueMap.set(qm.queue_name, {
        name: qm.queue_name,
        waiting: qm.waiting_count,
        active: qm.active_count,
        completed: qm.completed_count,
        abandoned: qm.abandoned_count,
        avgWait: qm.avg_wait_seconds,
        maxWait: qm.max_wait_seconds,
        updatedAt: qm.recorded_at,
      })
    }

    for (const call of activeCalls) {
      if (call.call_queue_id) {
        const queueName = `Queue ${call.call_queue_id.slice(0, 8)}`
        const existing = queueMap.get(queueName)
        if (existing) {
          existing.active++
        } else {
          queueMap.set(queueName, {
            name: queueName,
            waiting: 0,
            active: 1,
            completed: 0,
            abandoned: 0,
            avgWait: 0,
            maxWait: 0,
            updatedAt: new Date().toISOString(),
          })
        }
      }
    }

    return Array.from(queueMap.values())
  }

  async getAgentStatus(organizationId: string) {
    const sessions = await this.liveRepo.listAgentSessions(organizationId)
    return sessions.map((s) => ({
      id: s.agent_id,
      status: s.status,
      activeCalls: s.active_calls_count,
      completedCalls: s.completed_calls_count,
      failedCalls: s.failed_calls_count,
      totalTalkSeconds: s.total_talk_seconds,
      lastActivityAt: s.last_activity_at,
    }))
  }

  async getCallVolume(organizationId: string, hours = 24) {
    const since = new Date()
    since.setHours(since.getHours() - hours)

    const metrics = await this.metricsRepo.getMetrics(organizationId, 'calls_per_minute', since.toISOString())

    return metrics.map((m) => ({
      timestamp: m.recorded_at,
      value: Number(m.value),
    }))
  }

  async getRecentEvents(organizationId: string, limit = 50) {
    return this.liveRepo.getLiveEvents(organizationId, limit)
  }

  private async getTodayCalls(organizationId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', new Date().setHours(0, 0, 0, 0))

    if (error) throw error
    return count || 0
  }
}
