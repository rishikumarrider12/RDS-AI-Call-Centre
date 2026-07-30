import { supabaseAdmin } from '../lib/supabase'

export type DisasterRecoveryStrategy = 'backup_restore' | 'multi_region' | 'active_passive' | 'active_active'
export type DisasterRecoveryDrillStatus = 'success' | 'failed' | 'partial'

export interface DisasterRecoveryConfig {
  id: string
  organizationId: string
  name: string
  description: string | null
  strategy: DisasterRecoveryStrategy
  rpoMinutes: number
  rtoMinutes: number
  backupScheduleCron: string | null
  primaryRegionId: string | null
  secondaryRegionId: string | null
  isActive: boolean
  lastDrillAt: string | null
  lastDrillStatus: DisasterRecoveryDrillStatus | null
  createdAt: string
  updatedAt: string
}

function toConfig(row: any): DisasterRecoveryConfig {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description,
    strategy: row.strategy,
    rpoMinutes: row.rpo_minutes,
    rtoMinutes: row.rto_minutes,
    backupScheduleCron: row.backup_schedule_cron,
    primaryRegionId: row.primary_region_id,
    secondaryRegionId: row.secondary_region_id,
    isActive: row.is_active,
    lastDrillAt: row.last_drill_at,
    lastDrillStatus: row.last_drill_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class DisasterRecoveryRepository {
  async list(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('disaster_recovery_configs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map(toConfig)
  }

  async get(organizationId: string, id: string): Promise<DisasterRecoveryConfig | null> {
    const { data, error } = await supabaseAdmin
      .from('disaster_recovery_configs')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    return data ? toConfig(data) : null
  }

  async create(input: {
    organizationId: string
    name: string
    description?: string | null
    strategy: DisasterRecoveryStrategy
    rpoMinutes?: number
    rtoMinutes?: number
    backupScheduleCron?: string | null
    primaryRegionId?: string | null
    secondaryRegionId?: string | null
    isActive?: boolean
  }): Promise<DisasterRecoveryConfig> {
    const { data, error } = await supabaseAdmin
      .from('disaster_recovery_configs')
      .insert({
        organization_id: input.organizationId,
        name: input.name,
        description: input.description || null,
        strategy: input.strategy,
        rpo_minutes: input.rpoMinutes ?? 60,
        rto_minutes: input.rtoMinutes ?? 120,
        backup_schedule_cron: input.backupScheduleCron || null,
        primary_region_id: input.primaryRegionId || null,
        secondary_region_id: input.secondaryRegionId || null,
        is_active: input.isActive ?? true,
      })
      .select()
      .single()

    if (error) throw error
    return toConfig(data)
  }

  async update(organizationId: string, id: string, patch: Partial<DisasterRecoveryConfig>): Promise<DisasterRecoveryConfig> {
    const payload: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() }
    if (payload.strategy) payload.strategy = patch.strategy
    if (payload.rpoMinutes !== undefined) payload.rpo_minutes = patch.rpoMinutes
    if (payload.rtoMinutes !== undefined) payload.rto_minutes = patch.rtoMinutes
    if (payload.backupScheduleCron !== undefined) payload.backup_schedule_cron = patch.backupScheduleCron
    if (payload.primaryRegionId !== undefined) payload.primary_region_id = patch.primaryRegionId
    if (payload.secondaryRegionId !== undefined) payload.secondary_region_id = patch.secondaryRegionId
    if (payload.isActive !== undefined) payload.is_active = patch.isActive
    if (payload.lastDrillAt !== undefined) payload.last_drill_at = patch.lastDrillAt
    if (payload.lastDrillStatus !== undefined) payload.last_drill_status = patch.lastDrillStatus
    if (payload.description !== undefined) payload.description = patch.description

    const { data, error } = await supabaseAdmin
      .from('disaster_recovery_configs')
      .update(payload)
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return toConfig(data)
  }

  async delete(organizationId: string, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('disaster_recovery_configs')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', id)

    if (error) throw error
  }
}
