import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { IntegrationService } from '../services/integration.service'
import { resolveDbUserId } from '../lib/actors'
import { logger } from '../lib/logger'

const router = Router()
const integrationService = new IntegrationService()

function requireOrg(req: Request): string {
  const orgId = req.user?.organizationId
  if (!orgId) {
    throw new Error('No organization associated with this account')
  }
  return orgId
}

const createSchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
  name: z.string().optional(),
  config: z.record(z.unknown()).optional(),
  webhookUrl: z.string().url().nullable().optional(),
  status: z.enum(['active', 'inactive', 'error']).optional(),
})

const updateSchema = z.object({
  name: z.string().optional(),
  config: z.record(z.unknown()).optional(),
  webhookUrl: z.string().url().nullable().optional(),
  status: z.enum(['active', 'inactive', 'error']).optional(),
})

router.get('/providers', authenticate, async (_req: Request, res: Response) => {
  try {
    const providers = integrationService.listProviders()
    res.status(200).json({ providers })
  } catch (err) {
    logger.error(err, 'list providers failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list providers' })
  }
})

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const integrations = await integrationService.list(organizationId)
    res.status(200).json({ integrations })
  } catch (err) {
    logger.error(err, 'list integrations failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list integrations' })
  }
})

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = createSchema.parse(req.body)
    const createdById = await resolveDbUserId(req.user!.id)
    const integration = await integrationService.create(organizationId, createdById, {
      provider: input.provider,
      name: input.name,
      config: input.config,
      webhookUrl: input.webhookUrl ?? null,
      status: input.status,
    })
    logger.info({ organizationId, id: integration.id, provider: input.provider }, 'integration created')
    res.status(201).json({ integration })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'create integration failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create integration' })
  }
})

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const integration = await integrationService.getById(organizationId, req.params.id)
    res.status(200).json({ integration })
  } catch (err) {
    logger.error(err, 'get integration failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get integration' })
  }
})

router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    const input = updateSchema.parse(req.body)
    const integration = await integrationService.update(organizationId, req.params.id, {
      name: input.name,
      config: input.config,
      webhookUrl: input.webhookUrl ?? null,
      status: input.status,
    })
    logger.info({ organizationId, id: req.params.id }, 'integration updated')
    res.status(200).json({ integration })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'update integration failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update integration' })
  }
})

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = requireOrg(req)
    await integrationService.remove(organizationId, req.params.id)
    logger.info({ organizationId, id: req.params.id }, 'integration deleted')
    res.status(200).json({ message: 'Integration deleted' })
  } catch (err) {
    logger.error(err, 'delete integration failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete integration' })
  }
})

export default router
