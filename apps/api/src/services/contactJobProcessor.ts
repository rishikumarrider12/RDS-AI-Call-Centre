import { ContactRepository } from '../repositories/contact.repository'
import { ContactListService } from './contactList.service'
import { parseCsv } from '../lib/csv'

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

export async function importCsv(
  organizationId: string,
  csv: string,
  options: { contactListId?: string | null; skipDuplicates?: boolean },
  contactRepo: ContactRepository,
  listService: ContactListService
): Promise<CsvImportResultModel> {
  const parsed = parseCsv(csv)
  const rows = parsed.rows

  const result: CsvImportResultModel = {
    totalRows: rows.length,
    validRows: 0,
    inserted: 0,
    duplicatesSkipped: 0,
    errors: 0,
    errorSamples: [],
    contactListId: options.contactListId ?? null,
    contactListName: null,
  }

  if (options.contactListId) {
    try {
      const list = await listService.getById(organizationId, options.contactListId)
      result.contactListName = list.name
    } catch {
      // list not found; contacts still imported without a list
    }
  }

  if (rows.length === 0) return result

  const toInsert: Parameters<ContactRepository['bulkCreate']>[1] = []
  const seenPhones = new Set<string>()

  rows.forEach((row: string[], index: number) => {
    const rowNumber = index + 2
    const mapped: Record<string, string> = {}
    parsed.headers.forEach((header: string, hIdx: number) => {
      mapped[header.toLowerCase().replace(/[^a-z0-9]/g, '')] = (row[hIdx] ?? '').trim()
    })

    const phone = mapped['phone'] || mapped['phonenumber'] || mapped['mobile'] || mapped['telephone'] || ''
    if (!phone) {
      result.errors++
      if (result.errorSamples.length < 10) {
        result.errorSamples.push({ row: rowNumber, message: 'Missing required phone number' })
      }
      return
    }

    if (seenPhones.has(phone)) {
      result.duplicatesSkipped++
      return
    }
    seenPhones.add(phone)

    const tags: string[] = []
    if (mapped['tags']) {
      mapped['tags'].split(',').forEach((t: string) => {
        const trimmed = t.trim()
        if (trimmed) tags.push(trimmed)
      })
    }

    result.validRows++
    toInsert.push({
      contactListId: options.contactListId ?? null,
      firstName: mapped['firstname'] || mapped['first'] || mapped['fname'] || null,
      lastName: mapped['lastname'] || mapped['last'] || mapped['lname'] || null,
      email: mapped['email'] || mapped['mail'] || null,
      phone,
      country: mapped['country'] || null,
      timezone: mapped['timezone'] || mapped['tz'] || null,
      tags,
      dndStatus: mapped['dnd'] === 'true' || mapped['dndstatus'] === 'true',
      source: mapped['source'] || 'csv-import',
    })
  })

  if (options.skipDuplicates && toInsert.length > 0) {
    const existing = await contactRepo.findByPhone(organizationId, toInsert.map((c) => c.phone))
    const existingPhones = new Set(existing.map((e: any) => e.phone))
    const filtered = toInsert.filter((c) => {
      if (existingPhones.has(c.phone)) {
        result.duplicatesSkipped++
        return false
      }
      return true
    })
    toInsert.length = 0
    toInsert.push(...filtered)
  }

  if (toInsert.length > 0) {
    const inserted = await contactRepo.bulkCreate(organizationId, toInsert)
    result.inserted = inserted.length
  }

  if (options.contactListId) {
    await listService.refreshCount(organizationId, options.contactListId)
  }

  return result
}
