import { supabaseAdmin } from '../lib/supabase'

export type ScheduledJobType = 'metrics_cleanup' | 'report_generation' | 'data_retention' | 'health_check' | 'backup' | 'custom'
export type ScheduledJobStatus = 'pending' | 'running' | 'success' | 'failed'

export interface ScheduledJob {
  id: string
  organizationId: string
  name: string
  jobType: ScheduledJobType
  cron: string
  payload: Record<string, unknown>
  lastRunAt: string | null
  nextRunAt: string | null
  lastStatus: ScheduledJobStatus
  lastError: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

function toJob(row: any): ScheduledJob {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    jobType: row.job_type as ScheduledJob['jobType'],
    cron: row.cron,
    payload: row.payload || {},
    lastRunAt: row.last_run_at,
    nextRunAt: row.next_run_at,
    lastStatus: row.last_status as ScheduledJob['lastStatus'],
    lastError: row.last_error,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class ScheduledJobRepository {
  async list(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('scheduled_jobs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map(toJob)
  }

  async get(organizationId: string, id: string): Promise<ScheduledJob | null> {
    const { data, error } = await supabaseAdmin
      .from('scheduled_jobs')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    return data ? toJob(data) : null
  }

  async create(input: {
    organizationId: string
    name: string
    jobType: ScheduledJobType
    cron: string
    payload?: Record<string, unknown>
    isActive?: boolean
  }): Promise<ScheduledJob> {
    const { data, error } = await supabaseAdmin
      .from('scheduled_jobs')
      .insert({
        organization_id: input.organizationId,
        name: input.name,
        job_type: input.jobType,
        cron: input.cron,
        payload: input.payload || {},
        is_active: input.isActive ?? true,
      })
      .select()
      .single()

    if (error) throw error
    return toJob(data)
  }

  async update(organizationId: string, id: string, patch: Partial<ScheduledJob>): Promise<ScheduledJob> {
    const payload: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() }
    if (payload.name) payload.name = patch.name
    if (payload.jobType) payload.job_type = patch.jobType
    if (payload.cron) payload.cron = patch.cron
    if (payload.payload) payload.payload = patch.payload
    if (payload.lastRunAt !== undefined) payload.last_run_at = patch.lastRunAt
    if (payload.nextRunAt !== undefined) payload.next_run_at = patch.nextRunAt
    if (payload.lastStatus !== undefined) payload.last_status = patch.lastStatus
    if (payload.lastError !== undefined) payload.last_error = patch.lastError
    if (payload.isActive !== undefined) payload.is_active = patch.isActive

    const { data, error } = await supabaseAdmin
      .from('scheduled_jobs')
      .update(payload)
      .eq('organization_id', organizationId)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return toJob(data)
  }

  async delete(organizationId: string, id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('scheduled_jobs')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', id)

    if (error) throw error
  }
}
