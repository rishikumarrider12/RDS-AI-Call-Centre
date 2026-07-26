import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth'
import { HealthService } from '../services/health.service'
import { logger } from '../lib/logger'

const router = Router()
const healthService = new HealthService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) throw new Error('No organization associated with this account')
  return orgId
}

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const health = await healthService.getSystemHealth(organizationId)
    const overall = Object.values(health).every((h) => h?.status === 'healthy') ? 'healthy' : 'degraded'
    res.status(200).json({ status: overall, components: health })
  } catch (err) {
    logger.error(err, 'system health check failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load system health' })
  }
})

router.get('/history', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const component = typeof req.query.component === 'string' ? req.query.component : undefined
    const checks = await healthService.listHealthChecks(organizationId, component)
    res.status(200).json({ checks })
  } catch (err) {
    logger.error(err, 'list health checks failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list health checks' })
  }
})

export default router
