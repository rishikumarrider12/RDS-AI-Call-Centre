import { supabaseAdmin } from '../lib/supabase'
import type { AlertCondition, AlertSeverity } from '@rds/types'

export interface AlertRuleRow {
  id: string
  organizationId: string
  name: string
  description: string | null
  metric: string
  condition: AlertCondition
  threshold: number
  windowSeconds: number
  severity: AlertSeverity
  isActive: boolean
  channels: Record<string, unknown>[]
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface AlertHistoryRow {
  id: string
  organizationId: string
  ruleId: string | null
  severity: AlertSeverity
  metric: string
  value: number
  threshold: number
  message: string
  status: string
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

export class AlertRepository {
  async listRules(organizationId: string) {
    const { data, error } = await supabaseAdmin
      .from('alert_rules')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map((row: any) => ({
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      description: row.description ?? null,
      metric: row.metric,
      condition: row.condition,
      threshold: Number(row.threshold),
      windowSeconds: row.window_seconds,
      severity: row.severity,
      isActive: row.is_active,
      channels: row.channels ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    })) as AlertRuleRow[]
  }

  async getRule(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('alert_rules')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    return {
      id: data.id,
      organizationId: data.organization_id,
      name: data.name,
      description: data.description ?? null,
      metric: data.metric,
      condition: data.condition,
      threshold: Number(data.threshold),
      windowSeconds: data.window_seconds,
      severity: data.severity,
      isActive: data.is_active,
      channels: data.channels ?? [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      deletedAt: data.deleted_at,
    } as AlertRuleRow
  }

  async createRule(organizationId: string, input: {
    name: string
    description?: string | null
    metric: string
    condition: string
    threshold: number
    windowSeconds?: number
    severity?: string
    channels?: Record<string, unknown>[]
  }) {
    const { data, error } = await supabaseAdmin
      .from('alert_rules')
      .insert({
        organization_id: organizationId,
        name: input.name,
        description: input.description ?? null,
        metric: input.metric,
        condition: input.condition,
        threshold: input.threshold,
        window_seconds: input.windowSeconds ?? 60,
        severity: input.severity ?? 'warning',
        channels: input.channels ?? [],
      })
      .select()
      .single()

    if (error) throw error
    return {
      id: data.id,
      organizationId: data.organization_id,
      name: data.name,
      description: data.description ?? null,
      metric: data.metric,
      condition: data.condition,
      threshold: Number(data.threshold),
      windowSeconds: data.window_seconds,
      severity: data.severity,
      isActive: data.is_active,
      channels: data.channels ?? [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      deletedAt: data.deleted_at,
    } as AlertRuleRow
  }

  async updateRule(organizationId: string, id: string, input: {
    name?: string
    description?: string | null
    metric?: string
    condition?: string
    threshold?: number
    windowSeconds?: number
    severity?: string
    isActive?: boolean
    channels?: Record<string, unknown>[]
  }) {
    const payload: Record<string, unknown> = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.description !== undefined) payload.description = input.description
    if (input.metric !== undefined) payload.metric = input.metric
    if (input.condition !== undefined) payload.condition = input.condition
    if (input.threshold !== undefined) payload.threshold = input.threshold
    if (input.windowSeconds !== undefined) payload.window_seconds = input.windowSeconds
    if (input.severity !== undefined) payload.severity = input.severity
    if (input.isActive !== undefined) payload.is_active = input.isActive
    if (input.channels !== undefined) payload.channels = input.channels

    const { data, error } = await supabaseAdmin
      .from('alert_rules')
      .update(payload)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (error) throw error
    return {
      id: data.id,
      organizationId: data.organization_id,
      name: data.name,
      description: data.description ?? null,
      metric: data.metric,
      condition: data.condition,
      threshold: Number(data.threshold),
      windowSeconds: data.window_seconds,
      severity: data.severity,
      isActive: data.is_active,
      channels: data.channels ?? [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      deletedAt: data.deleted_at,
    } as AlertRuleRow
  }

  async deleteRule(organizationId: string, id: string) {
    const { error } = await supabaseAdmin
      .from('alert_rules')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (error) throw error
  }

  async listHistory(organizationId: string, options: { status?: string; ruleId?: string; page?: number; pageSize?: number } = {}) {
    const page = options.page && options.page > 0 ? options.page : 1
    const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 25
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabaseAdmin
      .from('alert_history')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (options.status) query = query.eq('status', options.status)
    if (options.ruleId) query = query.eq('rule_id', options.ruleId)

    const { data, error, count } = await query
    if (error) throw error

    return {
      alerts: (data || []).map((row: any) => ({
        id: row.id,
        organizationId: row.organization_id,
        ruleId: row.rule_id,
        severity: row.severity,
        metric: row.metric,
        value: Number(row.value),
        threshold: Number(row.threshold),
        message: row.message,
        status: row.status,
        resolvedAt: row.resolved_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })) as AlertHistoryRow[],
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async createHistory(organizationId: string, input: {
    ruleId?: string | null
    severity: string
    metric: string
    value: number
    threshold: number
    message: string
    status?: string
  }) {
    const { data, error } = await supabaseAdmin
      .from('alert_history')
      .insert({
        organization_id: organizationId,
        rule_id: input.ruleId ?? null,
        severity: input.severity,
        metric: input.metric,
        value: input.value,
        threshold: input.threshold,
        message: input.message,
        status: input.status ?? 'firing',
      })
      .select()
      .single()

    if (error) throw error
    return {
      id: data.id,
      organizationId: data.organization_id,
      ruleId: data.rule_id,
      severity: data.severity,
      metric: data.metric,
      value: Number(data.value),
      threshold: Number(data.threshold),
      message: data.message,
      status: data.status,
      resolvedAt: data.resolved_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as AlertHistoryRow
  }

  async resolveAlert(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('alert_history')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (error) throw error
    return {
      id: data.id,
      organizationId: data.organization_id,
      ruleId: data.rule_id,
      severity: data.severity,
      metric: data.metric,
      value: Number(data.value),
      threshold: Number(data.threshold),
      message: data.message,
      status: data.status,
      resolvedAt: data.resolved_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as AlertHistoryRow
  }
}
