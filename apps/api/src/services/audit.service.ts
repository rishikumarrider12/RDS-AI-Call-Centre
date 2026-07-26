import { AuditRepository } from '../repositories/audit.repository'
import type { AuditLog } from '@rds/types'

export class AuditService {
  private repository = new AuditRepository()

  private toLog(row: any): AuditLog {
    return {
      id: row.id,
      organizationId: row.organization_id,
      actorId: row.actor_id ?? null,
      actorName: row.actor_name ?? null,
      actorEmail: row.actor_email ?? null,
      action: row.action,
      actorType: row.actor_type,
      resourceType: row.resource_type ?? null,
      resourceId: row.resource_id ?? null,
      ipAddress: row.ip_address ?? null,
      before: row.before ?? null,
      after: row.after ?? null,
      createdAt: row.created_at,
    }
  }

  async list(
    organizationId: string,
    options: {
      action?: string
      actorType?: string
      resourceType?: string
      search?: string
      dateFrom?: string
      dateTo?: string
      page?: number
      pageSize?: number
    }
  ) {
    const result = await this.repository.list(organizationId, options)
    return {
      data: result.logs.map((l: any) => this.toLog(l)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    }
  }

  async exportRows(
    organizationId: string,
    options: {
      action?: string
      actorType?: string
      resourceType?: string
      search?: string
      dateFrom?: string
      dateTo?: string
    }
  ): Promise<AuditLog[]> {
    const rows = await this.repository.exportRows(organizationId, options)
    return rows.map((l: any) => this.toLog(l))
  }

  async distinctActions(organizationId: string): Promise<string[]> {
    return this.repository.getDistinctActions(organizationId)
  }
}
