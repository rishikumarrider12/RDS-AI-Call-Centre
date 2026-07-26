import { NotificationRepository } from '../repositories/notification.repository'
import type { Notification, NotificationPreferences } from '@rds/types'

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  billing: { email: true, sms: false, push: false, in_app: true },
  usage: { email: true, sms: false, push: false, in_app: true },
  security: { email: true, sms: false, push: true, in_app: true },
  support: { email: true, sms: false, push: false, in_app: true },
}

const CATEGORIES: Array<keyof NotificationPreferences> = ['billing', 'usage', 'security', 'support']
const CHANNELS: Array<'email' | 'sms' | 'push' | 'in_app'> = ['email', 'sms', 'push', 'in_app']

function isCategoryPref(value: unknown): value is NotificationPreferences['billing'] {
  if (!value || typeof value !== 'object') return false
  return CHANNELS.every((c) => typeof (value as Record<string, unknown>)[c] === 'boolean')
}

export function normalizePreferences(input: unknown): NotificationPreferences {
  const result: NotificationPreferences = JSON.parse(JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES))
  if (!input || typeof input !== 'object') return result
  const src = input as Record<string, unknown>
  for (const category of CATEGORIES) {
    if (isCategoryPref(src[category])) {
      result[category] = src[category] as NotificationPreferences['billing']
    }
  }
  return result
}

export class NotificationService {
  private repository = new NotificationRepository()

  private toNotification(row: any): Notification {
    return {
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id ?? null,
      type: row.type,
      channel: row.channel,
      title: row.title,
      body: row.body ?? null,
      data: row.data ?? {},
      readAt: row.read_at ?? null,
      createdAt: row.created_at,
    }
  }

  async list(
    organizationId: string,
    options: { channel?: string; unreadOnly?: boolean; page?: number; pageSize?: number }
  ) {
    const result = await this.repository.list(organizationId, options)
    return {
      data: result.notifications.map((n: any) => this.toNotification(n)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    }
  }

  async markRead(organizationId: string, id: string) {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Notification not found')
    await this.repository.markRead(id)
  }

  async markAllRead(organizationId: string) {
    await this.repository.markAllRead(organizationId)
  }

  async remove(organizationId: string, id: string) {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Notification not found')
    await this.repository.delete(id)
  }

  async getPreferences(organizationId: string): Promise<NotificationPreferences> {
    const prefs = await this.repository.getPreferences(organizationId)
    return normalizePreferences(prefs)
  }

  async updatePreferences(organizationId: string, input: unknown): Promise<NotificationPreferences> {
    const normalized = normalizePreferences(input)
    await this.repository.updatePreferences(organizationId, normalized as unknown as Record<string, unknown>)
    return normalized
  }
}
