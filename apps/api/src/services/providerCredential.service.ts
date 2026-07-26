import { ProviderCredentialRepository } from '../repositories/providerCredential.repository'
import type { ProviderCredential, ProviderCredentialInput } from '@rds/types'
import { recordAudit } from '../lib/audit'

export class ProviderCredentialService {
  private repository = new ProviderCredentialRepository()

  async listCredentials(organizationId: string): Promise<ProviderCredential[]> {
    const rows = await this.repository.listByOrg(organizationId)
    return rows.map(this.mapRow)
  }

  async getCredential(organizationId: string, providerKey: string): Promise<ProviderCredential | null> {
    const row = await this.repository.findByOrgAndProvider(organizationId, providerKey)
    return row ? this.mapRow(row) : null
  }

  async saveCredential(actorId: string, organizationId: string, input: ProviderCredentialInput): Promise<ProviderCredential> {
    const row = await this.repository.upsert(organizationId, input.providerKey, input.credentials)
    await recordAudit({
      organizationId,
      action: 'provider_credential.upserted',
      actorId,
      actorType: 'user',
      resourceType: 'provider_credential',
      resourceId: row.id,
      after: row as unknown as Record<string, unknown>,
    })
    return this.mapRow(row)
  }

  async verifyCredential(organizationId: string, providerKey: string): Promise<{ valid: boolean; error?: string }> {
    const credential = await this.repository.findByOrgAndProvider(organizationId, providerKey)
    if (!credential) {
      return { valid: false, error: 'No credentials configured for this provider' }
    }
    const result = await this.providerHealthCheck(providerKey, credential.credentials)
    if (result.valid) {
      await this.repository.updateLastVerified(credential.id)
    }
    return result
  }

  async deleteCredential(actorId: string, organizationId: string, providerKey: string): Promise<void> {
    const existing = await this.repository.findByOrgAndProvider(organizationId, providerKey)
    if (!existing) throw new Error('Provider credential not found')
    await this.repository.softDelete(existing.id)
    await recordAudit({
      organizationId,
      action: 'provider_credential.deleted',
      actorId,
      actorType: 'user',
      resourceType: 'provider_credential',
      resourceId: existing.id,
      before: existing as unknown as Record<string, unknown>,
    })
  }

  private mapRow(row: any): ProviderCredential {
    return {
      id: row.id,
      organizationId: row.organizationId,
      providerKey: row.providerKey,
      credentials: row.credentials ?? {},
      isActive: row.isActive,
      lastVerifiedAt: row.lastVerifiedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  private async providerHealthCheck(providerKey: string, credentials: Record<string, unknown>): Promise<{ valid: boolean; error?: string }> {
    const { ProviderDIContainer } = await import('../lib/providers/ProviderDIContainer.js')
    const DI = ProviderDIContainer.getInstance()
    const provider = DI.getProvider(providerKey)
    if (!provider) {
      return { valid: false, error: `Provider ${providerKey} is not registered` }
    }
    return provider.verifyCredentials(credentials)
  }
}