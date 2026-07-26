import { ContactListRepository } from '../repositories/contactList.repository'
import type { ContactList } from '@rds/types'

export class ContactListService {
  private repository = new ContactListRepository()

  private toContactList(dbList: any): ContactList {
    return {
      id: dbList.id,
      organizationId: dbList.organization_id,
      name: dbList.name,
      description: dbList.description ?? null,
      totalContacts: dbList.total_contacts ?? 0,
      tags: dbList.tags ?? [],
      createdById: dbList.created_by,
      createdAt: dbList.created_at,
      updatedAt: dbList.updated_at,
    }
  }

  async list(organizationId: string): Promise<ContactList[]> {
    const lists = await this.repository.list(organizationId)
    return lists.map((l) => this.toContactList(l))
  }

  async getById(organizationId: string, id: string): Promise<ContactList> {
    const dbList = await this.repository.findById(organizationId, id)
    if (!dbList) throw new Error('Contact list not found')
    return this.toContactList(dbList)
  }

  async create(
    organizationId: string,
    createdById: string,
    input: { name: string; description?: string | null; tags?: string[] }
  ): Promise<ContactList> {
    if (!input.name || input.name.trim().length < 2) {
      throw new Error('Contact list name must be at least 2 characters')
    }
    const dbList = await this.repository.create(organizationId, createdById, input)
    return this.toContactList(dbList)
  }

  async update(
    organizationId: string,
    id: string,
    input: { name?: string; description?: string | null; tags?: string[] }
  ): Promise<ContactList> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Contact list not found')
    const dbList = await this.repository.update(id, input)
    return this.toContactList(dbList)
  }

  async delete(organizationId: string, id: string) {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Contact list not found')
    await this.repository.softDelete(id)
  }

  async refreshCount(organizationId: string, id: string) {
    const total = await this.repository.countContacts(organizationId, id)
    await this.repository.setTotalContacts(id, total)
    return total
  }
}
