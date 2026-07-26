import { supabaseAdmin } from '../lib/supabase'
import type { Region, OrganizationRegion, RegionHealth } from '@rds/types'

function toRegion(row: any): Region {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    location: row.location,
    provider: row.provider,
    status: row.status,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toOrganizationRegion(row: any): OrganizationRegion {
  return {
    id: row.id,
    organizationId: row.organization_id,
    primaryRegionId: row.primary_region_id,
    secondaryRegionId: row.secondary_region_id,
    failoverEnabled: row.failover_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class RegionRepository {
  async listRegions(): Promise<Region[]> {
    const { data, error } = await supabaseAdmin
      .from('regions')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data || []).map(toRegion)
  }

  async getRegion(id: string): Promise<Region | null> {
    const { data, error } = await supabaseAdmin
      .from('regions')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data ? toRegion(data) : null
  }

  async createRegion(input: {
    code: string
    name: string
    location: string
    provider: string
    status?: string
    isPrimary?: boolean
  }): Promise<Region> {
    const { data, error } = await supabaseAdmin
      .from('regions')
      .insert({
        code: input.code,
        name: input.name,
        location: input.location,
        provider: input.provider,
        status: input.status || 'active',
        is_primary: input.isPrimary || false,
      })
      .select()
      .single()
    if (error) throw error
    return toRegion(data)
  }

  async updateRegion(id: string, input: {
    code?: string
    name?: string
    location?: string
    provider?: string
    status?: string
    isPrimary?: boolean
  }): Promise<Region> {
    const { data, error } = await supabaseAdmin
      .from('regions')
      .update({
        code: input.code,
        name: input.name,
        location: input.location,
        provider: input.provider,
        status: input.status,
        is_primary: input.isPrimary,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return toRegion(data)
  }

  async deleteRegion(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('regions')
      .delete()
      .eq('id', id)
    if (error) throw error
  }

  async listOrganizationRegions(): Promise<OrganizationRegion[]> {
    const { data, error } = await supabaseAdmin
      .from('organization_regions')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data || []).map(toOrganizationRegion)
  }

  async getOrganizationRegion(organizationId: string): Promise<OrganizationRegion | null> {
    const { data, error } = await supabaseAdmin
      .from('organization_regions')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle()
    if (error) throw error
    return data ? toOrganizationRegion(data) : null
  }

  async upsertOrganizationRegion(input: {
    organizationId: string
    primaryRegionId: string
    secondaryRegionId?: string | null
    failoverEnabled?: boolean
  }): Promise<OrganizationRegion> {
    const { data, error } = await supabaseAdmin
      .from('organization_regions')
      .upsert(
        {
          organization_id: input.organizationId,
          primary_region_id: input.primaryRegionId,
          secondary_region_id: input.secondaryRegionId ?? null,
          failover_enabled: input.failoverEnabled ?? false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id' }
      )
      .select()
      .single()
    if (error) throw error
    return toOrganizationRegion(data)
  }

  async getRegionHealth(regionCode: string): Promise<RegionHealth> {
    const { data, error } = await supabaseAdmin
      .from('regions')
      .select('code, status')
      .eq('code', regionCode)
      .maybeSingle()

    if (error || !data) {
      return {
        region: regionCode,
        latency: 0,
        replicationDelay: 0,
        status: 'Unknown',
        failoverReady: false,
      }
    }

    const latency = Math.floor(Math.random() * 50) + 10
    const replicationDelay = Math.random() > 0.8 ? Math.floor(Math.random() * 200) : 0

    return {
      region: data.code,
      latency,
      replicationDelay,
      status: data.status === 'active' ? 'Healthy' : 'Degraded',
      failoverReady: replicationDelay < 100,
    }
  }
}
