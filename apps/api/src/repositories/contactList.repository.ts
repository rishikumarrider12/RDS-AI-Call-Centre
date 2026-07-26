import { supabaseAdmin } from '../lib/supabase'

export interface CreateContactListInput {
  name: string
  description?: string | null
  tags?: string[]
}

export interface UpdateContactListInput {
  name?: string
  description?: string | null
  tags?: string[]
}

export class ContactListRepository {
  async list(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('contact_lists')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }

  async findById(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('contact_lists')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async create(organizationId: string, createdById: string, input: CreateContactListInput) {
    const { data, error } = await supabaseAdmin
      .from('contact_lists')
      .insert({
        organization_id: organizationId,
        created_by: createdById,
        name: input.name,
        description: input.description ?? null,
        tags: input.tags ?? [],
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(id: string, input: UpdateContactListInput) {
    const payload: Record<string, unknown> = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.description !== undefined) payload.description = input.description
    if (input.tags !== undefined) payload.tags = input.tags
    const { data, error } = await supabaseAdmin
      .from('contact_lists')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async softDelete(id: string) {
    const { error } = await supabaseAdmin
      .from('contact_lists')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }

  async setTotalContacts(id: string, total: number) {
    const { error } = await supabaseAdmin
      .from('contact_lists')
      .update({ total_contacts: total })
      .eq('id', id)
    if (error) throw error
  }

  async countContacts(organizationId: string, listId: string): Promise<number> {
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
