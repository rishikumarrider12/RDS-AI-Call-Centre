import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { BackupService } from '../services/backup.service'
import { logger } from '../lib/logger'

const router = Router()
const backupService = new BackupService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) throw new Error('No organization associated with this account')
  return orgId
}

const backupTypeSchema = z.object({
  type: z.enum(['full', 'schema', 'data', 'incremental']),
})

// List backups (paginated)
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 25
    const result = await backupService.listBackups(organizationId, page, pageSize)
    res.status(200).json(result)
  } catch (err) {
    logger.error(err, 'list backups failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list backups' })
  }
})

// Create (trigger) a backup
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = backupTypeSchema.parse(req.body)
    const backup = await backupService.createBackup(organizationId, input.type)
    res.status(201).json({ backup })
  } catch (err) {
    logger.error(err, 'create backup failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create backup' })
  }
})

// Get a single backup
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const backup = await backupService.getBackup(organizationId, req.params.id)
    if (!backup) {
      res.status(404).json({ error: 'Backup not found' })
      return
    }
    res.status(200).json({ backup })
  } catch (err) {
    logger.error(err, 'get backup failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get backup' })
  }
})

// Start restore from a backup
router.post('/:id/restore', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const backup = await backupService.startRestore(organizationId, req.params.id)
    res.status(200).json({ backup })
  } catch (err) {
    logger.error(err, 'restore backup failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to restore backup' })
  }
})

// Complete a backup (used by background worker / runbook)
router.post('/:id/complete', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const schema = z.object({ sizeBytes: z.number().nonnegative(), path: z.string() })
    const { sizeBytes, path } = schema.parse(req.body)
    const backup = await backupService.completeBackup(organizationId, req.params.id, sizeBytes, path)
    res.status(200).json({ backup })
  } catch (err) {
    logger.error(err, 'complete backup failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to complete backup' })
  }
})

// Fail a backup
router.post('/:id/fail', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const schema = z.object({ error: z.string() })
    const { error } = schema.parse(req.body)
    const backup = await backupService.failBackup(organizationId, req.params.id, error)
    res.status(200).json({ backup })
  } catch (err) {
    logger.error(err, 'fail backup failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to fail backup' })
  }
})

// Delete a backup
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await backupService.deleteBackup(organizationId, req.params.id)
    res.status(204).send()
  } catch (err) {
    logger.error(err, 'delete backup failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete backup' })
  }
})

export default router
