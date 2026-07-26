import { ComplianceRepository } from '../repositories/compliance.repository'
import { recordAudit } from '../lib/audit'
import type {
  ConsentRecord,
  DndEntry,
  RetentionPolicy,
  DataExportRequest,
  DataDeletionRequest,
  ComplianceStatus,
  AuditSummary,
} from '@rds/types'

export const DEFAULT_DISCLOSURE_TEXT =
  'This call may be recorded and processed by an automated AI system for quality and service purposes. ' +
  'By remaining on the line you consent to this recording and processing.'

export class ComplianceService {
  private repository = new ComplianceRepository()

  // ---- Status ----
  async getStatus(organizationId: string): Promise<ComplianceStatus> {
    const flags = await this.repository.getOrgComplianceFlags(organizationId)
    return {
      dndCheckEnabled: flags.dndCheckEnabled,
      consentRequired: flags.consentRequired,
      auditImmutable: true, // enforced by the audit_logs append-only trigger
      piiMaskingEnabled: true, // enforced by logger serializers
      hstsEnforced: process.env.NODE_ENV === 'production',
      encryptionAtRest: !!process.env.FIELD_ENCRYPTION_KEY && process.env.NODE_ENV === 'production',
    }
  }

  // ---- Consent (5.4) ----
  async recordConsent(input: {
    organizationId: string
    actorId?: string | null
    actorName?: string | null
    actorEmail?: string | null
    contactId?: string | null
    campaignId?: string | null
    callId?: string | null
    consented?: boolean
    method?: string
    disclosureText?: string | null
    ipAddress?: string | null
  }): Promise<ConsentRecord> {
    const record = await this.repository.recordConsent({
      organizationId: input.organizationId,
      contactId: input.contactId,
      campaignId: input.campaignId,
      callId: input.callId,
      consented: input.consented,
      method: input.method,
      disclosureText: input.disclosureText,
      ipAddress: input.ipAddress,
    })
    await recordAudit({
      organizationId: input.organizationId,
      action: record.consented ? 'consent.granted' : 'consent.declined',
      actorId: input.actorId,
      actorName: input.actorName,
      actorEmail: input.actorEmail,
      actorType: 'system',
      resourceType: 'consent',
      resourceId: record.id,
    })
    return record
  }

  async getConsentForContact(organizationId: string, contactId: string): Promise<ConsentRecord[]> {
    return this.repository.getConsentForContact(organizationId, contactId)
  }

  // ---- DND (5.5) ----
  async listDnd(
    organizationId: string,
    options: { page?: number; pageSize?: number; search?: string } = {}
  ) {
    return this.repository.listDnd(organizationId, options)
  }

  async checkDnd(organizationId: string, phone: string): Promise<{ blocked: boolean }> {
    const blocked = await this.repository.checkDnd(organizationId, phone)
    return { blocked }
  }

  async addDnd(input: {
    organizationId: string
    actorId?: string | null
    actorName?: string | null
    actorEmail?: string | null
    phone: string
    source?: string | null
    reason?: string | null
  }): Promise<DndEntry> {
    const entry = await this.repository.addDnd({
      organizationId: input.organizationId,
      phone: input.phone,
      source: input.source,
      reason: input.reason,
    })
    await recordAudit({
      organizationId: input.organizationId,
      action: 'dnd.added',
      actorId: input.actorId,
      actorName: input.actorName,
      actorEmail: input.actorEmail,
      resourceType: 'dnd',
      resourceId: entry.id,
      after: { phone: entry.phone },
    })
    return entry
  }

  async removeDnd(input: {
    organizationId: string
    actorId?: string | null
    actorName?: string | null
    actorEmail?: string | null
    phone: string
  }): Promise<void> {
    await this.repository.removeDnd(input.organizationId, input.phone)
    await recordAudit({
      organizationId: input.organizationId,
      action: 'dnd.removed',
      actorId: input.actorId,
      actorName: input.actorName,
      actorEmail: input.actorEmail,
      resourceType: 'dnd',
      after: { phone: input.phone },
    })
  }

  // ---- Retention (5.8) ----
  async getRetentionPolicies(organizationId: string): Promise<RetentionPolicy[]> {
    return this.repository.getRetentionPolicies(organizationId)
  }

  async upsertRetentionPolicy(input: {
    organizationId: string
    actorId?: string | null
    actorName?: string | null
    actorEmail?: string | null
    resourceType: string
    retentionDays: number
    action?: string
  }): Promise<RetentionPolicy> {
    const policy = await this.repository.upsertRetentionPolicy({
      organizationId: input.organizationId,
      resourceType: input.resourceType,
      retentionDays: input.retentionDays,
      action: input.action,
    })
    await recordAudit({
      organizationId: input.organizationId,
      action: 'retention.updated',
      actorId: input.actorId,
      actorName: input.actorName,
      actorEmail: input.actorEmail,
      resourceType: 'retention_policy',
      resourceId: policy.id,
      after: { resourceType: policy.resourceType, retentionDays: policy.retentionDays, action: policy.action },
    })
    return policy
  }

  // ---- Data subject requests (5.9) ----
  async requestExport(input: {
    organizationId: string
    requestedBy: string
  }): Promise<DataExportRequest> {
    const request = await this.repository.createExportRequest(input.organizationId, input.requestedBy)
    await recordAudit({
      organizationId: input.organizationId,
      action: 'data_export.requested',
      actorId: input.requestedBy,
      actorType: 'user',
      resourceType: 'data_export',
      resourceId: request.id,
    })
    return request
  }

  async getExport(organizationId: string, id: string): Promise<DataExportRequest | null> {
    return this.repository.getExportRequest(organizationId, id)
  }

  async requestDeletion(input: {
    organizationId: string
    requestedBy: string
    scope?: string | null
  }): Promise<DataDeletionRequest> {
    const request = await this.repository.createDeletionRequest(
      input.organizationId,
      input.requestedBy,
      input.scope
    )
    await recordAudit({
      organizationId: input.organizationId,
      action: 'data_deletion.requested',
      actorId: input.requestedBy,
      actorType: 'user',
      resourceType: 'data_deletion',
      resourceId: request.id,
      after: { scope: request.scope },
    })
    return request
  }

  async getDeletion(organizationId: string, id: string): Promise<DataDeletionRequest | null> {
    return this.repository.getDeletionRequest(organizationId, id)
  }

  // ---- Audit summary (5.6) ----
  async getAuditSummary(organizationId: string): Promise<AuditSummary> {
    return this.repository.getAuditSummary(organizationId)
  }
}
