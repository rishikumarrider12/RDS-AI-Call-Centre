import { OAuthRepository } from '../repositories/oauth.repository'
import { recordAudit } from '../lib/audit'

export interface OAuthConnection {
  id: string
  organizationId: string
  userId: string | null
  provider: string
  providerUserId: string
  accessToken: string | null
  refreshToken: string | null
  expiresAt: string | null
  scope: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export class OAuthService {
  private repository = new OAuthRepository()

  private toConnection(row: any): OAuthConnection {
    return {
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id ?? null,
      provider: row.provider,
      providerUserId: row.provider_user_id,
      accessToken: row.access_token ?? null,
      refreshToken: row.refresh_token ?? null,
      expiresAt: row.expires_at ?? null,
      scope: row.scope ?? null,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  async list(organizationId: string): Promise<OAuthConnection[]> {
    const rows = await this.repository.list(organizationId)
    return rows.map((r: any) => this.toConnection(r))
  }

  async getById(organizationId: string, id: string): Promise<OAuthConnection> {
    const row = await this.repository.findById(organizationId, id)
    if (!row) throw new Error('OAuth connection not found')
    return this.toConnection(row)
  }

  async getByProvider(organizationId: string, provider: string): Promise<OAuthConnection[]> {
    const rows = await this.repository.findByProvider(organizationId, provider)
    return rows.map((r: any) => this.toConnection(r))
  }

  async connect(organizationId: string, userId: string, input: {
    provider: string
    providerUserId: string
    accessToken?: string | null
    refreshToken?: string | null
    expiresAt?: string | null
    scope?: string | null
    metadata?: Record<string, unknown>
  }): Promise<OAuthConnection> {
    const row = await this.repository.create(organizationId, {
      userId,
      provider: input.provider,
      providerUserId: input.providerUserId,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt: input.expiresAt,
      scope: input.scope,
      metadata: input.metadata,
    })

    await recordAudit({
      organizationId,
      action: 'oauth.connect',
      actorId: userId,
      resourceType: 'oauth_connection',
      resourceId: row.id,
      after: row as unknown as Record<string, unknown>,
    })

    return this.toConnection(row)
  }

  async update(organizationId: string, userId: string, id: string, input: {
    accessToken?: string | null
    refreshToken?: string | null
    expiresAt?: string | null
    scope?: string | null
    metadata?: Record<string, unknown>
  }): Promise<OAuthConnection> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('OAuth connection not found')

    const row = await this.repository.update(id, input)

    await recordAudit({
      organizationId,
      action: 'oauth.update',
      actorId: userId,
      resourceType: 'oauth_connection',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
      after: row as unknown as Record<string, unknown>,
    })

    return this.toConnection(row)
  }

  async disconnect(organizationId: string, userId: string, id: string): Promise<void> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('OAuth connection not found')
    await this.repository.softDelete(id)

    await recordAudit({
      organizationId,
      action: 'oauth.disconnect',
      actorId: userId,
      resourceType: 'oauth_connection',
      resourceId: id,
      before: existing as unknown as Record<string, unknown>,
    })
  }
}
