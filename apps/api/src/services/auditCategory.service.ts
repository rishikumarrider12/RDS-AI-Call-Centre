import { AuditCategoryRepository } from '../repositories/auditCategory.repository'
import type { AuditCategory } from '@rds/types'
import { recordAudit } from '../lib/audit'

export class AuditCategoryService {
  private repository = new AuditCategoryRepository()

  private toCategory(row: any): AuditCategory {
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      slug: row.slug,
      description: row.description ?? null,
      color: row.color,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async list(organizationId: string): Promise<AuditCategory[]> {
    const rows = await this.repository.list(organizationId)
    return rows.map((r: any) => this.toCategory(r))
  }

  async getById(organizationId: string, id: string): Promise<AuditCategory> {
    const row = await this.repository.findById(organizationId, id)
    if (!row) throw new Error('Audit category not found')
    return this.toCategory(row)
  }

  async getBySlug(organizationId: string, slug: string): Promise<AuditCategory | null> {
    const row = await this.repository.findBySlug(organizationId, slug)
    return row ? this.toCategory(row) : null
  }

  async create(organizationId: string, actorId: string, input: {
    name: string
    slug: string
    description?: string | null
    color?: string
    isActive?: boolean
  }): Promise<AuditCategory> {
    const row = await this.repository.create(organizationId, input)

    await recordAudit({
      organizationId,
      action: 'audit_category.created',
      actorId,
      actorType: 'user',
      resourceType: 'audit_category',
      resourceId: row.id,
      after: row as unknown as Record<string, unknown>,
    })

    return this.toCategory(row)
  }

  async update(organizationId: string, actorId: string, id: string, input: {
    name?: string
    slug?: string
    description?: string | null
    color?: string
    isActive?: boolean
  }): Promise<AuditCategory> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Audit category not found')

    const row = await this.repository.update(id, input)

    await recordAudit({
      organizationId,
      action: 'audit_category.updated',
      actorId,
      actorType: 'user',
      resourceType: 'audit_category',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
      after: row as unknown as Record<string, unknown>,
    })

    return this.toCategory(row)
  }

  async delete(organizationId: string, actorId: string, id: string): Promise<void> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Audit category not found')
    await this.repository.softDelete(id)

    await recordAudit({
      organizationId,
      action: 'audit_category.deleted',
      actorId,
      actorType: 'user',
      resourceType: 'audit_category',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
    })
  }
}
