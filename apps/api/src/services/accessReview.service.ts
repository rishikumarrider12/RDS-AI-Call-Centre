import { AccessReviewRepository } from '../repositories/accessReview.repository'
import type { AccessReview } from '@rds/types'
import { recordAudit } from '../lib/audit'

export class AccessReviewService {
  private repository = new AccessReviewRepository()

  private toReview(row: any): AccessReview {
    return {
      id: row.id,
      organizationId: row.organization_id,
      title: row.title,
      description: row.description ?? null,
      reviewerId: row.reviewer_id ?? null,
      status: row.status,
      startedAt: row.started_at,
      dueAt: row.due_at ?? null,
      completedAt: row.completed_at ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async list(organizationId: string): Promise<AccessReview[]> {
    const rows = await this.repository.list(organizationId)
    return rows.map((r: any) => this.toReview(r))
  }

  async getById(organizationId: string, id: string): Promise<AccessReview> {
    const row = await this.repository.findById(organizationId, id)
    if (!row) throw new Error('Access review not found')
    return this.toReview(row)
  }

  async create(organizationId: string, actorId: string, input: {
    title: string
    description?: string | null
    reviewerId?: string | null
    status?: string
    dueAt?: string | null
  }): Promise<AccessReview> {
    const row = await this.repository.create(organizationId, input)

    await recordAudit({
      organizationId,
      action: 'access_review.created',
      actorId,
      actorType: 'user',
      resourceType: 'access_review',
      resourceId: row.id,
      after: row as unknown as Record<string, unknown>,
    })

    return this.toReview(row)
  }

  async update(organizationId: string, actorId: string, id: string, input: {
    title?: string
    description?: string | null
    reviewerId?: string | null
    status?: string
    dueAt?: string | null
    completedAt?: string | null
  }): Promise<AccessReview> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Access review not found')

    const row = await this.repository.update(id, input)

    await recordAudit({
      organizationId,
      action: 'access_review.updated',
      actorId,
      actorType: 'user',
      resourceType: 'access_review',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
      after: row as unknown as Record<string, unknown>,
    })

    return this.toReview(row)
  }

  async complete(organizationId: string, actorId: string, id: string): Promise<AccessReview> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Access review not found')

    const row = await this.repository.update(id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    })

    await recordAudit({
      organizationId,
      action: 'access_review.completed',
      actorId,
      actorType: 'user',
      resourceType: 'access_review',
      resourceId: id,
      after: row as unknown as Record<string, unknown>,
    })

    return this.toReview(row)
  }

  async delete(organizationId: string, actorId: string, id: string): Promise<void> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Access review not found')
    await this.repository.softDelete(id)

    await recordAudit({
      organizationId,
      action: 'access_review.deleted',
      actorId,
      actorType: 'user',
      resourceType: 'access_review',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
    })
  }
}
