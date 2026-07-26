import { QueueManager } from '../lib/queues'
import type { QueueStats } from '@rds/types'

export class QueueRepository {
  async getStats(organizationId: string): Promise<QueueStats> {
    return QueueManager.getStats(organizationId)
  }

  async getAllStats(): Promise<QueueStats[]> {
    return QueueManager.getAllStats()
  }

  async addJob(organizationId: string, name: string, data: Record<string, unknown>): Promise<void> {
    await QueueManager.addJob(organizationId, name, data)
  }
}
