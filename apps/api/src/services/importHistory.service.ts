import { supabaseAdmin } from '../lib/supabase'
import { ContactRepository } from '../repositories/contact.repository'
import { ContactListRepository } from '../repositories/contactList.repository'
import { CsvImportJobRepository } from '../repositories/csvImportJob.repository'
import { DuplicateDetectionService } from '../services/duplicateDetection.service'

export interface ImportHistoryRecord {
  id: string
  organizationId: string
  importJobId: string | null
  contactListId: string | null
  contactListName: string | null
  totalRows: number
  validRows: number
  inserted: number
  duplicatesSkipped: number
  errors: number
  errorSamples: Array<{ row: number; message: string }>
  importedBy: string | null
  durationMs: number | null
  createdAt: string
}

export interface DashboardContactStats {
  totalContacts: number
  activeLists: number
  importedToday: number
  duplicateContacts: number
  importSuccessRate: number
  activeSegments: number
}

export class ImportHistoryService {
  private jobRepo = new CsvImportJobRepository()
  private contactRepo = new ContactRepository()
  private listRepo = new ContactListRepository()
  private dupService = new DuplicateDetectionService()

  async createHistoryRecord(jobId: string, organizationId: string, result: {
    contactListId: string | null
    contactListName: string | null
    totalRows: number
    validRows: number
    inserted: number
    duplicatesSkipped: number
    errors: number
    errorSamples: Array<{ row: number; message: string }>
  }, _importedBy: string | null, _startTime: number) {
    await this.jobRepo.markProcessing(jobId)
    await this.jobRepo.markCompleted(jobId, result)
  }

  async getHistory(organizationId: string, options: { page?: number; pageSize?: number; contactListId?: string }): Promise<{ jobs: any[]; total: number; page: number; pageSize: number }> {
    const page = options.page && options.page > 0 ? options.page : 1
    const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 20
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabaseAdmin
      .from('csv_import_jobs')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (options.contactListId) {
      query = query.eq('contact_list_id', options.contactListId)
    }

    const { data, error, count } = await query
    if (error) throw error

    return {
      jobs: data || [],
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async getJobErrors(importJobId: string) {
    const { data, error } = await supabaseAdmin
      .from('import_validation_errors')
      .select('*')
      .eq('import_job_id', importJobId)
      .order('row_number', { ascending: true })
    if (error) throw error
    return data || []
  }

  async getDashboardStats(organizationId: string): Promise<DashboardContactStats> {
    const [jobs, contacts, lists, duplicateStats] = await Promise.all([
      this.jobRepo.list(organizationId, 100),
      this.contactRepo.list(organizationId, { page: 1, pageSize: 10000 }),
      this.listRepo.list(organizationId),
      this.dupService.getDuplicateStats(organizationId),
    ])

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayJobs = jobs.filter((j) => new Date(j.created_at) >= today)

    const totalImportedToday = todayJobs.reduce((sum, j) => sum + (j.inserted || 0), 0)
    const totalRowsFromToday = todayJobs.reduce((sum, j) => sum + (j.total_rows || 0), 0)
    const completedToday = todayJobs.filter((j) => j.status === 'completed').length
    const successRate = totalRowsFromToday > 0 ? Math.round((completedToday / Math.max(1, todayJobs.length)) * 100) : 100

    const activeSegments = 0

    return {
      totalContacts: contacts.total || 0,
      activeLists: lists.filter((l: any) => !l.deleted_at).length,
      importedToday: totalImportedToday,
      duplicateContacts: duplicateStats['detected'] || 0,
      importSuccessRate: successRate,
      activeSegments,
    }
  }
}
