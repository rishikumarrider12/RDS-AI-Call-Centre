import { Router, Request, Response } from 'express'
import { logger } from '../lib/logger'
import { supabaseAdmin } from '../lib/supabase'
import { getRedis } from '../lib/redis'

const router = Router()

async function checkDatabase(): Promise<{ status: string; detail?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('organizations')
      .select('id', { count: 'exact', head: true })

    if (error) {
      return { status: 'degraded', detail: error.message }
    }

    return { status: 'healthy' }
  } catch (err) {
    return { status: 'down', detail: err instanceof Error ? err.message : 'unknown' }
  }
}

async function checkRedis(): Promise<{ status: string; detail?: string }> {
  try {
    const redis = getRedis()
    const pong = await redis.ping()

    if (pong === 'PONG') {
      return { status: 'healthy' }
    }

    return { status: 'degraded', detail: `unexpected ping response: ${pong}` }
  } catch (err) {
    return { status: 'down', detail: err instanceof Error ? err.message : 'unknown' }
  }
}

router.get('/health', async (_req: Request, res: Response) => {
  try {
    const [database, redis] = await Promise.all([
      checkDatabase(),
      checkRedis(),
    ])

    const overall = [database, redis].every((c) => c.status === 'healthy') ? 'healthy' : 'degraded'
    const statusCode = overall === 'healthy' ? 200 : 503

    res.status(statusCode).json({
      status: overall,
      timestamp: new Date().toISOString(),
      checks: {
        database,
        redis,
      },
    })
  } catch (err) {
    logger.error(err, 'health check failed')
    res.status(503).json({ status: 'down', timestamp: new Date().toISOString() })
  }
})

export default router
