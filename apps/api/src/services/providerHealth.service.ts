import { ProviderCredentialRepository } from '../repositories/providerCredential.repository'
import { ProviderDIContainer } from '../lib/providers/ProviderDIContainer'

const DI = ProviderDIContainer.getInstance()

export class ProviderHealthService {
  private credentialRepository = new ProviderCredentialRepository()

  async checkProviderHealth(providerKey: string, organizationId: string): Promise<{ status: 'healthy' | 'degraded' | 'down'; latencyMs: number | null; details: Record<string, unknown> }> {
    const credentials = await this.credentialRepository.findByOrgAndProvider(organizationId, providerKey)
    const provider = DI.getProvider(providerKey)

    if (!provider) {
      return { status: 'down', latencyMs: null, details: { reason: 'Provider not registered in DI container' } }
    }

    if (!credentials) {
      return { status: 'degraded', latencyMs: null, details: { reason: 'No credentials configured' } }
    }

    const credentialResult = await provider.verifyCredentials(credentials.credentials)
    if (!credentialResult.valid) {
      return { status: 'degraded', latencyMs: null, details: { reason: credentialResult.error ?? 'Credential verification failed' } }
    }

    return provider.healthCheck()
  }

  async checkAllProvidersHealth(organizationId: string): Promise<Record<string, { status: string; latencyMs: number | null; details: Record<string, unknown> }>> {
    const providers = DI.getActiveProviders()
    const result: Record<string, { status: string; latencyMs: number | null; details: Record<string, unknown> }> = {}

    for (const provider of providers) {
      try {
        const health = await this.checkProviderHealth(provider.key, organizationId)
        result[provider.key] = health
      } catch {
        result[provider.key] = { status: 'down', latencyMs: null, details: { reason: 'Health check failed' } }
      }
    }

    return result
  }
}