import { supabaseAdmin } from '../lib/supabase'

export interface MaintenanceWindow {
  id: string
  organizationId: string
  title: string
  description: string | null
  startsAt: string
  endsAt: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

function toWindow(row: any): MaintenanceWindow {
  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class MaintenanceRepository {
  async list(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('maintenance_windows')
      .select('*')
      .eq('organization_id', organizationId)
      .order('starts_at', { ascending: false })

    if (error) throw error
    return (data || []).map(toWindow)
  }

  async get(organizationId: string, id: string): Promise<MaintenanceWindow | null> {
    const { data, error } = await supabaseAdmin
      .from('maintenance_windows')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    return data ? toWindow(data) : null
  }

  async create(input: {
    organizationId: string
    title: string
    description?: string | null
    startsAt: string
    endsAt: string
    isActive?: boolean
  }): Promise<MaintenanceWindow> {
    const { data, error } = await supabaseAdmin
      .from('maintenance_windows')
      .insert({
        organization_id: input.organizationId,
        title: input.title,
        description: input.description || null,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        is_active: input.isActive ?? true,
      })
      .select()
      .single()

    if (error) throw error
    return toWindow(data)
  }

  async update(organizationId: string, id: string, patch: Partial<MaintenanceWindow>): Promise<MaintenanceWindow> {
    const payload: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() }
    if (payload.title) payload.title = patch.title
    if (payload.description !== undefined) payload.description = patch.description
    if (payload.startsAt) payload.starts_at = patch.startsAt
    if (payload.endsAt) payload.ends_at = patch.endsAt
    if (payload.isActive !== undefined) payload.is_active = patch.isActive

    const { data, error } = await supabaseAdmin
      .from('maintenance_windows')
      .update(payload)
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return toWindow(data)
  }

  async delete(organizationId: string, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('maintenance_windows')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', id)

    if (error) throw error
  }
}
