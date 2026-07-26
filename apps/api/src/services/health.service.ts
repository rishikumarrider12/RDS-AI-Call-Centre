import { HealthRepository } from '../repositories/health.repository'
import { AlertRepository } from '../repositories/alert.repository'
import { DeploymentRepository } from '../repositories/deployment.repository'
import type { SystemHealthCheck, AlertRule, Deployment } from '@rds/types'

export class HealthService {
  private repository = new HealthRepository()

  async getSystemHealth(organizationId: string): Promise<Record<string, SystemHealthCheck | null>> {
    const components = ['database', 'redis', 'queue', 'api', 'storage', 'ai_engine', 'telephony', 'integration']
    const result: Record<string, SystemHealthCheck | null> = {}

    for (const component of components) {
      result[component] = await this.repository.getLatestCheck(organizationId, component)
    }

    return result
  }

  async listHealthChecks(organizationId: string, component?: string) {
    return this.repository.listChecks(organizationId, component)
  }

  async recordHealthCheck(organizationId: string, input: {
    component: string
    status: 'healthy' | 'degraded' | 'down' | 'unknown'
    latencyMs?: number | null
    details?: Record<string, unknown>
  }): Promise<SystemHealthCheck> {
    return this.repository.recordCheck(organizationId, input)
  }
}

export class AlertService {
  private repository = new AlertRepository()

  async listRules(organizationId: string): Promise<AlertRule[]> {
    return this.repository.listRules(organizationId)
  }

  async getRule(organizationId: string, id: string): Promise<AlertRule | null> {
    return this.repository.getRule(organizationId, id)
  }

  async createRule(organizationId: string, input: {
    name: string
    description?: string | null
    metric: string
    condition: string
    threshold: number
    windowSeconds?: number
    severity?: string
    channels?: Record<string, unknown>[]
  }): Promise<AlertRule> {
    return this.repository.createRule(organizationId, input)
  }

  async updateRule(organizationId: string, id: string, input: {
    name?: string
    description?: string | null
    metric?: string
    condition?: string
    threshold?: number
    windowSeconds?: number
    severity?: string
    isActive?: boolean
    channels?: Record<string, unknown>[]
  }): Promise<AlertRule> {
    return this.repository.updateRule(organizationId, id, input)
  }

  async deleteRule(organizationId: string, id: string): Promise<void> {
    await this.repository.deleteRule(organizationId, id)
  }

  async listHistory(organizationId: string, options: { status?: string; ruleId?: string; page?: number; pageSize?: number } = {}) {
    return this.repository.listHistory(organizationId, options)
  }

  async createAlert(organizationId: string, input: {
    ruleId?: string | null
    severity: string
    metric: string
    value: number
    threshold: number
    message: string
    status?: string
  }) {
    return this.repository.createHistory(organizationId, input)
  }

  async resolveAlert(organizationId: string, id: string) {
    return this.repository.resolveAlert(organizationId, id)
  }
}

export class DeploymentService {
  private repository = new DeploymentRepository()

  async listDeployments(organizationId: string, environment?: string): Promise<Deployment[]> {
    return this.repository.list(organizationId, environment)
  }

  async getDeployment(organizationId: string, id: string): Promise<Deployment | null> {
    return this.repository.getById(organizationId, id)
  }

  async createDeployment(organizationId: string, input: {
    environment: string
    version: string
    commitSha?: string | null
    deployedById?: string | null
    rollbackOfId?: string | null
    metadata?: Record<string, unknown>
  }): Promise<Deployment> {
    return this.repository.create(organizationId, input)
  }

  async updateDeploymentStatus(organizationId: string, id: string, status: string, extra: Record<string, unknown> = {}): Promise<Deployment> {
    return this.repository.updateStatus(organizationId, id, status, extra)
  }
}
