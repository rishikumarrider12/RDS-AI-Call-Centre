import { supabaseAdmin } from '../lib/supabase'

export interface CreateContactInput {
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
  metadata?: Record<string, unknown>
}

export interface UpdateContactInput {
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

export class ContactRepository {
  private toDb(input: CreateContactInput) {
    return {
      contact_list_id: input.contactListId ?? null,
      first_name: input.firstName ?? null,
      last_name: input.lastName ?? null,
      email: input.email ?? null,
      phone: input.phone,
      country: input.country ?? null,
      timezone: input.timezone ?? null,
      tags: input.tags ?? [],
      dnd_status: input.dndStatus ?? false,
      source: input.source ?? null,
      metadata: input.metadata ?? {},
    }
  }

  async list(
    organizationId: string,
    options: {
      search?: string
      contactListId?: string
      page?: number
      pageSize?: number
    }
  ) {
    const page = options.page && options.page > 0 ? options.page : 1
    const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 10
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabaseAdmin
      .from('contacts')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (options.contactListId) {
      query = query.eq('contact_list_id', options.contactListId)
    }
    if (options.search && options.search.trim()) {
      const term = `%${options.search.trim()}%`
      query = query.or(`phone.ilike.${term},email.ilike.${term},first_name.ilike.${term},last_name.ilike.${term}`)
    }

    const { data, error, count } = await query
    if (error) throw error
    return {
      contacts: data || [],
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async findById(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async findByPhone(organizationId: string, phones: string[]) {
    if (phones.length === 0) return [] as any[]
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .select('id, phone, contact_list_id')
      .eq('organization_id', organizationId)
      .in('phone', phones)
      .is('deleted_at', null)
    if (error) throw error
    return data || []
  }

  async create(organizationId: string, input: CreateContactInput) {
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .insert({ organization_id: organizationId, ...this.toDb(input) })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async bulkCreate(organizationId: string, inputs: CreateContactInput[]) {
    if (inputs.length === 0) return [] as any[]
    const rows = inputs.map((input) => ({ organization_id: organizationId, ...this.toDb(input) }))
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .insert(rows)
      .select()
    if (error) throw error
    return data || []
  }

  async update(id: string, input: UpdateContactInput) {
    const payload: Record<string, unknown> = {}
    if (input.contactListId !== undefined) payload.contact_list_id = input.contactListId
    if (input.firstName !== undefined) payload.first_name = input.firstName
    if (input.lastName !== undefined) payload.last_name = input.lastName
    if (input.email !== undefined) payload.email = input.email
    if (input.phone !== undefined) payload.phone = input.phone
    if (input.country !== undefined) payload.country = input.country
    if (input.timezone !== undefined) payload.timezone = input.timezone
    if (input.tags !== undefined) payload.tags = input.tags
    if (input.dndStatus !== undefined) payload.dnd_status = input.dndStatus
    if (input.source !== undefined) payload.source = input.source
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async bulkUpdate(ids: string[], input: UpdateContactInput) {
    if (ids.length === 0) return
    const payload: Record<string, unknown> = {}
    if (input.contactListId !== undefined) payload.contact_list_id = input.contactListId
    if (input.tags !== undefined) payload.tags = input.tags
    if (input.dndStatus !== undefined) payload.dnd_status = input.dndStatus
    const { error } = await supabaseAdmin
      .from('contacts')
      .update(payload)
      .in('id', ids)
    if (error) throw error
  }

  async delete(id: string) {
    const { error } = await supabaseAdmin
      .from('contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }

  async bulkDelete(ids: string[]) {
    if (ids.length === 0) return
    const { error } = await supabaseAdmin
      .from('contacts')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', ids)
    if (error) throw error
  }

  async countByList(organizationId: string, listId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('contact_list_id', listId)
      .is('deleted_at', null)
    if (error) throw error
    return count ?? 0
  }
}
