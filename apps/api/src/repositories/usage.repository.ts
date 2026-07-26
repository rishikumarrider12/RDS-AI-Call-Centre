import { supabaseAdmin } from '../lib/supabase'

export interface UsageRecordRow {
  id: string
  organization_id: string
  record_date: string
  ai_minutes: number
  telephony_minutes: number
  calls_count: number
  storage_bytes: number
  stt_minutes: number
  tts_characters: number
  created_at: string
  updated_at: string
}

export class UsageRepository {
  async list(organizationId: string, options: { dateFrom?: string; dateTo?: string; page?: number; pageSize?: number }) {
    const page = options.page && options.page > 0 ? options.page : 1
    const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 31
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabaseAdmin
      .from('usage_records')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('record_date', { ascending: false })
      .range(from, to)

    if (options.dateFrom) query = query.gte('record_date', options.dateFrom)
    if (options.dateTo) query = query.lte('record_date', options.dateTo)

    const { data, error, count } = await query
    if (error) throw error
    return {
      usage: (data || []) as UsageRecordRow[],
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async getLatest(organizationId: string, days = 30) {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data, error } = await supabaseAdmin
      .from('usage_records')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('record_date', since.toISOString().slice(0, 10))
      .order('record_date', { ascending: true })

    if (error) throw error
    return (data || []) as UsageRecordRow[]
  }

  async upsert(organizationId: string, input: {
    recordDate: string
    aiMinutes: number
    telephonyMinutes: number
    callsCount: number
    storageBytes: number
    sttMinutes: number
    ttsCharacters: number
  }) {
    const { data, error } = await supabaseAdmin
      .from('usage_records')
      .upsert({
        organization_id: organizationId,
        record_date: input.recordDate,
        ai_minutes: input.aiMinutes,
        telephony_minutes: input.telephonyMinutes,
        calls_count: input.callsCount,
        storage_bytes: input.storageBytes,
        stt_minutes: input.sttMinutes,
        tts_characters: input.ttsCharacters,
      }, { onConflict: 'organization_id,record_date' })
      .select()
      .single()

    if (error) throw error
    return data
  }
}
