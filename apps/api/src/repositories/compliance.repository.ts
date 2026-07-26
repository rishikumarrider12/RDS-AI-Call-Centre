import { supabaseAdmin } from '../lib/supabase'
import type {
  ConsentRecord,
  DndEntry,
  RetentionPolicy,
  DataExportRequest,
  DataDeletionRequest,
} from '@rds/types'

export class ComplianceRepository {
  // ---- Consent (5.4) ----
  async recordConsent(input: {
    organizationId: string
    contactId?: string | null
    campaignId?: string | null
    callId?: string | null
    consented?: boolean
    method?: string
    disclosureText?: string | null
    ipAddress?: string | null
    disclosedAt?: string | null
  }): Promise<ConsentRecord> {
    const { data, error } = await supabaseAdmin
      .from('consent_records')
      .insert({
        organization_id: input.organizationId,
        contact_id: input.contactId ?? null,
        campaign_id: input.campaignId ?? null,
        call_id: input.callId ?? null,
        consented: input.consented ?? true,
        method: input.method ?? 'automated_disclosure',
        disclosure_text: input.disclosureText ?? null,
        ip_address: input.ipAddress ?? null,
        disclosed_at: input.disclosedAt ?? new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw error
    return this.toConsent(data)
  }

  async getConsentForContact(organizationId: string, contactId: string): Promise<ConsentRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('consent_records')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map((r) => this.toConsent(r))
  }

  // ---- DND registry (5.5) ----
  async listDnd(
    organizationId: string,
    options: { page?: number; pageSize?: number; search?: string } = {}
  ): Promise<{ entries: DndEntry[]; total: number; page: number; pageSize: number }> {
    const page = options.page && options.page > 0 ? options.page : 1
    const pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 25
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabaseAdmin
      .from('dnd_entries')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (options.search && options.search.trim()) {
      query = query.ilike('phone', `%${options.search.trim()}%`)
    }

    const { data, error, count } = await query
    if (error) throw error
    return {
      entries: (data || []).map((r) => this.toDnd(r)),
      total: count ?? 0,
      page,
      pageSize,
    }
  }

  async checkDnd(organizationId: string, phone: string): Promise<boolean> {
    const normalized = phone.replace(/\D/g, '')
    if (!normalized) return false
    const { data, error } = await supabaseAdmin
      .from('dnd_entries')
      .select('id')
      .eq('organization_id', organizationId)
      .or(`phone.eq.${phone},phone.eq.${normalized}`)
      .is('expires_at', null)
      .limit(1)
    if (error) throw error
    return (data || []).length > 0
  }

  async addDnd(input: {
    organizationId: string
    phone: string
    source?: string | null
    reason?: string | null
  }): Promise<DndEntry> {
    const { data, error } = await supabaseAdmin
      .from('dnd_entries')
      .upsert(
        {
          organization_id: input.organizationId,
          phone: input.phone,
          source: input.source ?? 'manual',
          reason: input.reason ?? null,
          expires_at: null,
        },
        { onConflict: 'organization_id,phone' }
      )
      .select()
      .single()
    if (error) throw error
    return this.toDnd(data)
  }

  async removeDnd(organizationId: string, phone: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('dnd_entries')
      .delete()
      .eq('organization_id', organizationId)
      .eq('phone', phone)
    if (error) throw error
  }

  // ---- Retention policies (5.8) ----
  async getRetentionPolicies(organizationId: string): Promise<RetentionPolicy[]> {
    const { data, error } = await supabaseAdmin
      .from('retention_policies')
      .select('*')
      .eq('organization_id', organizationId)
      .order('resource_type', { ascending: true })
    if (error) throw error
    return (data || []).map((r) => this.toRetention(r))
  }

  async upsertRetentionPolicy(input: {
    organizationId: string
    resourceType: string
    retentionDays: number
    action?: string
  }): Promise<RetentionPolicy> {
    const { data, error } = await supabaseAdmin
      .from('retention_policies')
      .upsert(
        {
          organization_id: input.organizationId,
          resource_type: input.resourceType,
          retention_days: input.retentionDays,
          action: input.action ?? 'delete',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id,resource_type' }
      )
      .select()
      .single()
    if (error) throw error
    return this.toRetention(data)
  }

  // ---- Data subject requests (5.9) ----
  async createExportRequest(organizationId: string, requestedBy: string): Promise<DataExportRequest> {
    const { data, error } = await supabaseAdmin
      .from('data_export_requests')
      .insert({
        organization_id: organizationId,
        requested_by: requestedBy,
        status: 'requested',
      })
      .select()
      .single()
    if (error) throw error
    return this.toExport(data)
  }

  async getExportRequest(organizationId: string, id: string): Promise<DataExportRequest | null> {
    const { data, error } = await supabaseAdmin
      .from('data_export_requests')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data ? this.toExport(data) : null
  }

  async createDeletionRequest(organizationId: string, requestedBy: string, scope?: string | null): Promise<DataDeletionRequest> {
    const { data, error } = await supabaseAdmin
      .from('data_deletion_requests')
      .insert({
        organization_id: organizationId,
        requested_by: requestedBy,
        status: 'requested',
        scope: scope ?? 'all',
      })
      .select()
      .single()
    if (error) throw error
    return this.toDeletion(data)
  }

  async getDeletionRequest(organizationId: string, id: string): Promise<DataDeletionRequest | null> {
    const { data, error } = await supabaseAdmin
      .from('data_deletion_requests')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data ? this.toDeletion(data) : null
  }

  // ---- Org compliance flags (reuses existing organization_settings) ----
  async getOrgComplianceFlags(organizationId: string): Promise<{
    dndCheckEnabled: boolean
    consentRequired: boolean
  }> {
    const { data, error } = await supabaseAdmin
      .from('organization_settings')
      .select('compliance_dnd_check, compliance_consent_required')
      .eq('organization_id', organizationId)
      .maybeSingle()
    if (error) throw error
    return {
      dndCheckEnabled: data?.compliance_dnd_check ?? false,
      consentRequired: data?.compliance_consent_required ?? false,
    }
  }

  // ---- Audit summary (5.6) ----
  async getAuditSummary(organizationId: string): Promise<{
    total: number
    byAction: Array<{ action: string; count: number }>
    oldestAt: string | null
    newestAt: string | null
  }> {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('action, created_at')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
    if (error) throw error
    const rows = data || []
    const counts = new Map<string, number>()
    let oldest: string | null = null
    let newest: string | null = null
    for (const r of rows) {
      counts.set(r.action, (counts.get(r.action) || 0) + 1)
      if (!oldest || r.created_at < oldest) oldest = r.created_at
      if (!newest || r.created_at > newest) newest = r.created_at
    }
    const byAction = Array.from(counts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
    return { total: rows.length, byAction, oldestAt: oldest, newestAt: newest }
  }

  // ---- Mappers ----
  private toConsent(r: any): ConsentRecord {
    return {
      id: r.id,
      organizationId: r.organization_id,
      contactId: r.contact_id ?? null,
      campaignId: r.campaign_id ?? null,
      callId: r.call_id ?? null,
      consented: r.consented,
      method: r.method,
      disclosedAt: r.disclosed_at ?? null,
      disclosureText: r.disclosure_text ?? null,
      ipAddress: r.ip_address ?? null,
      createdAt: r.created_at,
    }
  }

  private toDnd(r: any): DndEntry {
    return {
      id: r.id,
      organizationId: r.organization_id,
      phone: r.phone,
      source: r.source ?? null,
      reason: r.reason ?? null,
      createdAt: r.created_at,
      expiresAt: r.expires_at ?? null,
    }
  }

  private toRetention(r: any): RetentionPolicy {
    return {
      id: r.id,
      organizationId: r.organization_id,
      resourceType: r.resource_type,
      retentionDays: r.retention_days,
      action: r.action,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }
  }

  private toExport(r: any): DataExportRequest {
    return {
      id: r.id,
      organizationId: r.organization_id,
      requestedBy: r.requested_by,
      status: r.status,
      requestedAt: r.requested_at,
      completedAt: r.completed_at ?? null,
      downloadUrl: r.download_url ?? null,
    }
  }

  private toDeletion(r: any): DataDeletionRequest {
    return {
      id: r.id,
      organizationId: r.organization_id,
      requestedBy: r.requested_by,
      status: r.status,
      requestedAt: r.requested_at,
      completedAt: r.completed_at ?? null,
      scope: r.scope ?? null,
    }
  }
}
