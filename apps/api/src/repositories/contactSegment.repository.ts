import { supabaseAdmin } from '../lib/supabase'

export interface ContactSegment {
  id: string
  organization_id: string
  name: string
  description: string | null
  filters: Record<string, unknown>
  contact_count: number
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CreateSegmentInput {
  name: string
  description?: string | null
  filters?: Record<string, unknown>
}

export interface UpdateSegmentInput {
  name?: string
  description?: string | null
  filters?: Record<string, unknown>
  isActive?: boolean
}

export class ContactSegmentRepository {
  async list(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('contact_segments')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }

  async findById(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('contact_segments')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data as ContactSegment | null
  }

  async create(organizationId: string, input: CreateSegmentInput) {
    const { data, error } = await supabaseAdmin
      .from('contact_segments')
      .insert({
        organization_id: organizationId,
        name: input.name,
        description: input.description ?? null,
        filters: input.filters ?? {},
        contact_count: 0,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(organizationId: string, id: string, input: UpdateSegmentInput) {
    const payload: Record<string, unknown> = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.description !== undefined) payload.description = input.description
    if (input.filters !== undefined) payload.filters = input.filters
    if (input.isActive !== undefined) payload.is_active = input.isActive
    const { data, error } = await supabaseAdmin
      .from('contact_segments')
      .update(payload)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async softDelete(organizationId: string, id: string) {
    const { error } = await supabaseAdmin
      .from('contact_segments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId)
    if (error) throw error
  }

  async updateContactCount(id: string, count: number) {
    const { error } = await supabaseAdmin
      .from('contact_segments')
      .update({ contact_count: count })
      .eq('id', id)
    if (error) throw error
  }

  async getMembers(segmentId: string) {
    const { data, error } = await supabaseAdmin
      .from('contact_segment_members')
      .select('contact_id')
      .eq('segment_id', segmentId)
    if (error) throw error
    return (data || []).map((r: any) => r.contact_id)
  }

  async addMembers(segmentId: string, contactIds: string[], organizationId: string) {
    for (const contactId of contactIds) {
      try {
        await supabaseAdmin
          .from('contact_segment_members')
          .insert({
            segment_id: segmentId,
            contact_id: contactId,
            organization_id: organizationId,
          })
      } catch {
        // ignore duplicate key errors
      }
    }
  }

  async removeMembers(segmentId: string, contactIds: string[]) {
    const { error } = await supabaseAdmin
      .from('contact_segment_members')
      .delete()
      .eq('segment_id', segmentId)
      .in('contact_id', contactIds)
    if (error) throw error
  }

  async clearMembers(segmentId: string) {
    const { error } = await supabaseAdmin
      .from('contact_segment_members')
      .delete()
      .eq('segment_id', segmentId)
    if (error) throw error
  }

  async buildSegmentContacts(organizationId: string, filters: Record<string, unknown>) {
    let query = supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)

    if (filters.search && typeof filters.search === 'string') {
      const term = `%${filters.search.trim()}%`
      query = query.or(`phone.ilike.${term},email.ilike.${term},first_name.ilike.${term},last_name.ilike.${term}`)
    }
    if (filters.contactListId && typeof filters.contactListId === 'string') {
      query = query.eq('contact_list_id', filters.contactListId)
    }
    if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags as string[])
    }
    if (filters.source && typeof filters.source === 'string') {
      query = query.eq('source', filters.source)
    }
    if (filters.dndStatus !== undefined) {
      query = query.eq('dnd_status', filters.dndStatus)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []).map((r: any) => r.id)
  }
}
