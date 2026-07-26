import { NotificationLogRepository } from '../repositories/notificationLog.repository'
import type { NotificationLog } from '@rds/types'

export class NotificationLogService {
  private repository = new NotificationLogRepository()

  private toLog(row: any): NotificationLog {
    return {
      id: row.id,
      organizationId: row.organization_id,
      channelId: row.channel_id,
      templateId: row.template_id ?? null,
      recipient: row.recipient,
      subject: row.subject ?? null,
      body: row.body,
      status: row.status,
      providerMessageId: row.provider_message_id ?? null,
      errorMessage: row.error_message ?? null,
      sentAt: row.sent_at ?? null,
      deliveredAt: row.delivered_at ?? null,
      openedAt: row.opened_at ?? null,
      clickedAt: row.clicked_at ?? null,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async list(organizationId: string, options: { channelId?: string; status?: string; page?: number; pageSize?: number } = {}) {
    const result = await this.repository.list(organizationId, options)
    return {
      logs: result.logs.map((r: any) => this.toLog(r)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    }
  }

  async getById(organizationId: string, id: string): Promise<NotificationLog> {
    const row = await this.repository.findById(organizationId, id)
    if (!row) throw new Error('Notification log not found')
    return this.toLog(row)
  }

  async create(organizationId: string, input: {
    channelId: string
    templateId?: string | null
    recipient: string
    subject?: string | null
    body: string
    status?: string
    providerMessageId?: string | null
    errorMessage?: string | null
    metadata?: Record<string, unknown>
  }): Promise<NotificationLog> {
    const row = await this.repository.create(organizationId, input)
    return this.toLog(row)
  }

  async updateStatus(id: string, status: string, extra: Record<string, unknown> = {}): Promise<NotificationLog> {
    const row = await this.repository.updateStatus(id, status, extra)
    return this.toLog(row)
  }
}
