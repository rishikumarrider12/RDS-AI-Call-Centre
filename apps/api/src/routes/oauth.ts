import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { OAuthService } from '../services/oauth.service'
import { logger } from '../lib/logger'

const router = Router()
const oauthService = new OAuthService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) throw new Error('No organization associated with this account')
  return orgId
}

const connectSchema = z.object({
  provider: z.string().min(1),
  providerUserId: z.string().min(1),
  accessToken: z.string().optional().nullable(),
  refreshToken: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  scope: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional().default({}),
})

const updateSchema = z.object({
  accessToken: z.string().optional().nullable(),
  refreshToken: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  scope: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
})

router.get('/providers', authenticate, async (_req: Request, res: Response) => {
  res.status(200).json({
    providers: [
      { key: 'google', name: 'Google', scopes: ['openid', 'email', 'profile'] },
      { key: 'microsoft', name: 'Microsoft', scopes: ['openid', 'email', 'profile'] },
      { key: 'github', name: 'GitHub', scopes: ['read:user', 'user:email'] },
    ],
  })
})

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const connections = await oauthService.list(organizationId)
    res.status(200).json({ connections })
  } catch (err) {
    logger.error(err, 'list oauth connections failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list OAuth connections' })
  }
})

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const connection = await oauthService.getById(organizationId, req.params.id)
    res.status(200).json({ connection })
  } catch (err) {
    logger.error(err, 'get oauth connection failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get OAuth connection' })
  }
})

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = connectSchema.parse(req.body)
    const connection = await oauthService.connect(organizationId, req.user!.id, input)
    logger.info({ organizationId, provider: input.provider }, 'oauth connected')
    res.status(201).json({ connection })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'connect oauth failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to connect OAuth' })
  }
})

router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = updateSchema.parse(req.body)
    const connection = await oauthService.update(organizationId, req.user!.id, req.params.id, input)
    logger.info({ organizationId, id: req.params.id }, 'oauth updated')
    res.status(200).json({ connection })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'update oauth failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update OAuth connection' })
  }
})

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await oauthService.disconnect(organizationId, req.user!.id, req.params.id)
    logger.info({ organizationId, id: req.params.id }, 'oauth disconnected')
    res.status(200).json({ message: 'OAuth connection removed' })
  } catch (err) {
    logger.error(err, 'disconnect oauth failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to remove OAuth connection' })
  }
})

export default router
