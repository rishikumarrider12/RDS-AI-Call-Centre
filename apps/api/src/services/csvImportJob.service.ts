import { ContactRepository } from '../repositories/contact.repository'
import { ContactListService } from './contactList.service'
import { ContactListRepository } from '../repositories/contactList.repository'
import { CsvImportJobRepository } from '../repositories/csvImportJob.repository'
import { importCsv } from './contactJobProcessor'

export interface CsvImportResultModel {
  totalRows: number
  validRows: number
  inserted: number
  duplicatesSkipped: number
  errors: number
  errorSamples: Array<{ row: number; message: string }>
  contactListId: string | null
  contactListName: string | null
}

export class CsvImportJobService {
  private listService = new ContactListService()
  private listRepo = new ContactListRepository()
  private jobRepo = new CsvImportJobRepository()

  private contactRepo = new ContactRepository()

  async startImport(
    organizationId: string,
    csv: string,
    options: { contactListId?: string | null; skipDuplicates?: boolean; chunks?: number }
  ): Promise<void> {
    const chunks = Math.max(1, options.chunks || 1)
    if (chunks > 1) {
      await this.processCsvInChunks(organizationId, csv, options, chunks)
    } else {
      await importCsv(organizationId, csv, options, this.contactRepo, this.listService)
    }
  }

  private async processCsvInChunks(
    organizationId: string,
    csv: string,
    options: { contactListId?: string | null; skipDuplicates?: boolean },
    totalChunks: number
  ) {
    const lines = csv.split('\n')
    const chunkSize = Math.max(1, Math.ceil(lines.length / totalChunks))
    const listService = new ContactListService()
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize
      const chunk = lines.slice(start, start + chunkSize + 1).join('\n')
      if (chunk.trim()) {
        await importCsv(organizationId, chunk, options, this.contactRepo, listService)
      }
    }
  }

  async createImportJob(organizationId: string, contactListId?: string | null, contactListName?: string | null, totalRows = 0) {
    let resolvedName = contactListName || null
    if (!resolvedName && contactListId) {
      try {
        const list = await this.listService.getById(organizationId, contactListId)
        resolvedName = list.name
      } catch {
        // list might not exist
      }
    }
    return this.jobRepo.create({ organizationId, contactListId: contactListId ?? null, contactListName: resolvedName, totalRows })
  }
}
