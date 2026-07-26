import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { ApiKeyService } from '../services/apikey.service'
import { logger } from '../lib/logger'

const router = Router()
const apiKeyService = new ApiKeyService()

const createSchema = z.object({
  name: z.string().min(2, 'Name is required'),
})

function requireOrgAccess(req: Request, organizationId: string): boolean {
  if (!req.user) return false
  if (req.user.roles.includes('super_admin')) return true
  return req.user.organizationId === organizationId
}

// List API keys
router.get('/:id/api-keys', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.params.id
    if (!requireOrgAccess(req, organizationId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const keys = await apiKeyService.listKeys(organizationId)
    res.status(200).json({ keys })
  } catch (err) {
    logger.error(err, 'list api keys failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list API keys' })
  }
})

// Generate API key (plaintext returned once)
router.post('/:id/api-keys', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.params.id
    if (!requireOrgAccess(req, organizationId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const input = createSchema.parse(req.body)
    const result = await apiKeyService.generateKey(organizationId, req.user!.id, input.name)
    logger.info({ organizationId }, 'api key created')
    res.status(201).json(result)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'create api key failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create API key' })
  }
})

// Revoke API key
router.delete('/:id/api-keys/:keyId', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.params.id
    if (!requireOrgAccess(req, organizationId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    await apiKeyService.revokeKey(organizationId, req.params.keyId)
    logger.info({ organizationId, keyId: req.params.keyId }, 'api key revoked')
    res.status(200).json({ message: 'API key revoked successfully' })
  } catch (err) {
    logger.error(err, 'revoke api key failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to revoke API key' })
  }
})

export default router
