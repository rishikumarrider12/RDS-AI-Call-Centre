import { OrganizationService } from './organization.service'
import { UserRepository } from '../repositories/user.repository'
import { supabaseAdmin } from '../lib/supabase'
import { logger } from '../lib/logger'

export interface OnboardOrganizationInput {
  name: string
  slug: string
  plan?: 'starter' | 'growth' | 'enterprise'
  timezone?: string
  locale?: string
  description?: string
  branding?: Record<string, unknown>
}

export class OnboardingService {
  private organizationService = new OrganizationService()
  private userRepository = new UserRepository()

  async onboardOrganization(input: OnboardOrganizationInput, ownerAuthUserId: string) {
    const result = await this.organizationService.createOrganization({
      name: input.name,
      slug: input.slug,
      plan: input.plan,
      timezone: input.timezone,
      locale: input.locale,
      branding: input.branding,
      metadata: input.description ? { description: input.description } : undefined,
    })

    const ownerDb = await this.userRepository.findByAuthUserId(ownerAuthUserId)
    if (ownerDb) {
      await this.userRepository.updateUserOrganization(ownerAuthUserId, result.organization.id)

      const roleRow = await this.userRepository.ensureRole(result.organization.id, 'org_admin')
      await this.userRepository.clearRoles(ownerDb.id, result.organization.id)
      await this.userRepository.assignRole(ownerDb.id, result.organization.id, roleRow.id, ownerDb.id)

      try {
        await supabaseAdmin.auth.admin.updateUserById(ownerAuthUserId, {
          user_metadata: { roles: ['org_admin'] },
        })
      } catch (err) {
        logger.warn({ error: err instanceof Error ? err.message : 'unknown' }, 'failed to sync owner role metadata')
      }
    }

    return result
  }
}
