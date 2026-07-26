import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { QueueService } from '../services/queue.service'
import { logger } from '../lib/logger'

const router = Router()
const queueService = new QueueService()

const enqueueSchema = z.object({
  name: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
})

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const stats = await queueService.getAllStats()
    res.status(200).json({ queues: stats })
  } catch (err) {
    logger.error(err, 'list queues failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list queues' })
  }
})

router.get('/:organizationId', authenticate, async (req: Request, res: Response) => {
  try {
    const stats = await queueService.getStats(req.params.organizationId)
    res.status(200).json({ stats })
  } catch (err) {
    logger.error(err, 'get queue stats failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get queue stats' })
  }
})

router.post('/:organizationId/enqueue', authenticate, async (req: Request, res: Response) => {
  try {
    const input = enqueueSchema.parse(req.body)
    await queueService.enqueue(req.params.organizationId, input.name, input.data)
    res.status(202).json({ message: 'Job enqueued' })
  } catch (err) {
    logger.error(err, 'enqueue job failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to enqueue job' })
  }
})

export default router
