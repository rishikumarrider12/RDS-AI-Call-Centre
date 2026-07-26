import { Worker } from 'bullmq'
import { getRedis } from '../lib/redis'
import { logger } from '../lib/logger'

const JOB_HANDLERS: Record<string, (data: Record<string, unknown>) => Promise<void>> = {
  webhook: async (data) => {
    logger.info({ data }, 'processing webhook job')
  },
  notification: async (data) => {
    logger.info({ data }, 'processing notification job')
  },
  cost: async (data) => {
    logger.info({ data }, 'processing cost evaluation job')
  },
  backup: async (data) => {
    logger.info({ data }, 'processing backup job')
  },
}

export function createWorker(queueName: string): Worker {
  return new Worker(
    queueName,
    async (job) => {
      const handler = JOB_HANDLERS[job.name]
      if (!handler) {
        logger.warn({ jobName: job.name }, 'no handler for job type')
        return
      }
      await handler(job.data)
    },
    {
      connection: getRedis(),
      concurrency: 5,
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    }
  )
}
