import { supabaseAdmin } from '../lib/supabase'

export interface AccessReviewRow {
  id: string
  organization_id: string
  title: string
  description: string | null
  reviewer_id: string | null
  status: string
  started_at: string
  due_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export class AccessReviewRepository {
  async list(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('access_reviews')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('started_at', { ascending: false })
    if (error) throw error
    return (data || []) as AccessReviewRow[]
  }

  async findById(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('access_reviews')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return data as AccessReviewRow | null
  }

  async create(organizationId: string, input: {
    title: string
    description?: string | null
    reviewerId?: string | null
    status?: string
    dueAt?: string | null
  }) {
    const { data, error } = await supabaseAdmin
      .from('access_reviews')
      .insert({
        organization_id: organizationId,
        title: input.title,
        description: input.description ?? null,
        reviewer_id: input.reviewerId ?? null,
        status: input.status ?? 'open',
        due_at: input.dueAt ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(id: string, input: {
    title?: string
    description?: string | null
    reviewerId?: string | null
    status?: string
    dueAt?: string | null
    completedAt?: string | null
  }) {
    const payload: Record<string, unknown> = {}
    if (input.title !== undefined) payload.title = input.title
    if (input.description !== undefined) payload.description = input.description
    if (input.reviewerId !== undefined) payload.reviewer_id = input.reviewerId
    if (input.status !== undefined) payload.status = input.status
    if (input.dueAt !== undefined) payload.due_at = input.dueAt
    if (input.completedAt !== undefined) payload.completed_at = input.completedAt

    const { data, error } = await supabaseAdmin
      .from('access_reviews')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async softDelete(id: string) {
    const { error } = await supabaseAdmin
      .from('access_reviews')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }
}
