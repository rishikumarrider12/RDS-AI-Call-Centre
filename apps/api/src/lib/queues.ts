import { Queue, QueueOptions, Job } from 'bullmq'
import { getRedis } from './redis'

export type QueueJobData = Record<string, unknown>

export interface QueueStats {
  name: string
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
}

export class QueueManager {
  private static instances = new Map<string, Queue>()

  static getQueueName(organizationId: string): string {
    return `org:${organizationId}:jobs`
  }

  static getQueue(organizationId: string): Queue {
    const name = this.getQueueName(organizationId)
    if (!this.instances.has(name)) {
      const opts: QueueOptions = {
        connection: getRedis(),
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 5000 },
        },
      }
      this.instances.set(name, new Queue(name, opts))
    }
    return this.instances.get(name)!
  }

  static async addJob(organizationId: string, name: string, data: QueueJobData, opts?: Record<string, unknown>): Promise<Job> {
    const queue = this.getQueue(organizationId)
    return queue.add(name, data, opts)
  }

  static async getStats(organizationId: string): Promise<QueueStats> {
    const queue = this.getQueue(organizationId)
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ])

    return {
      name: this.getQueueName(organizationId),
      waiting,
      active,
      completed,
      failed,
      delayed,
    }
  }

  static async getAllStats(): Promise<QueueStats[]> {
    const keys = await getRedis().keys('org:*:jobs')
    const orgIds = keys
      .map((k) => k.split(':')[1])
      .filter((v): v is string => Boolean(v))

    const uniqueOrgIds = Array.from(new Set(orgIds))
    return Promise.all(uniqueOrgIds.map((orgId) => this.getStats(orgId)))
  }

  static async close(): Promise<void> {
    await Promise.all(Array.from(this.instances.values()).map((q) => q.close()))
    this.instances.clear()
  }
}
