import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth'
import { RegionService } from '../services/region.service'
import { logger } from '../lib/logger'

const router = Router()
const regionService = new RegionService()

const regionSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1),
  location: z.string().min(1),
  provider: z.string().min(1),
  status: z.string().default('active'),
  isPrimary: z.boolean().default(false),
})

const organizationRegionSchema = z.object({
  primaryRegionId: z.string().uuid(),
  secondaryRegionId: z.string().uuid().nullable().optional(),
  failoverEnabled: z.boolean().default(false),
})

// List all regions
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const regions = await regionService.listRegions()
    res.status(200).json({ regions })
  } catch (err) {
    logger.error(err, 'list regions failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load regions' })
  }
})

// Get single region
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const region = await regionService.getRegion(req.params.id)
    if (!region) {
      return res.status(404).json({ error: 'Region not found' })
    }
    res.status(200).json({ region })
  } catch (err) {
    logger.error(err, 'get region failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load region' })
  }
})

// Create region
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const input = regionSchema.parse(req.body)
    const region = await regionService.createRegion(input)
    res.status(201).json({ region })
  } catch (err) {
    logger.error(err, 'create region failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create region' })
  }
})

// Update region
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const input = regionSchema.parse(req.body)
    const region = await regionService.updateRegion(req.params.id, input)
    res.status(200).json({ region })
  } catch (err) {
    logger.error(err, 'update region failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update region' })
  }
})

// Delete region
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    await regionService.deleteRegion(req.params.id)
    res.status(204).send()
  } catch (err) {
    logger.error(err, 'delete region failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete region' })
  }
})

// List all organization region mappings
router.get('/organizations', authenticate, async (req: Request, res: Response) => {
  try {
    const mappings = await regionService.listOrganizationRegions()
    res.status(200).json({ mappings })
  } catch (err) {
    logger.error(err, 'list organization regions failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load organization regions' })
  }
})

// Update organization region mapping
router.put('/organizations/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const organizationId = req.params.id
    const input = organizationRegionSchema.parse(req.body)
    const mapping = await regionService.upsertOrganizationRegion({
      organizationId,
      ...input,
    })
    res.status(200).json({ mapping })
  } catch (err) {
    logger.error(err, 'update organization region failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update organization region' })
  }
})

// Health check for a region
router.get('/health/:regionCode?', authenticate, async (req: Request, res: Response) => {
  try {
    const regionCode = req.params.regionCode || 'us-east-1'
    const health = await regionService.getRegionHealth(regionCode)
    res.status(200).json({ health })
  } catch (err) {
    logger.error(err, 'get region health failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to load region health' })
  }
})

export default router
