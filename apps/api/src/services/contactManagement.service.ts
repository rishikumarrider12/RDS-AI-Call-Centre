import { ContactListRepository } from '../repositories/contactList.repository'
import { ContactSegmentService } from '../services/contactSegment.service'
import { ImportHistoryService } from '../services/importHistory.service'
import { DuplicateDetectionService } from '../services/duplicateDetection.service'
import { ContactService } from './contact.service'

export interface ContactManagementDashboardStats {
  totalContacts: number
  activeLists: number
  importedToday: number
  duplicateContacts: number
  importSuccessRate: number
  activeSegments: number
}

export class ContactManagementService {
  private listRepo = new ContactListRepository()
  private segmentService = new ContactSegmentService()
  private historyService = new ImportHistoryService()
  private dupService = new DuplicateDetectionService()
  private contactService = new ContactService()

  async getDashboardStats(organizationId: string): Promise<ContactManagementDashboardStats> {
    return this.historyService.getDashboardStats(organizationId)
  }

  async getImportHistory(organizationId: string, options: { page?: number; pageSize?: number; contactListId?: string }) {
    return this.historyService.getHistory(organizationId, options)
  }

  async getDuplicates(organizationId: string, status?: string, limit = 200) {
    return this.dupService.listDuplicates(organizationId, status, limit)
  }

  async resolveDuplicate(organizationId: string, duplicateId: string, status: 'reviewed' | 'merged' | 'ignored') {
    return this.dupService.resolveDuplicate(duplicateId, status)
  }

  async createSegment(organizationId: string, input: { name: string; description?: string | null; filters?: Record<string, unknown> }) {
    return this.segmentService.create(organizationId, input)
  }

  async listSegments(organizationId: string) {
    return this.segmentService.list(organizationId)
  }

  async getSegment(organizationId: string, segmentId: string) {
    return this.segmentService.getById(organizationId, segmentId)
  }

  async updateSegment(organizationId: string, segmentId: string, input: { name?: string; description?: string | null; isActive?: boolean }) {
    return this.segmentService.update(organizationId, segmentId, input)
  }

  async deleteSegment(organizationId: string, segmentId: string) {
    return this.segmentService.delete(organizationId, segmentId)
  }

  async getSegmentContacts(organizationId: string, segmentId: string, options: { page?: number; pageSize?: number; search?: string }) {
    return this.segmentService.getContacts(organizationId, segmentId, options)
  }

  async refreshSegment(organizationId: string, segmentId: string) {
    return this.segmentService.updateMembers(organizationId, segmentId)
  }

  async exportContacts(organizationId: string, options: { contactListId?: string | null; search?: string; tags?: string[] }): Promise<string> {
    const result = await this.contactService.list(organizationId, {
      search: options.search,
      contactListId: options.contactListId || undefined,
      page: 1,
      pageSize: 10000,
    })

    const contacts = result.data
    if (contacts.length === 0) return 'phone,first_name,last_name,email,country,timezone,tags,source\n'

    const headers = ['phone', 'first_name', 'last_name', 'email', 'country', 'timezone', 'tags', 'source']
    const csvRows: string[] = [headers.join(',')]

    for (const c of contacts) {
      const row = [
        `"${(c.phone || '').replace(/"/g, '""')}"`,
        `"${(c.firstName || '').replace(/"/g, '""')}"`,
        `"${(c.lastName || '').replace(/"/g, '""')}"`,
        `"${(c.email || '').replace(/"/g, '""')}"`,
        `"${(c.country || '').replace(/"/g, '""')}"`,
        `"${(c.timezone || '').replace(/"/g, '""')}"`,
        `"${(c.tags || []).join(';').replace(/"/g, '""')}"`,
        `"${(c.source || '').replace(/"/g, '""')}"`,
      ]
      csvRows.push(row.join(','))
    }

    return csvRows.join('\n') + '\n'
  }
}
