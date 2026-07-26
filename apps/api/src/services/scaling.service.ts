import { ScalingRepository } from '../repositories/scaling.repository'
import type { AutoScalingConfig, ScalingMetric } from '@rds/types'

export class ScalingService {
  private repository = new ScalingRepository()

  async getConfig(organizationId: string): Promise<AutoScalingConfig | null> {
    return this.repository.getConfig(organizationId)
  }

  async upsertConfig(organizationId: string, input: {
    minReplicas: number
    maxReplicas: number
    targetCpuPercent: number
    targetMemoryPercent: number
    scaleUpCooldownSeconds: number
    scaleDownCooldownSeconds: number
  }): Promise<AutoScalingConfig> {
    return this.repository.upsertConfig({ organizationId, ...input })
  }

  async getMetrics(organizationId: string): Promise<ScalingMetric[]> {
    return this.repository.listMetrics(organizationId)
  }
}
