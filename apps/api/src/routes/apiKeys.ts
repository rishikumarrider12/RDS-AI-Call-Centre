import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { ApiKeyService } from '../services/apikey.service'
import { logger } from '../lib/logger'

const router = Router()
const apiKeyService = new ApiKeyService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) throw new Error('No organization associated with this account')
  return orgId
}

const createSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  scopes: z.array(z.string()).optional().default(['read', 'write']),
  expiresAt: z.string().optional().nullable(),
})

const rotateSchema = z.object({
  name: z.string().min(2).optional(),
  scopes: z.array(z.string()).optional(),
  expiresAt: z.string().optional().nullable(),
})

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const keys = await apiKeyService.listKeys(organizationId)
    res.status(200).json({ keys })
  } catch (err) {
    logger.error(err, 'list api keys failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list API keys' })
  }
})

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = createSchema.parse(req.body)
    const result = await apiKeyService.generateKey(organizationId, req.user!.id, input.name)
    res.status(201).json({ ...result, scopes: input.scopes, expiresAt: input.expiresAt })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'create api key failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create API key' })
  }
})

router.post('/:id/rotate', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = rotateSchema.parse(req.body)
    const result = await apiKeyService.rotateKey(organizationId, req.user!.id, req.params.id, {
      name: input.name,
      scopes: input.scopes,
      expiresAt: input.expiresAt,
    })
    res.status(200).json(result)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'rotate api key failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to rotate API key' })
  }
})

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await apiKeyService.revokeKey(organizationId, req.params.id)
    res.status(200).json({ message: 'API key revoked' })
  } catch (err) {
    logger.error(err, 'revoke api key failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to revoke API key' })
  }
})

export default router
