import { OrganizationRepository } from '../repositories/organization.repository'
import { Organization, OrganizationSettings } from '@rds/types'

export class OrganizationService {
  private repository = new OrganizationRepository()

  private mapDbOrgToType(dbOrg: any): Organization & { status: string; branding: any; ownerId: string | null; timezone: string; locale: string; metadata: any } {
    return {
      id: dbOrg.id,
      name: dbOrg.name,
      slug: dbOrg.slug,
      plan: dbOrg.plan,
      status: dbOrg.status,
      branding: dbOrg.branding,
      ownerId: dbOrg.owner_id,
      timezone: dbOrg.timezone,
      locale: dbOrg.locale,
      metadata: dbOrg.metadata,
      createdAt: dbOrg.created_at,
      updatedAt: dbOrg.updated_at,
    }
  }

  private mapDbSettingsToType(dbSettings: any): OrganizationSettings {
    return {
      id: dbSettings.id,
      organizationId: dbSettings.organization_id,
      maxConcurrentCalls: dbSettings.max_concurrent_calls,
      maxAgents: dbSettings.max_agents,
      callRecordingEnabled: dbSettings.call_recording_enabled,
      aiTtsVoiceId: dbSettings.ai_tts_voice_id,
      aiSttProvider: dbSettings.ai_stt_provider,
      defaultCallerId: dbSettings.default_caller_id,
      aiGreeting: dbSettings.ai_greeting,
      aiFallbackMessage: dbSettings.ai_fallback_message,
      complianceDndCheck: dbSettings.compliance_dnd_check,
      complianceConsentRequired: dbSettings.compliance_consent_required,
      createdAt: dbSettings.created_at,
      updatedAt: dbSettings.updated_at,
    }
  }

  async createOrganization(input: {
    name: string
    slug: string
    plan?: 'starter' | 'growth' | 'enterprise'
    timezone?: string
    locale?: string
    branding?: Record<string, unknown>
    metadata?: Record<string, unknown>
  }) {
    // Check if slug is unique
    const existing = await this.repository.findBySlug(input.slug)
    if (existing) {
      throw new Error('Organization slug is already in use')
    }

    const { org, settings } = await this.repository.create({
      name: input.name,
      slug: input.slug,
      plan: input.plan,
      timezone: input.timezone,
      locale: input.locale,
    })

    return {
      organization: this.mapDbOrgToType(org),
      settings: this.mapDbSettingsToType(settings),
    }
  }

  async getOrganizationById(id: string) {
    const org = await this.repository.findById(id)
    if (!org) {
      throw new Error('Organization not found')
    }
    return this.mapDbOrgToType(org)
  }

  async getOrganizationBySlug(slug: string) {
    const org = await this.repository.findBySlug(slug)
    if (!org) {
      throw new Error('Organization not found')
    }
    return this.mapDbOrgToType(org)
  }

  async updateOrganization(
    id: string,
    input: {
      name?: string
      slug?: string
      plan?: 'starter' | 'growth' | 'enterprise'
      status?: 'active' | 'suspended' | 'trial'
      timezone?: string
      locale?: string
      branding?: Record<string, unknown>
      metadata?: Record<string, unknown>
    }
  ) {
    // If updating slug, check uniqueness
    if (input.slug) {
      const existing = await this.repository.findBySlug(input.slug)
      if (existing && existing.id !== id) {
        throw new Error('Organization slug is already in use')
      }
    }

    const org = await this.repository.update(id, {
      name: input.name,
      slug: input.slug,
      plan: input.plan,
      status: input.status,
      timezone: input.timezone,
      locale: input.locale,
      branding: input.branding,
      metadata: input.metadata,
    })

    return this.mapDbOrgToType(org)
  }

  async softDeleteOrganization(id: string) {
    const org = await this.repository.findById(id)
    if (!org) {
      throw new Error('Organization not found')
    }
    await this.repository.softDelete(id)
  }

  async getAllOrganizations() {
    const orgs = await this.repository.findAll()
    return orgs.map(org => this.mapDbOrgToType(org))
  }

  async getSettings(organizationId: string) {
    const settings = await this.repository.getSettings(organizationId)
    if (!settings) {
      throw new Error('Organization settings not found')
    }
    return this.mapDbSettingsToType(settings)
  }

  async updateSettings(
    organizationId: string,
    input: {
      max_concurrent_calls?: number
      max_agents?: number
      call_recording_enabled?: boolean
      ai_tts_voice_id?: string | null
      ai_stt_provider?: string | null
      default_caller_id?: string | null
      ai_greeting?: string | null
      ai_fallback_message?: string | null
      compliance_dnd_check?: boolean
      compliance_consent_required?: boolean
    }
  ) {
    const settings = await this.repository.updateSettings(organizationId, input)
    return this.mapDbSettingsToType(settings)
  }

  async updateLogo(id: string, logoUrl: string) {
    const org = await this.repository.findById(id)
    if (!org) {
      throw new Error('Organization not found')
    }

    const currentBranding = org.branding || {}
    const updatedBranding = {
      ...currentBranding,
      logoUrl,
    }

    const updatedOrg = await this.repository.update(id, {
      branding: updatedBranding,
    })

    return this.mapDbOrgToType(updatedOrg)
  }
}
