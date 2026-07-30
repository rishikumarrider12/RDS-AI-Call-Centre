import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { requireAnyRole } from '../middleware/auth'
import { MaintenanceService } from '../services/maintenance.service'
import { logger } from '../lib/logger'

const router = Router()
const maintenanceService = new MaintenanceService()

const createWindowSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  isActive: z.boolean().optional().default(true),
})

const updateWindowSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
})

// Maintenance Windows
router.get('/windows', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId!
    const windows = await maintenanceService.listMaintenanceWindows(organizationId)
    res.status(200).json({ windows })
  } catch (err) {
    logger.error(err, 'list maintenance windows failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list maintenance windows' })
  }
})

router.get('/windows/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId!
    const window = await maintenanceService.getMaintenanceWindow(organizationId, req.params.id)
    if (!window) return res.status(404).json({ error: 'Maintenance window not found' })
    res.status(200).json({ window })
  } catch (err) {
    logger.error(err, 'get maintenance window failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get maintenance window' })
  }
})

router.post('/windows', authenticate, requireAnyRole(['super_admin', 'org_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId!
    const input = createWindowSchema.parse(req.body)
    const window = await maintenanceService.createMaintenanceWindow(organizationId, input)
    res.status(201).json({ window })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    logger.error(err, 'create maintenance window failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create maintenance window' })
  }
})

router.patch('/windows/:id', authenticate, requireAnyRole(['super_admin', 'org_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId!
    const input = updateWindowSchema.parse(req.body)
    const window = await maintenanceService.updateMaintenanceWindow(organizationId, req.params.id, input)
    res.status(200).json({ window })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    logger.error(err, 'update maintenance window failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update maintenance window' })
  }
})

router.delete('/windows/:id', authenticate, requireAnyRole(['super_admin', 'org_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId!
    await maintenanceService.deleteMaintenanceWindow(organizationId, req.params.id)
    res.status(204).send()
  } catch (err) {
    logger.error(err, 'delete maintenance window failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete maintenance window' })
  }
})

// Scheduled Jobs
router.get('/jobs', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId!
    const jobs = await maintenanceService.listScheduledJobs(organizationId)
    res.status(200).json({ jobs })
  } catch (err) {
    logger.error(err, 'list scheduled jobs failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list scheduled jobs' })
  }
})

router.get('/jobs/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId!
    const job = await maintenanceService.getScheduledJob(organizationId, req.params.id)
    if (!job) return res.status(404).json({ error: 'Scheduled job not found' })
    res.status(200).json({ job })
  } catch (err) {
    logger.error(err, 'get scheduled job failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get scheduled job' })
  }
})

const jobTypeSchema = z.enum(['metrics_cleanup', 'report_generation', 'data_retention', 'health_check', 'backup', 'custom'])

const createJobSchema = z.object({
  name: z.string().min(1),
  jobType: jobTypeSchema,
  cron: z.string().min(1),
  payload: z.record(z.unknown()).optional().default({}),
  isActive: z.boolean().optional().default(true),
})

router.post('/jobs', authenticate, requireAnyRole(['super_admin', 'org_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId!
    const input = createJobSchema.parse(req.body)
    const job = await maintenanceService.createScheduledJob(organizationId, input)
    res.status(201).json({ job })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    logger.error(err, 'create scheduled job failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create scheduled job' })
  }
})

router.patch('/jobs/:id', authenticate, requireAnyRole(['super_admin', 'org_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId!
    const job = await maintenanceService.updateScheduledJob(organizationId, req.params.id, req.body)
    res.status(200).json({ job })
  } catch (err) {
    logger.error(err, 'update scheduled job failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update scheduled job' })
  }
})

router.patch('/jobs/:id/toggle', authenticate, requireAnyRole(['super_admin', 'org_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId!
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body)
    const job = await maintenanceService.toggleScheduledJob(organizationId, req.params.id, isActive)
    res.status(200).json({ job })
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    logger.error(err, 'toggle scheduled job failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to toggle scheduled job' })
  }
})

router.delete('/jobs/:id', authenticate, requireAnyRole(['super_admin', 'org_admin']), async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId!
    await maintenanceService.deleteScheduledJob(organizationId, req.params.id)
    res.status(204).send()
  } catch (err) {
    logger.error(err, 'delete scheduled job failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete scheduled job' })
  }
})

export default router
