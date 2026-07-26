import { SecurityIncidentRepository } from '../repositories/securityIncident.repository'
import type { SecurityIncident } from '@rds/types'
import { recordAudit } from '../lib/audit'

export class SecurityIncidentService {
  private repository = new SecurityIncidentRepository()

  private toIncident(row: any): SecurityIncident {
    return {
      id: row.id,
      organizationId: row.organization_id,
      title: row.title,
      description: row.description ?? null,
      severity: row.severity,
      status: row.status,
      reportedById: row.reported_by ?? null,
      assignedToId: row.assigned_to ?? null,
      occurredAt: row.occurred_at ?? null,
      resolvedAt: row.resolved_at ?? null,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async list(organizationId: string): Promise<SecurityIncident[]> {
    const rows = await this.repository.list(organizationId)
    return rows.map((r: any) => this.toIncident(r))
  }

  async getById(organizationId: string, id: string): Promise<SecurityIncident> {
    const row = await this.repository.findById(organizationId, id)
    if (!row) throw new Error('Security incident not found')
    return this.toIncident(row)
  }

  async create(organizationId: string, actorId: string, input: {
    title: string
    description?: string | null
    severity?: string
    reportedBy?: string | null
    assignedTo?: string | null
    occurredAt?: string | null
    metadata?: Record<string, unknown>
  }): Promise<SecurityIncident> {
    const row = await this.repository.create(organizationId, input)

    await recordAudit({
      organizationId,
      action: 'security_incident.reported',
      actorId,
      actorType: 'user',
      resourceType: 'security_incident',
      resourceId: row.id,
      after: row as unknown as Record<string, unknown>,
    })

    return this.toIncident(row)
  }

  async update(organizationId: string, actorId: string, id: string, input: {
    title?: string
    description?: string | null
    severity?: string
    status?: string
    assignedTo?: string | null
    occurredAt?: string | null
    resolvedAt?: string | null
    metadata?: Record<string, unknown>
  }): Promise<SecurityIncident> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Security incident not found')

    const row = await this.repository.update(id, input)

    await recordAudit({
      organizationId,
      action: 'security_incident.updated',
      actorId,
      actorType: 'user',
      resourceType: 'security_incident',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
      after: row as unknown as Record<string, unknown>,
    })

    return this.toIncident(row)
  }

  async resolve(organizationId: string, actorId: string, id: string): Promise<SecurityIncident> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Security incident not found')

    const row = await this.repository.update(id, {
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
    })

    await recordAudit({
      organizationId,
      action: 'security_incident.resolved',
      actorId,
      actorType: 'user',
      resourceType: 'security_incident',
      resourceId: id,
      after: row as unknown as Record<string, unknown>,
    })

    return this.toIncident(row)
  }

  async delete(organizationId: string, actorId: string, id: string): Promise<void> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Security incident not found')
    await this.repository.softDelete(id)

    await recordAudit({
      organizationId,
      action: 'security_incident.deleted',
      actorId,
      actorType: 'user',
      resourceType: 'security_incident',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
    })
  }
}
