import { supabaseAdmin } from '../lib/supabase'
import { ContactSegmentRepository } from '../repositories/contactSegment.repository'
import { ContactRepository } from '../repositories/contact.repository'

export interface ContactSegmentModel {
  id: string
  organizationId: string
  name: string
  description: string | null
  contactCount: number
  filters: Record<string, unknown>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export class ContactSegmentService {
  private repository = new ContactSegmentRepository()
  private contactRepo = new ContactRepository()

  private toModel(db: any): ContactSegmentModel {
    return {
      id: db.id,
      organizationId: db.organization_id,
      name: db.name,
      description: db.description ?? null,
      contactCount: db.contact_count ?? 0,
      filters: db.filters ?? {},
      isActive: db.is_active ?? true,
      createdAt: db.created_at,
      updatedAt: db.updated_at,
    }
  }

  async list(organizationId: string): Promise<ContactSegmentModel[]> {
    const segments = await this.repository.list(organizationId)
    return segments.map((s) => this.toModel(s))
  }

  async getById(organizationId: string, id: string): Promise<ContactSegmentModel> {
    const db = await this.repository.findById(organizationId, id)
    if (!db) throw new Error('Segment not found')
    return this.toModel(db)
  }

  async create(organizationId: string, input: { name: string; description?: string | null; filters?: Record<string, unknown> }): Promise<ContactSegmentModel> {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Segment name is required')
    }
    const db = await this.repository.create(organizationId, {
      name: input.name.trim(),
      description: input.description ?? null,
      filters: input.filters ?? {},
    })
    const result = this.toModel(db)
    await this.updateMembers(organizationId, result.id)
    return result
  }

  async update(organizationId: string, id: string, input: { name?: string; description?: string | null; filters?: Record<string, unknown>; isActive?: boolean }): Promise<ContactSegmentModel> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Segment not found')
    const db = await this.repository.update(organizationId, id, input)
    const result = this.toModel(db)
    if (input.filters !== undefined) {
      await this.updateMembers(organizationId, result.id)
    }
    return result
  }

  async delete(organizationId: string, id: string) {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Segment not found')
    await this.repository.softDelete(organizationId, id)
    await this.repository.clearMembers(id)
  }

  async updateMembers(organizationId: string, id: string) {
    const segment = await this.repository.findById(organizationId, id)
    if (!segment) throw new Error('Segment not found')
    const contactIds = await this.repository.buildSegmentContacts(organizationId, segment.filters)
    await this.repository.clearMembers(id)
    if (contactIds.length > 0) {
      await this.repository.addMembers(id, contactIds, organizationId)
    }
    await this.repository.updateContactCount(id, contactIds.length)
  }

  async getContacts(organizationId: string, segmentId: string, options: { page?: number; pageSize?: number; search?: string }) {
    const segment = await this.repository.findById(organizationId, segmentId)
    if (!segment) throw new Error('Segment not found')

    const page = options.page && options.page > 0 ? options.page : 1
    const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 25
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const memberContactIds = await this.repository.getMembers(segmentId)

    if (memberContactIds.length === 0) {
      return { contacts: [], total: 0, page, pageSize }
    }

    let q = supabaseAdmin
      .from('contacts')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .in('id', memberContactIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (options.search && options.search.trim()) {
      const term = `%${options.search.trim()}%`
      q = q.or(`phone.ilike.${term},email.ilike.${term},first_name.ilike.${term},last_name.ilike.${term}`)
    }

    const { data, error, count } = await q
    if (error) throw error
    return {
      contacts: data || [],
      total: count ?? 0,
      page,
      pageSize,
    }
  }
}
