import { supabaseAdmin } from '../lib/supabase'

export type BackupType = 'full' | 'schema' | 'data' | 'incremental'
export type BackupStatus = 'pending' | 'running' | 'completed' | 'failed' | 'restoring'

export interface BackupRecord {
  id: string
  organizationId: string
  type: BackupType
  status: BackupStatus
  sizeBytes: number | null
  path: string | null
  startedAt: string | null
  completedAt: string | null
  error: string | null
  createdAt: string
  updatedAt: string
}

function toBackup(row: any): BackupRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    type: row.type,
    status: row.status,
    sizeBytes: row.size_bytes ? Number(row.size_bytes) : null,
    path: row.path,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class BackupRepository {
  async list(organizationId: string, page = 1, pageSize = 25) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    const { data, error, count } = await supabaseAdmin
      .from('backups')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(from, to)
    if (error) throw error
    return { backups: (data || []).map(toBackup), total: count ?? 0, page, pageSize }
  }

  async get(organizationId: string, id: string): Promise<BackupRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('backups')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data ? toBackup(data) : null
  }

  async create(input: {
    organizationId: string
    type: BackupType
    status?: BackupStatus
    path?: string | null
    startedAt?: string | null
  }): Promise<BackupRecord> {
    const { data, error } = await supabaseAdmin
      .from('backups')
      .insert({
        organization_id: input.organizationId,
        type: input.type,
        status: input.status || 'pending',
        path: input.path || null,
        started_at: input.startedAt || new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw error
    return toBackup(data)
  }

  async update(organizationId: string, id: string, patch: Partial<BackupRecord>): Promise<BackupRecord> {
    const payload: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() }
    if (payload.type) payload.type = patch.type
    if (payload.status) payload.status = patch.status
    if (payload.sizeBytes !== undefined) payload.size_bytes = patch.sizeBytes
    if (payload.path !== undefined) payload.path = patch.path
    if (payload.startedAt !== undefined) payload.started_at = patch.startedAt
    if (payload.completedAt !== undefined) payload.completed_at = patch.completedAt
    if (payload.error !== undefined) payload.error = patch.error

    const { data, error } = await supabaseAdmin
      .from('backups')
      .update(payload)
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return toBackup(data)
  }

  async delete(organizationId: string, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('backups')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', id)
    if (error) throw error
  }
}
