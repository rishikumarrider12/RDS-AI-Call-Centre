import { supabaseAdmin } from '../lib/supabase'
import type { FeatureFlag, FeatureFlagFilter } from '@rds/types'

function toFeatureFlag(row: any): FeatureFlag {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    environment: row.environment,
    organizationId: row.organization_id,
    rolloutPercentage: Number(row.rollout_percentage),
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class FeatureFlagRepository {
  async list(filters?: FeatureFlagFilter): Promise<FeatureFlag[]> {
    let query = supabaseAdmin
      .from('feature_flags')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.environment) {
      query = query.eq('environment', filters.environment)
    }
    if (filters?.status === 'enabled') {
      query = query.eq('enabled', true)
    } else if (filters?.status === 'disabled') {
      query = query.eq('enabled', false)
    }
    if (filters?.organizationId) {
      query = query.eq('organization_id', filters.organizationId)
    }
    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []).map(toFeatureFlag)
  }

  async getById(id: string): Promise<FeatureFlag | null> {
    const { data, error } = await supabaseAdmin
      .from('feature_flags')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data ? toFeatureFlag(data) : null
  }

  async create(input: {
    name: string
    description: string
    environment: string
    organizationId?: string | null
    rolloutPercentage?: number
    enabled?: boolean
  }): Promise<FeatureFlag> {
    const { data, error } = await supabaseAdmin
      .from('feature_flags')
      .insert({
        name: input.name,
        description: input.description,
        environment: input.environment,
        organization_id: input.organizationId ?? null,
        rollout_percentage: input.rolloutPercentage ?? 100,
        enabled: input.enabled ?? true,
      })
      .select()
      .single()
    if (error) throw error
    return toFeatureFlag(data)
  }

  async update(id: string, input: {
    name?: string
    description?: string
    environment?: string
    organizationId?: string | null
    rolloutPercentage?: number
    enabled?: boolean
  }): Promise<FeatureFlag> {
    const { data, error } = await supabaseAdmin
      .from('feature_flags')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return toFeatureFlag(data)
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('feature_flags')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}
