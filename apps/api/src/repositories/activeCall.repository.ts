import { supabaseAdmin } from '../lib/supabase'

export interface ActiveCallRow {
  id: string
  organization_id: string
  call_id: string
  agent_id: string | null
  contact_id: string | null
  campaign_id: string | null
  call_queue_id: string | null
  direction: string
  status: string
  to_number: string
  from_number: string
  duration_seconds: number
  started_at: string | null
  answered_at: string | null
  created_at: string
  updated_at: string
}

export interface ActiveCall {
  id: string
  organizationId: string
  callId: string
  agentId: string | null
  contactId: string | null
  campaignId: string | null
  callQueueId: string | null
  direction: 'outbound' | 'inbound'
  status: 'queued' | 'ringing' | 'connected' | 'ended' | 'failed' | 'no-answer' | 'busy' | 'paused' | 'transferred'
  toNumber: string
  fromNumber: string
  durationSeconds: number
  startedAt: string | null
  answeredAt: string | null
  createdAt: string
  updatedAt: string
}

export class ActiveCallRepository {
  async upsertFromCall(organizationId: string, call: any) {
    const payload:any = {
      organization_id: organizationId,
      call_id: call.id,
      agent_id: call.agent_id,
      contact_id: call.contact_id,
      campaign_id: call.campaign_id,
      call_queue_id: call.call_queue_id,
      direction: call.direction,
      status: call.status,
      to_number: call.to_number,
      from_number: call.from_number,
      duration_seconds: call.duration_seconds || 0,
      started_at: call.start_at,
      answered_at: call.answer_at,
    }

    const { data, error } = await supabaseAdmin
      .from('active_calls')
      .upsert(payload, { onConflict: 'call_id' })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async list(organizationId: string, status?: string) {
    let query = supabaseAdmin
      .from('active_calls')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []) as ActiveCallRow[]
  }

  async remove(callId: string) {
    const { error } = await supabaseAdmin
      .from('active_calls')
      .delete()
      .eq('call_id', callId)

    if (error) throw error
  }

  async getStats(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('active_calls')
      .select('status, duration_seconds')
      .eq('organization_id', organizationId)

    if (error) throw error

    const stats = {
      total: (data || []).length,
      queued: 0,
      ringing: 0,
      connected: 0,
      paused: 0,
      waiting: 0,
      avgDuration: 0,
    }

    const durations: number[] = []
    for (const row of data || []) {
      if (row.status === 'queued') stats.queued++
      else if (row.status === 'ringing') stats.ringing++
      else if (row.status === 'connected') stats.connected++
      else if (row.status === 'paused') stats.paused++
      if (row.status === 'queued' || row.status === 'ringing') stats.waiting++
      if (row.duration_seconds > 0) durations.push(row.duration_seconds)
    }

    if (durations.length > 0) {
      stats.avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    }

    return stats
  }
}
