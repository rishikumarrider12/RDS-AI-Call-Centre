import { supabaseAdmin } from '../lib/supabase'

export interface CreditRow {
  id: string
  organization_id: string
  amount: number
  currency: string
  reason: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export class CreditRepository {
  async list(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('credits')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as CreditRow[]
  }

  async findById(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('credits')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle()
    if (error) throw error
    return data as CreditRow | null
  }

  async create(organizationId: string, input: {
    amount: number
    currency?: string
    reason?: string | null
    expiresAt?: string | null
  }) {
    const { data, error } = await supabaseAdmin
      .from('credits')
      .insert({
        organization_id: organizationId,
        amount: input.amount,
        currency: input.currency || 'USD',
        reason: input.reason ?? null,
        expires_at: input.expiresAt ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async getBalance(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('credits')
      .select('amount, expires_at')
      .eq('organization_id', organizationId)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
    if (error) throw error
    return (data || []).reduce((sum: number, row: any) => sum + Number(row.amount), 0)
  }

  async softDelete(organizationId: string, id: string) {
    const { error } = await supabaseAdmin
      .from('credits')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)
    if (error) throw error
  }
}
