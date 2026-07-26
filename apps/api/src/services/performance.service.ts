import { PerformanceRepository } from '../repositories/performance.repository'
import type { PerformanceBaseline } from '@rds/types'

export class PerformanceService {
  private repository = new PerformanceRepository()

  async listBaselines(organizationId: string): Promise<PerformanceBaseline[]> {
    return this.repository.listBaselines(organizationId)
  }

  async createBaseline(organizationId: string, input: {
    name: string
    endpoint: string
    method: string
    p50Ms: number
    p95Ms: number
    p99Ms: number
    maxConcurrent?: number | null
  }): Promise<PerformanceBaseline> {
    return this.repository.createBaseline({ organizationId, ...input })
  }

  async deleteBaseline(organizationId: string, id: string): Promise<void> {
    await this.repository.deleteBaseline(organizationId, id)
  }
}
