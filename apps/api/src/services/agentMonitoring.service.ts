import { LiveMonitoringRepository } from '../repositories/liveMonitoring.repository'
import { ActiveCallRepository } from '../repositories/activeCall.repository'
import { MetricsRepository } from '../repositories/metrics.repository'

export class QueueMonitoringService {
  private liveRepo = new LiveMonitoringRepository()
  private activeRepo = new ActiveCallRepository()
  private metricsRepo = new MetricsRepository()

  async getOverview(organizationId: string) {
    const [queueMetrics, activeCalls] = await Promise.all([
      this.metricsRepo.getQueueMetrics(organizationId),
      this.activeRepo.list(organizationId),
    ])

    const overview = queueMetrics.map((qm) => {
      const relatedCalls = activeCalls.filter((c) => c.call_queue_id === qm.call_queue_id)
      return {
        id: qm.call_queue_id,
        name: qm.queue_name,
        waiting: qm.waiting_count + relatedCalls.filter((c) => c.status === 'queued').length,
        active: relatedCalls.filter((c) => c.status === 'connected' || c.status === 'ringing').length,
        completed: qm.completed_count,
        abandoned: qm.abandoned_count,
        avgWaitSeconds: qm.avg_wait_seconds,
        maxWaitSeconds: qm.max_wait_seconds,
        updatedAt: qm.recorded_at,
      }
    })

    const totalWaiting = overview.reduce((sum, q) => sum + q.waiting, 0)
    const totalActive = overview.reduce((sum, q) => sum + q.active, 0)
    const totalAbandoned = overview.reduce((sum, q) => sum + q.abandoned, 0)

    return {
      queues: overview,
      summary: {
        totalQueues: overview.length,
        totalWaiting,
        totalActive,
        totalAbandoned,
        avgWaitSeconds: overview.length > 0 ? Math.round(overview.reduce((sum, q) => sum + q.avgWaitSeconds, 0) / overview.length) : 0,
      },
    }
  }

  async recordQueueHeartbeat(organizationId: string, queueId: string, queueName: string) {
    const activeCalls = await this.activeRepo.list(organizationId)
    const queueCalls = activeCalls.filter((c) => c.call_queue_id === queueId)

    const waiting = queueCalls.filter((c) => c.status === 'queued' || c.status === 'ringing').length
    const active = queueCalls.filter((c) => c.status === 'connected').length

    return this.metricsRepo.recordQueueMetrics(organizationId, queueId, queueName, {
      waitingCount: waiting,
      activeCount: active,
      completedCount: 0,
      abandonedCount: 0,
      avgWaitSeconds: 0,
      maxWaitSeconds: 0,
    })
  }
}

export class AgentMonitoringService {
  private liveRepo = new LiveMonitoringRepository()
  private activeRepo = new ActiveCallRepository()

  async getAgentOverview(organizationId: string) {
    const sessions = await this.liveRepo.listAgentSessions(organizationId)
    const activeCalls = await this.activeRepo.list(organizationId)

    const agents = sessions.map((session) => {
      const agentActiveCalls = activeCalls.filter((c) => c.agent_id === session.agent_id)
      const utilization = session.total_talk_seconds > 0 ? Math.min(100, Math.round((session.active_calls_count / Math.max(1, session.completed_calls_count + session.active_calls_count)) * 100)) : 0

      return {
        id: session.agent_id,
        status: session.status,
        activeCalls: agentActiveCalls.length,
        completedCalls: session.completed_calls_count,
        failedCalls: session.failed_calls_count,
        totalTalkSeconds: session.total_talk_seconds,
        utilization,
        lastActivityAt: session.last_activity_at,
        currentCallId: session.current_call_id,
      }
    })

    const busyCount = agents.filter((a) => a.status === 'busy' || a.status === 'paused').length
    const idleCount = agents.filter((a) => a.status === 'idle').length
    const offlineCount = agents.filter((a) => a.status === 'offline').length

    return {
      agents,
      summary: {
        total: agents.length,
        busy: busyCount,
        idle: idleCount,
        offline: offlineCount,
        avgUtilization: agents.length > 0 ? Math.round(agents.reduce((sum, a) => sum + a.utilization, 0) / agents.length) : 0,
      },
    }
  }

  async updateAgentStatus(organizationId: string, agentId: string, status: string, currentCallId?: string | null) {
    return this.liveRepo.upsertAgentSession(organizationId, {
      agentId,
      status,
      currentCallId: currentCallId || null,
    })
  }
}
