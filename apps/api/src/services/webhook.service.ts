import crypto from 'crypto'
import { WebhookRepository } from '../repositories/webhook.repository'
import type { Webhook, WebhookDelivery } from '@rds/types'

export class WebhookService {
  private repository = new WebhookRepository()

  private toWebhook(row: any): Webhook {
    return {
      id: row.id,
      organizationId: row.organization_id,
      url: row.url,
      secret: row.secret,
      events: row.events ?? [],
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private toDelivery(row: any): WebhookDelivery {
    return {
      id: row.id,
      webhookId: row.webhook_id,
      organizationId: row.organization_id,
      event: row.event,
      payload: row.payload ?? {},
      status: row.status,
      httpStatus: row.http_status ?? null,
      responseBody: row.response_body ?? null,
      attempt: row.attempt ?? 1,
      nextAttemptAt: row.next_attempt_at ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async list(organizationId: string): Promise<Webhook[]> {
    const rows = await this.repository.list(organizationId)
    return rows.map((r: any) => this.toWebhook(r))
  }

  async getById(organizationId: string, id: string): Promise<Webhook> {
    const row = await this.repository.findById(organizationId, id)
    if (!row) throw new Error('Webhook not found')
    return this.toWebhook(row)
  }

  async create(
    organizationId: string,
    input: { url: string; events: string[]; isActive?: boolean }
  ): Promise<Webhook> {
    if (!input.url || !/^https?:\/\//.test(input.url)) {
      throw new Error('A valid http(s) webhook URL is required')
    }
    if (!input.events || input.events.length === 0) {
      throw new Error('Select at least one event to subscribe to')
    }
    const secret = `whsec_${crypto.randomBytes(24).toString('base64url')}`
    const row = await this.repository.create({
      organizationId,
      url: input.url.trim(),
      secret,
      events: input.events,
      isActive: input.isActive,
    })
    return this.toWebhook(row)
  }

  async update(
    organizationId: string,
    id: string,
    input: { url?: string; events?: string[]; isActive?: boolean }
  ): Promise<Webhook> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Webhook not found')
    if (input.url !== undefined && !/^https?:\/\//.test(input.url)) {
      throw new Error('A valid http(s) webhook URL is required')
    }
    const row = await this.repository.update(id, {
      url: input.url?.trim(),
      events: input.events,
      isActive: input.isActive,
    })
    return this.toWebhook(row)
  }

  async remove(organizationId: string, id: string) {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Webhook not found')
    await this.repository.softDelete(id)
  }

  async listDeliveries(
    organizationId: string,
    webhookId: string,
    options: { page?: number; pageSize?: number }
  ) {
    const existing = await this.repository.findById(organizationId, webhookId)
    if (!existing) throw new Error('Webhook not found')
    const result = await this.repository.listDeliveries(organizationId, webhookId, options)
    return {
      data: result.deliveries.map((d: any) => this.toDelivery(d)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    }
  }

  async retryDelivery(organizationId: string, deliveryId: string): Promise<WebhookDelivery> {
    const delivery = await this.repository.findDelivery(organizationId, deliveryId)
    if (!delivery) throw new Error('Delivery not found')
    const now = new Date().toISOString()
    await this.repository.updateDelivery(deliveryId, {
      status: 'pending',
      attempt: (delivery.attempt ?? 1) + 1,
      next_attempt_at: now,
      updated_at: now,
    })
    const updated = await this.repository.findDelivery(organizationId, deliveryId)
    return this.toDelivery(updated)
  }
}
