import { supabaseAdmin } from '../lib/supabase'

export interface CreateOrgDbInput {
  name: string
  slug: string
  plan?: 'starter' | 'growth' | 'enterprise'
  timezone?: string
  locale?: string
  branding?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface UpdateOrgDbInput {
  name?: string
  slug?: string
  plan?: 'starter' | 'growth' | 'enterprise'
  status?: 'active' | 'suspended' | 'trial'
  timezone?: string
  locale?: string
  branding?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface UpdateSettingsDbInput {
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

export class OrganizationRepository {
  async create(org: CreateOrgDbInput, defaultSettings: UpdateSettingsDbInput = {}) {
    // 1. Insert organization
    const { data: dbOrg, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: org.name,
        slug: org.slug,
        plan: org.plan || 'starter',
        timezone: org.timezone || 'UTC',
        locale: org.locale || 'en-US',
        branding: org.branding || {},
        metadata: org.metadata || {},
      })
      .select()
      .single()

    if (orgError) throw orgError

    // 2. Create corresponding default organization_settings
    const { data: dbSettings, error: settingsError } = await supabaseAdmin
      .from('organization_settings')
      .insert({
        organization_id: dbOrg.id,
        max_concurrent_calls: defaultSettings.max_concurrent_calls ?? 10,
        max_agents: defaultSettings.max_agents ?? 5,
        call_recording_enabled: defaultSettings.call_recording_enabled ?? true,
        ai_tts_voice_id: defaultSettings.ai_tts_voice_id ?? null,
        ai_stt_provider: defaultSettings.ai_stt_provider ?? null,
        default_caller_id: defaultSettings.default_caller_id ?? null,
        ai_greeting: defaultSettings.ai_greeting ?? null,
        ai_fallback_message: defaultSettings.ai_fallback_message ?? null,
        compliance_dnd_check: defaultSettings.compliance_dnd_check ?? true,
        compliance_consent_required: defaultSettings.compliance_consent_required ?? true,
      })
      .select()
      .single()

    if (settingsError) {
      // Rollback org creation on settings failure (since they are tightly coupled)
      await supabaseAdmin.from('organizations').delete().eq('id', dbOrg.id)
      throw settingsError
    }

    return { org: dbOrg, settings: dbSettings }
  }

  async findById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async findBySlug(slug: string) {
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async update(id: string, org: UpdateOrgDbInput) {
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .update(org)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async softDelete(id: string) {
    const now = new Date().toISOString()
    const { error: orgError } = await supabaseAdmin
      .from('organizations')
      .update({ deleted_at: now })
      .eq('id', id)

    if (orgError) throw orgError

    // Soft delete settings, profile etc for safety if desired, but organizations is primary
    await supabaseAdmin
      .from('organization_settings')
      .update({ deleted_at: now })
      .eq('organization_id', id)
  }

  async findAll() {
    const { data, error } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getSettings(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('organization_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async updateSettings(organizationId: string, settings: UpdateSettingsDbInput) {
    const { data, error } = await supabaseAdmin
      .from('organization_settings')
      .update(settings)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}
