import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { requireAnyRole } from '../middleware/auth'
import { DisasterRecoveryService } from '../services/disasterRecovery.service'
import { logger } from '../lib/logger'

const router = Router()
const drService = new DisasterRecoveryService()

const strategySchema = z.enum(['backup_restore', 'multi_region', 'active_passive', 'active_active'])

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  strategy: strategySchema.default('backup_restore'),
  rpoMinutes: z.number().int().positive().default(60),
  rtoMinutes: z.number().int().positive().default(120),
  backupScheduleCron: z.string().nullable().optional(),
  primaryRegionId: z.string().uuid().nullable().optional(),
  secondaryRegionId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional().default(true),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  strategy: strategySchema.optional(),
  rpoMinutes: z.number().int().positive().optional(),
  rtoMinutes: z.number().int().positive().optional(),
  backupScheduleCron: z.string().nullable().optional(),
  primaryRegionId: z.string().uuid().nullable().optional(),
  secondaryRegionId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
})

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId!
    const configs = await drService.listConfigs(organizationId)
    res.status(200).json({ configs })
  } catch (err) {
    logger.error(err, 'list DR configs failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list disaster recovery configs' })
  }
})

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId!
    const config = await drService.getConfig(organizationId, req.params.id)
    if (!config) return res.status(404).json({ error: 'Disaster recovery config not found' })
    res.status(200).json({ config })
  } catch (err) {
    logger.error(err, 'get DR config failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get disaster recovery config' })
  }
})

router.post('/', authenticate, requireAnyRole(['super_admin', 'org_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId!
    const input = createSchema.parse(req.body)
    const config = await drService.createConfig(organizationId, input)
    res.status(201).json({ config })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    logger.error(err, 'create DR config failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create disaster recovery config' })
  }
})

router.patch('/:id', authenticate, requireAnyRole(['super_admin', 'org_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId!
    const input = updateSchema.parse(req.body)
    const config = await drService.updateConfig(organizationId, req.params.id, input)
    res.status(200).json({ config })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    logger.error(err, 'update DR config failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update disaster recovery config' })
  }
})

router.delete('/:id', authenticate, requireAnyRole(['super_admin', 'org_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId!
    await drService.deleteConfig(organizationId, req.params.id)
    res.status(204).send()
  } catch (err) {
    logger.error(err, 'delete DR config failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete disaster recovery config' })
  }
})

router.post('/:id/drill', authenticate, requireAnyRole(['super_admin', 'org_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId!
    const config = await drService.runDrill(organizationId, req.params.id)
    res.status(200).json({ config })
  } catch (err) {
    logger.error(err, 'DR drill failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to run disaster recovery drill' })
  }
})

router.get('/verification/status', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId!
    const verification = await drService.verifyBackups(organizationId)
    res.status(200).json({ verification })
  } catch (err) {
    logger.error(err, 'backup verification failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to verify backups' })
  }
})

export default router
