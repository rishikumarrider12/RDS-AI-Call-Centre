import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticate, requireRole } from '../middleware/auth'
import { OrganizationService } from '../services/organization.service'
import { OnboardingService } from '../services/onboarding.service'
import { logger } from '../lib/logger'

const router = Router()
const organizationService = new OrganizationService()
const onboardingService = new OnboardingService()

// Validation Schemas
const createOrgSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric and hyphens'),
  plan: z.enum(['starter', 'growth', 'enterprise']).optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
})

const updateOrgSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
  plan: z.enum(['starter', 'growth', 'enterprise']).optional(),
  status: z.enum(['active', 'suspended', 'trial']).optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  branding: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
})

const updateSettingsSchema = z.object({
  max_concurrent_calls: z.number().int().nonnegative().optional(),
  max_agents: z.number().int().nonnegative().optional(),
  call_recording_enabled: z.boolean().optional(),
  ai_tts_voice_id: z.string().nullable().optional(),
  ai_stt_provider: z.string().nullable().optional(),
  default_caller_id: z.string().nullable().optional(),
  ai_greeting: z.string().nullable().optional(),
  ai_fallback_message: z.string().nullable().optional(),
  compliance_dnd_check: z.boolean().optional(),
  compliance_consent_required: z.boolean().optional(),
})

const logoUploadSchema = z.object({
  logo: z.string().min(1, 'Logo data is required'),
})

const onboardingSchema = createOrgSchema.extend({
  description: z.string().optional(),
})

// 0. Onboarding: create organization for the authenticated user (self-service)
router.post('/onboard', authenticate, async (req: Request, res: Response) => {
  try {
    const input = onboardingSchema.parse(req.body)
    const result = await onboardingService.onboardOrganization(
      {
        name: input.name,
        slug: input.slug,
        plan: input.plan,
        timezone: input.timezone,
        locale: input.locale,
        description: input.description,
      },
      req.user!.id
    )
    logger.info({ slug: input.slug }, 'organization onboarded')
    res.status(201).json(result)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'onboarding failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Onboarding failed' })
  }
})

// 1. Create Organization - Super Admin only
router.post('/', authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const input = createOrgSchema.parse(req.body)
    const result = await organizationService.createOrganization(input)
    logger.info({ slug: input.slug }, 'organization created')
    res.status(201).json(result)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'create organization failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create organization' })
  }
})

// 2. List all organizations - Super Admin only
router.get('/', authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const orgs = await organizationService.getAllOrganizations()
    res.status(200).json(orgs)
  } catch (err) {
    logger.error(err, 'list organizations failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to list organizations' })
  }
})

// 3. Get organization by ID - Super Admin or Org Admin of this org
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    // Verify permission
    if (!req.user?.roles.includes('super_admin') && req.user?.organizationId !== id) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const org = await organizationService.getOrganizationById(id)
    res.status(200).json(org)
  } catch (err) {
    logger.error(err, 'get organization failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get organization' })
  }
})

// 4. Update organization - Super Admin or Org Admin of this org
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    if (!req.user?.roles.includes('super_admin') && req.user?.organizationId !== id) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const input = updateOrgSchema.parse(req.body)
    const org = await organizationService.updateOrganization(id, input)
    logger.info({ id }, 'organization updated')
    res.status(200).json(org)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'update organization failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update organization' })
  }
})

// 5. Soft Delete Organization - Super Admin only
router.delete('/:id', authenticate, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await organizationService.softDeleteOrganization(id)
    logger.info({ id }, 'organization soft deleted')
    res.status(200).json({ message: 'Organization soft deleted successfully' })
  } catch (err) {
    logger.error(err, 'delete organization failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete organization' })
  }
})

// 6. Get settings - Super Admin or matching member
router.get('/:id/settings', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    if (!req.user?.roles.includes('super_admin') && req.user?.organizationId !== id) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const settings = await organizationService.getSettings(id)
    res.status(200).json(settings)
  } catch (err) {
    logger.error(err, 'get settings failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to get settings' })
  }
})

// 7. Update settings - Super Admin or Org Admin of this org
router.put('/:id/settings', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    if (!req.user?.roles.includes('super_admin') && req.user?.organizationId !== id) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const input = updateSettingsSchema.parse(req.body)
    const settings = await organizationService.updateSettings(id, input)
    logger.info({ id }, 'organization settings updated')
    res.status(200).json(settings)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'update settings failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update settings' })
  }
})

// 8. Upload logo - Super Admin or Org Admin of this org
router.post('/:id/logo', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    if (!req.user?.roles.includes('super_admin') && req.user?.organizationId !== id) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const { logo } = logoUploadSchema.parse(req.body)
    const org = await organizationService.updateLogo(id, logo)
    logger.info({ id }, 'organization logo updated')
    res.status(200).json(org)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors })
    }
    logger.error(err, 'logo upload failed')
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to upload logo' })
  }
})

export default router
