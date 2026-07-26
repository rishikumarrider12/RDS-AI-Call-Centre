import crypto from 'crypto'
import { ApiKeyRepository } from '../repositories/apikey.repository'
import { logger } from '../lib/logger'
import type { ApiKey } from '@rds/types'

export interface GeneratedApiKey {
  id: string
  name: string
  key: string
  keyPrefix: string
  scopes: string[]
  expiresAt: string | null
  createdAt: string
}

export class ApiKeyService {
  private repository = new ApiKeyRepository()

  private toApiKey(dbKey: any): ApiKey {
    return {
      id: dbKey.id,
      organizationId: dbKey.organization_id,
      name: dbKey.name,
      keyPrefix: dbKey.key_prefix,
      status: dbKey.deleted_at ? 'revoked' : 'active',
      permissions: dbKey.scopes?.join(', ') || 'Full access',
      scopes: dbKey.scopes || [],
      lastUsedAt: dbKey.last_used_at ?? null,
      expiresAt: dbKey.expires_at ?? null,
      createdAt: dbKey.created_at,
    }
  }

  async generateKey(organizationId: string, userId: string, name: string, scopes: string[] = ['read', 'write'], expiresAt?: string | null): Promise<GeneratedApiKey> {
    if (!name || name.trim().length < 2) {
      throw new Error('API key name is required')
    }

    const raw = `rds_${crypto.randomBytes(24).toString('base64url')}`
    const keyPrefix = raw.slice(0, 8)
    const keyHash = crypto.createHash('sha256').update(raw).digest('hex')

    const dbKey = await this.repository.create({
      organizationId,
      userId,
      name: name.trim(),
      keyPrefix,
      keyHash,
      scopes,
      expiresAt,
    })

    logger.info({ organizationId, keyId: dbKey.id }, 'api key generated')
    return {
      id: dbKey.id,
      name: dbKey.name,
      key: raw,
      keyPrefix: dbKey.keyPrefix,
      scopes,
      expiresAt: expiresAt ?? null,
      createdAt: dbKey.createdAt,
    }
  }

  async rotateKey(organizationId: string, userId: string, keyId: string, options: { name?: string; scopes?: string[]; expiresAt?: string | null }): Promise<GeneratedApiKey> {
    const existing = await this.repository.findById(keyId)
    if (!existing) throw new Error('API key not found')
    if (existing.organizationId !== organizationId) {
      throw new Error('API key does not belong to this organization')
    }

    const raw = `rds_${crypto.randomBytes(24).toString('base64url')}`
    const keyPrefix = raw.slice(0, 8)
    const keyHash = crypto.createHash('sha256').update(raw).digest('hex')

    await this.repository.revoke(keyId)

    const dbKey = await this.repository.create({
      organizationId,
      userId,
      name: options.name || existing.name,
      keyPrefix,
      keyHash,
      scopes: options.scopes || existing.scopes || ['read', 'write'],
      expiresAt: options.expiresAt ?? existing.expiresAt ?? null,
    })

    logger.info({ organizationId, keyId: dbKey.id }, 'api key rotated')
    return {
      id: dbKey.id,
      name: dbKey.name,
      key: raw,
      keyPrefix: dbKey.keyPrefix,
      scopes: options.scopes || existing.scopes || ['read', 'write'],
      expiresAt: options.expiresAt ?? existing.expiresAt ?? null,
      createdAt: dbKey.createdAt,
    }
  }

  async listKeys(organizationId: string): Promise<ApiKey[]> {
    const keys = await this.repository.list(organizationId)
    return keys.map((k: any) => this.toApiKey(k))
  }

  async revokeKey(organizationId: string, keyId: string) {
    const existing = await this.repository.findById(keyId)
    if (!existing) throw new Error('API key not found')
    if (existing.organizationId !== organizationId) {
      throw new Error('API key does not belong to this organization')
    }
    await this.repository.revoke(keyId)
    logger.info({ organizationId, keyId }, 'api key revoked')
  }
}
