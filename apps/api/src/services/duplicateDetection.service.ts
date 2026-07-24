import { ContactRepository } from '../repositories/contact.repository'
import { DuplicateContactRepository } from '../repositories/duplicateContact.repository'

export interface DuplicateContactInput {
  contactId: string
  duplicateOfPhone: string
  importJobId?: string | null
  duplicateContactId?: string | null
}

export class DuplicateDetectionService {
  private contactRepo = new ContactRepository()
  private dupRepo = new DuplicateContactRepository()

  async detectAndRecord(organizationId: string, contactIds: string[], importJobId?: string | null) {
    if (contactIds.length === 0) return { recorded: 0 }

    const existing = await this.contactRepo.list(organizationId, { search: '', page: 1, pageSize: 10000 })
    const existingMap = new Map<string, string>()
    existing.contacts.forEach((c: any) => {
      if (c.phone) existingMap.set(c.phone.trim(), c.id)
    })

    let recorded = 0
    for (const contactId of contactIds) {
      const found = existing.contacts.find((c: any) => c.id === contactId)
      if (found && found.phone && existingMap.has(found.phone)) {
        const dupOf = existingMap.get(found.phone)
        if (dupOf !== found.id) {
          await this.dupRepo.create(organizationId, {
            importJobId: importJobId ?? null,
            contactId: found.id,
            duplicateOfPhone: found.phone,
            duplicateContactId: dupOf,
          })
          recorded++
        }
      }
    }
    return { recorded }
  }

  async listDuplicates(organizationId: string, status?: string, limit = 200) {
    return this.dupRepo.list(organizationId, status, limit)
  }

  async resolveDuplicate(id: string, status: 'reviewed' | 'merged' | 'ignored') {
    return this.dupRepo.updateStatus(id, status)
  }

  async getDuplicateStats(organizationId: string) {
    return this.dupRepo.countByStatus(organizationId)
  }
}
