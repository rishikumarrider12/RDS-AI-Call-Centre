import { supabaseAdmin } from '../lib/supabase'

export interface CsvImportJob {
  id: string
  organization_id: string
  contact_list_id: string | null
  contact_list_name: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  total_rows: number
  valid_rows: number
  inserted: number
  duplicates_skipped: number
  errors: number
  error_samples: Array<{ row: number; message: string }>
  progress_percent: number
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateImportJobInput {
  organizationId: string
  contactListId?: string | null
  contactListName?: string | null
  totalRows: number
}

export class CsvImportJobRepository {
  async create(input: CreateImportJobInput) {
    const { data, error } = await supabaseAdmin
      .from('csv_import_jobs')
      .insert({
        organization_id: input.organizationId,
        contact_list_id: input.contactListId ?? null,
        contact_list_name: input.contactListName ?? null,
        total_rows: input.totalRows,
        status: 'pending',
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async findById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('csv_import_jobs')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data as CsvImportJob | null
  }

  async list(organizationId: string, limit = 50) {
    const { data, error } = await supabaseAdmin
      .from('csv_import_jobs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data || []
  }

  async update(id: string, payload: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin
      .from('csv_import_jobs')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async markProcessing(id: string) {
    return this.update(id, {
      status: 'processing',
      started_at: new Date().toISOString(),
    })
  }

  async markCompleted(id: string, result: { inserted: number; duplicatesSkipped: number; errors: number; validRows: number }) {
    return this.update(id, {
      status: 'completed',
      progress_percent: 100,
      valid_rows: result.validRows,
      inserted: result.inserted,
      duplicates_skipped: result.duplicatesSkipped,
      errors: result.errors,
      completed_at: new Date().toISOString(),
    })
  }

  async markFailed(id: string, errorSamples: Array<{ row: number; message: string }>) {
    return this.update(id, {
      status: 'failed',
      error_samples: errorSamples,
      completed_at: new Date().toISOString(),
    })
  }

  async updateProgress(id: string, progressPercent: number) {
    return this.update(id, { progress_percent: progressPercent })
  }
}
