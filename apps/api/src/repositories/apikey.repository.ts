import { supabaseAdmin } from '../lib/supabase'

export interface CreateApiKeyInput {
  organizationId: string
  userId: string
  name: string
  keyPrefix: string
  keyHash: string
  scopes?: string[]
  expiresAt?: string | null
}

export class ApiKeyRepository {
  private mapDbKey(dbKey: any) {
    return {
      id: dbKey.id,
      organizationId: dbKey.organization_id,
      userId: dbKey.user_id,
      name: dbKey.name,
      keyPrefix: dbKey.key_prefix,
      keyHash: dbKey.key_hash,
      scopes: dbKey.scopes || [],
      status: dbKey.deleted_at ? 'revoked' : 'active',
      lastUsedAt: dbKey.last_used_at,
      expiresAt: dbKey.expires_at,
      createdAt: dbKey.created_at,
    }
  }

  async list(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map((k: any) => this.mapDbKey(k))
  }

  async create(input: CreateApiKeyInput) {
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .insert({
        organization_id: input.organizationId,
        user_id: input.userId,
        name: input.name,
        key_prefix: input.keyPrefix,
        key_hash: input.keyHash,
        scopes: input.scopes || ['read', 'write'],
        expires_at: input.expiresAt ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return this.mapDbKey(data)
  }

  async findById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data ? this.mapDbKey(data) : null
  }

  async revoke(id: string) {
    const now = new Date().toISOString()
    const { error } = await supabaseAdmin
      .from('api_keys')
      .update({ deleted_at: now })
      .eq('id', id)
    if (error) throw error
  }
}
