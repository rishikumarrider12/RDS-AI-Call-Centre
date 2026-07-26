import { supabaseAdmin } from '../lib/supabase'

export interface ProviderCredentialRow {
  id: string
  organizationId: string
  providerKey: string
  credentials: Record<string, unknown>
  isActive: boolean
  lastVerifiedAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export class ProviderCredentialRepository {
  async findByOrgAndProvider(organizationId: string, providerKey: string) {
    const { data, error } = await supabaseAdmin
      .from('provider_credentials')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('provider_key', providerKey)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    return data ? this.mapRow(data) : null
  }

  async listByOrg(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('provider_credentials')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map(this.mapRow)
  }

  async upsert(organizationId: string, providerKey: string, credentials: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin
      .from('provider_credentials')
      .upsert({
        organization_id: organizationId,
        provider_key: providerKey,
        credentials,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id,provider_key',
      })
      .select()
      .single()

    if (error) throw error
    return this.mapRow(data)
  }

  async updateLastVerified(id: string) {
    const { data, error } = await supabaseAdmin
      .from('provider_credentials')
      .update({ last_verified_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async softDelete(id: string) {
    const { error } = await supabaseAdmin
      .from('provider_credentials')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  }

  private mapRow(row: any): ProviderCredentialRow {
    return {
      id: row.id,
      organizationId: row.organization_id,
      providerKey: row.provider_key,
      credentials: row.credentials ?? {},
      isActive: row.is_active,
      lastVerifiedAt: row.last_verified_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    }
  }
}
