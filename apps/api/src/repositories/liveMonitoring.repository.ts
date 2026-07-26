import { supabaseAdmin } from '../lib/supabase'

export interface LiveEventRow {
  id: string
  organization_id: string
  call_id: string | null
  agent_id: string | null
  event_type: string
  payload: Record<string, unknown>
  severity: string
  created_at: string
}

export interface AgentSessionRow {
  id: string
  organization_id: string
  agent_id: string
  status: string
  current_call_id: string | null
  active_calls_count: number
  completed_calls_count: number
  failed_calls_count: number
  total_talk_seconds: number
  last_activity_at: string | null
  created_at: string
  updated_at: string
}

export class LiveMonitoringRepository {
  async addLiveEvent(organizationId: string, input: {
    callId?: string | null
    agentId?: string | null
    eventType: string
    payload: Record<string, unknown>
    severity?: string
  }) {
    const { data, error } = await supabaseAdmin
      .from('live_events')
      .insert({
        organization_id: organizationId,
        call_id: input.callId || null,
        agent_id: input.agentId || null,
        event_type: input.eventType,
        payload: input.payload,
        severity: input.severity || 'info',
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getLiveEvents(organizationId: string, limit = 100, since?: string) {
    let query = supabaseAdmin
      .from('live_events')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (since) {
      query = query.gte('created_at', since)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []) as LiveEventRow[]
  }

  async getAgentSession(organizationId: string, agentId: string) {
    const { data, error } = await supabaseAdmin
      .from('agent_sessions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('agent_id', agentId)
      .maybeSingle()

    if (error) throw error
    return data as AgentSessionRow | null
  }

  async upsertAgentSession(organizationId: string, input: {
    agentId: string
    status?: string
    currentCallId?: string | null
    activeCallsCount?: number
    completedCallsCount?: number
    failedCallsCount?: number
    totalTalkSeconds?: number
  }) {
    const payload: any = {
      organization_id: organizationId,
      agent_id: input.agentId,
      status: input.status || 'idle',
      current_call_id: input.currentCallId || null,
      active_calls_count: input.activeCallsCount ?? 0,
      completed_calls_count: input.completedCallsCount ?? 0,
      failed_calls_count: input.failedCallsCount ?? 0,
      total_talk_seconds: input.totalTalkSeconds ?? 0,
      last_activity_at: new Date().toISOString(),
    }

    const { data, error } = await supabaseAdmin
      .from('agent_sessions')
      .upsert(payload, { onConflict: 'agent_id' })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async listAgentSessions(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('agent_sessions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return (data || []) as AgentSessionRow[]
  }

  async saveSnapshot(organizationId: string, snapshotType: string, data: Record<string, unknown>, ttlMinutes = 5) {
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes)

    const { error } = await supabaseAdmin
      .from('dashboard_snapshots')
      .insert({
        organization_id: organizationId,
        snapshot_type: snapshotType,
        data,
        expires_at: expiresAt.toISOString(),
      })

    if (error) throw error
  }

  async getSnapshot(organizationId: string, snapshotType: string) {
    const { data, error } = await supabaseAdmin
      .from('dashboard_snapshots')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('snapshot_type', snapshotType)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw error
    return data?.[0] || null
  }
}
