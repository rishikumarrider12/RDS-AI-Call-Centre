import { NotificationTemplateRepository } from '../repositories/notificationTemplate.repository'
import type { NotificationTemplate } from '@rds/types'
import { recordAudit } from '../lib/audit'

export class NotificationTemplateService {
  private repository = new NotificationTemplateRepository()

  private toTemplate(row: any): NotificationTemplate {
    return {
      id: row.id,
      organizationId: row.organization_id,
      channelId: row.channel_id,
      name: row.name,
      subject: row.subject ?? null,
      body: row.body,
      variables: row.variables ?? [],
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async list(organizationId: string, channelId?: string): Promise<NotificationTemplate[]> {
    const rows = await this.repository.list(organizationId, channelId)
    return rows.map((r: any) => this.toTemplate(r))
  }

  async getById(organizationId: string, id: string): Promise<NotificationTemplate> {
    const row = await this.repository.findById(organizationId, id)
    if (!row) throw new Error('Notification template not found')
    return this.toTemplate(row)
  }

  async create(organizationId: string, createdById: string, input: {
    channelId: string
    name: string
    subject?: string | null
    body: string
    variables?: string[]
    isActive?: boolean
  }): Promise<NotificationTemplate> {
    const row = await this.repository.create(organizationId, input)

    await recordAudit({
      organizationId,
      action: 'notification_template.create',
      actorId: createdById,
      resourceType: 'notification_template',
      resourceId: row.id,
      after: row as unknown as Record<string, unknown>,
    })

    return this.toTemplate(row)
  }

  async update(organizationId: string, createdById: string, id: string, input: {
    channelId?: string
    name?: string
    subject?: string | null
    body?: string
    variables?: string[]
    isActive?: boolean
  }): Promise<NotificationTemplate> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Notification template not found')

    const row = await this.repository.update(id, input)

    await recordAudit({
      organizationId,
      action: 'notification_template.update',
      actorId: createdById,
      resourceType: 'notification_template',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
      after: row as unknown as Record<string, unknown>,
    })

    return this.toTemplate(row)
  }

  async delete(organizationId: string, createdById: string, id: string): Promise<void> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Notification template not found')
    await this.repository.softDelete(id)

    await recordAudit({
      organizationId,
      action: 'notification_template.delete',
      actorId: createdById,
      resourceType: 'notification_template',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
    })
  }
}
