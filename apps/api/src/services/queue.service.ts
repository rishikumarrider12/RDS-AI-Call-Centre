import { QueueRepository } from '../repositories/queue.repository'
import type { QueueStats } from '@rds/types'

export class QueueService {
  private repository = new QueueRepository()

  async getStats(organizationId: string): Promise<QueueStats> {
    return this.repository.getStats(organizationId)
  }

  async getAllStats(): Promise<QueueStats[]> {
    return this.repository.getAllStats()
  }

  async enqueue(organizationId: string, name: string, data: Record<string, unknown>): Promise<void> {
    return this.repository.addJob(organizationId, name, data)
  }
}
