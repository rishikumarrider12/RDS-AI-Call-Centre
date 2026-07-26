import { CompliancePolicyRepository } from '../repositories/compliancePolicy.repository'
import type { CompliancePolicy } from '@rds/types'
import { recordAudit } from '../lib/audit'

export class CompliancePolicyService {
  private repository = new CompliancePolicyRepository()

  private toPolicy(row: any): CompliancePolicy {
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      framework: row.framework,
      description: row.description ?? null,
      requirements: row.requirements ?? [],
      controls: row.controls ?? [],
      status: row.status,
      effectiveAt: row.effective_at ?? null,
      reviewedAt: row.reviewed_at ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async list(organizationId: string): Promise<CompliancePolicy[]> {
    const rows = await this.repository.list(organizationId)
    return rows.map((r: any) => this.toPolicy(r))
  }

  async getById(organizationId: string, id: string): Promise<CompliancePolicy> {
    const row = await this.repository.findById(organizationId, id)
    if (!row) throw new Error('Compliance policy not found')
    return this.toPolicy(row)
  }

  async create(organizationId: string, actorId: string, input: {
    name: string
    framework: string
    description?: string | null
    requirements?: Record<string, unknown>[]
    controls?: Record<string, unknown>[]
    status?: string
    effectiveAt?: string | null
    reviewedAt?: string | null
  }): Promise<CompliancePolicy> {
    const row = await this.repository.create(organizationId, input)

    await recordAudit({
      organizationId,
      action: 'compliance_policy.created',
      actorId,
      actorType: 'user',
      resourceType: 'compliance_policy',
      resourceId: row.id,
      after: row as unknown as Record<string, unknown>,
    })

    return this.toPolicy(row)
  }

  async update(organizationId: string, actorId: string, id: string, input: {
    name?: string
    framework?: string
    description?: string | null
    requirements?: Record<string, unknown>[]
    controls?: Record<string, unknown>[]
    status?: string
    effectiveAt?: string | null
    reviewedAt?: string | null
  }): Promise<CompliancePolicy> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Compliance policy not found')

    const row = await this.repository.update(id, input)

    await recordAudit({
      organizationId,
      action: 'compliance_policy.updated',
      actorId,
      actorType: 'user',
      resourceType: 'compliance_policy',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
      after: row as unknown as Record<string, unknown>,
    })

    return this.toPolicy(row)
  }

  async delete(organizationId: string, actorId: string, id: string): Promise<void> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Compliance policy not found')
    await this.repository.softDelete(id)

    await recordAudit({
      organizationId,
      action: 'compliance_policy.deleted',
      actorId,
      actorType: 'user',
      resourceType: 'compliance_policy',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
    })
  }
}
