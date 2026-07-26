import { supabaseAdmin } from '../lib/supabase'

export interface OAuthConnectionRow {
  id: string
  organization_id: string
  user_id: string | null
  provider: string
  provider_user_id: string
  access_token: string | null
  refresh_token: string | null
  expires_at: string | null
  scope: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export class OAuthRepository {
  async list(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('oauth_connections')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as OAuthConnectionRow[]
  }

  async findById(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('oauth_connections')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data as OAuthConnectionRow | null
  }

  async findByProvider(organizationId: string, provider: string) {
    const { data, error } = await supabaseAdmin
      .from('oauth_connections')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('provider', provider)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as OAuthConnectionRow[]
  }

  async create(organizationId: string, input: {
    userId?: string | null
    provider: string
    providerUserId: string
    accessToken?: string | null
    refreshToken?: string | null
    expiresAt?: string | null
    scope?: string | null
    metadata?: Record<string, unknown>
  }) {
    const { data, error } = await supabaseAdmin
      .from('oauth_connections')
      .insert({
        organization_id: organizationId,
        user_id: input.userId ?? null,
        provider: input.provider,
        provider_user_id: input.providerUserId,
        access_token: input.accessToken ?? null,
        refresh_token: input.refreshToken ?? null,
        expires_at: input.expiresAt ?? null,
        scope: input.scope ?? null,
        metadata: input.metadata ?? {},
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(id: string, input: {
    accessToken?: string | null
    refreshToken?: string | null
    expiresAt?: string | null
    scope?: string | null
    metadata?: Record<string, unknown>
  }) {
    const payload: Record<string, unknown> = {}
    if (input.accessToken !== undefined) payload.access_token = input.accessToken
    if (input.refreshToken !== undefined) payload.refresh_token = input.refreshToken
    if (input.expiresAt !== undefined) payload.expires_at = input.expiresAt
    if (input.scope !== undefined) payload.scope = input.scope
    if (input.metadata !== undefined) payload.metadata = input.metadata

    const { data, error } = await supabaseAdmin
      .from('oauth_connections')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async softDelete(id: string) {
    const { error } = await supabaseAdmin
      .from('oauth_connections')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }
}
