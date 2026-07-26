import { NotificationChannelRepository } from '../repositories/notificationChannel.repository'
import type { NotificationChannelConfig } from '@rds/types'
import { recordAudit } from '../lib/audit'

export class NotificationChannelService {
  private repository = new NotificationChannelRepository()

  private toChannel(row: any): NotificationChannelConfig {
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      type: row.type,
      config: row.config ?? {},
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async list(organizationId: string): Promise<NotificationChannelConfig[]> {
    const rows = await this.repository.list(organizationId)
    return rows.map((r: any) => this.toChannel(r))
  }

  async getById(organizationId: string, id: string): Promise<NotificationChannelConfig> {
    const row = await this.repository.findById(organizationId, id)
    if (!row) throw new Error('Notification channel not found')
    return this.toChannel(row)
  }

  async create(organizationId: string, createdById: string, input: {
    name: string
    type: string
    config?: Record<string, unknown>
    isActive?: boolean
  }): Promise<NotificationChannelConfig> {
    const row = await this.repository.create(organizationId, input)

    await recordAudit({
      organizationId,
      action: 'notification_channel.create',
      actorId: createdById,
      resourceType: 'notification_channel',
      resourceId: row.id,
      after: row as unknown as Record<string, unknown>,
    })

    return this.toChannel(row)
  }

  async update(organizationId: string, createdById: string, id: string, input: {
    name?: string
    type?: string
    config?: Record<string, unknown>
    isActive?: boolean
  }): Promise<NotificationChannelConfig> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Notification channel not found')

    const row = await this.repository.update(id, input)

    await recordAudit({
      organizationId,
      action: 'notification_channel.update',
      actorId: createdById,
      resourceType: 'notification_channel',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
      after: row as unknown as Record<string, unknown>,
    })

    return this.toChannel(row)
  }

  async delete(organizationId: string, createdById: string, id: string): Promise<void> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Notification channel not found')
    await this.repository.softDelete(id)

    await recordAudit({
      organizationId,
      action: 'notification_channel.delete',
      actorId: createdById,
      resourceType: 'notification_channel',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
    })
  }
}
