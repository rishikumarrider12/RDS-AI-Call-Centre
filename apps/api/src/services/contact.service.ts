import { ContactRepository } from '../repositories/contact.repository'
import { ContactListService } from './contactList.service'
import { parseCsv, buildHeaderMap } from '../lib/csv'
import { supabaseAdmin } from '../lib/supabase'
import type { Contact, CsvImportResult } from '@rds/types'

function splitTags(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

function toBool(value: string | undefined): boolean {
  if (!value) return false
  const v = value.trim().toLowerCase()
  return v === 'true' || v === 'yes' || v === '1' || v === 'y'
}

export class ContactService {
  private repository = new ContactRepository()
  private listService = new ContactListService()

  private toContact(dbContact: any): Contact {
    return {
      id: dbContact.id,
      organizationId: dbContact.organization_id,
      contactListId: dbContact.contact_list_id ?? null,
      firstName: dbContact.first_name ?? null,
      lastName: dbContact.last_name ?? null,
      email: dbContact.email ?? null,
      phone: dbContact.phone,
      country: dbContact.country ?? null,
      timezone: dbContact.timezone ?? null,
      tags: dbContact.tags ?? [],
      dndStatus: dbContact.dnd_status ?? false,
      source: dbContact.source ?? null,
      metadata: dbContact.metadata ?? {},
      createdAt: dbContact.created_at,
      updatedAt: dbContact.updated_at,
    }
  }

  async list(
    organizationId: string,
    options: { search?: string; contactListId?: string; page?: number; pageSize?: number }
  ) {
    const result = await this.repository.list(organizationId, options)
    return {
      data: result.contacts.map((c) => this.toContact(c)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    }
  }

  async getById(organizationId: string, id: string): Promise<Contact> {
    const dbContact = await this.repository.findById(organizationId, id)
    if (!dbContact) throw new Error('Contact not found')
    return this.toContact(dbContact)
  }

  async create(
    organizationId: string,
    input: {
      contactListId?: string | null
      firstName?: string | null
      lastName?: string | null
      email?: string | null
      phone: string
      country?: string | null
      timezone?: string | null
      tags?: string[]
      dndStatus?: boolean
      source?: string | null
    }
  ): Promise<Contact> {
    if (!input.phone || input.phone.trim().length === 0) {
      throw new Error('Phone number is required')
    }
    const dbContact = await this.repository.create(organizationId, input)
    if (input.contactListId) {
      await this.listService.refreshCount(organizationId, input.contactListId)
    }
    return this.toContact(dbContact)
  }

  async update(
    organizationId: string,
    id: string,
    input: {
      contactListId?: string | null
      firstName?: string | null
      lastName?: string | null
      email?: string | null
      phone?: string
      country?: string | null
      timezone?: string | null
      tags?: string[]
      dndStatus?: boolean
      source?: string | null
    }
  ): Promise<Contact> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Contact not found')
    const dbContact = await this.repository.update(id, input)
    const affected = new Set([existing.contact_list_id, input.contactListId].filter(Boolean) as string[])
    for (const listId of affected) {
      await this.listService.refreshCount(organizationId, listId)
    }
    return this.toContact(dbContact)
  }

  async bulkUpdate(
    organizationId: string,
    ids: string[],
    input: {
      contactListId?: string | null
      tags?: string[]
      dndStatus?: boolean
    }
  ): Promise<number> {
    if (ids.length === 0) throw new Error('No contact ids provided')
    const validIds = await this.filterOwnedIds(organizationId, ids)
    if (validIds.length === 0) return 0
    await this.repository.bulkUpdate(validIds, input)
    const touched = new Set<string>()
    if (input.contactListId) touched.add(input.contactListId)
    for (const listId of touched) {
      await this.listService.refreshCount(organizationId, listId)
    }
    return validIds.length
  }

  async delete(organizationId: string, id: string) {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Contact not found')
    await this.repository.delete(id)
    if (existing.contact_list_id) {
      await this.listService.refreshCount(organizationId, existing.contact_list_id)
    }
  }

  async bulkDelete(organizationId: string, ids: string[]): Promise<number> {
    if (ids.length === 0) throw new Error('No contact ids provided')
    const validIds = await this.filterOwnedIds(organizationId, ids)
    if (validIds.length === 0) return 0
    await this.repository.bulkDelete(validIds)
    return validIds.length
  }

  /**
   * Ensures only contact ids that belong to the requesting organization are acted upon.
   */
  private async filterOwnedIds(organizationId: string, ids: string[]): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('organization_id', organizationId)
      .in('id', ids)
      .is('deleted_at', null)
    if (error) throw error
    return (data || []).map((c: any) => c.id)
  }

  async importCsv(
    organizationId: string,
    csv: string,
    options: { contactListId?: string | null; skipDuplicates?: boolean }
  ): Promise<CsvImportResult> {
    const parsed = parseCsv(csv)
    const headerMap = buildHeaderMap(parsed.headers)

    const result: CsvImportResult = {
      totalRows: parsed.rows.length,
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
        const list = await this.listService.getById(organizationId, options.contactListId)
        result.contactListName = list.name
      } catch {
        // list not found; contacts still imported without a list
      }
    }

    if (parsed.rows.length === 0) {
      return result
    }

    const toInsert: Parameters<ContactRepository['bulkCreate']>[1] = []
    const seenPhones = new Set<string>()

    parsed.rows.forEach((row, index) => {
      const rowNumber = index + 2 // 1-based plus header row
      const mapped: Record<string, string> = {}
      Object.entries(headerMap).forEach(([idx, field]) => {
        mapped[field] = row[Number(idx)]?.trim() ?? ''
      })

      const phone = (mapped.phone || '').trim()
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

      result.validRows++
      toInsert.push({
        contactListId: options.contactListId ?? null,
        firstName: mapped.firstName || null,
        lastName: mapped.lastName || null,
        email: mapped.email || null,
        phone,
        country: mapped.country || null,
        timezone: mapped.timezone || null,
        tags: splitTags(mapped.tags),
        dndStatus: toBool(mapped.dndStatus),
        source: mapped.source || 'csv-import',
      })
    })

    // Cross-check against existing contacts in the org when skipping duplicates
    if (options.skipDuplicates && toInsert.length > 0) {
      const existing = await this.repository.findByPhone(
        organizationId,
        toInsert.map((c) => c.phone)
      )
      const existingPhones = new Set(existing.map((e) => e.phone))
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
      const inserted = await this.repository.bulkCreate(organizationId, toInsert)
      result.inserted = inserted.length
    }

    if (options.contactListId) {
      await this.listService.refreshCount(organizationId, options.contactListId)
    }

    return result
  }
}
