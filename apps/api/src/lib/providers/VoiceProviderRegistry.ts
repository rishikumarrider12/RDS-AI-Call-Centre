import type { IVoiceProvider } from './IVoiceProvider'
import type { VoiceProviderCategory } from '@rds/types'

export class VoiceProviderRegistry {
  private providers: Map<string, IVoiceProvider> = new Map()

  register(provider: IVoiceProvider): void {
    this.providers.set(provider.key, provider)
  }

  unregister(key: string): void {
    this.providers.delete(key)
  }

  getProvider(key: string): IVoiceProvider | undefined {
    return this.providers.get(key)
  }

  getAllProviders(): IVoiceProvider[] {
    return Array.from(this.providers.values())
  }

  getActiveProviders(): IVoiceProvider[] {
    return this.getAllProviders().filter((p) => p.isActive)
  }

  getProvidersByCategory(category: VoiceProviderCategory): IVoiceProvider[] {
    return this.getAllProviders().filter(
      (p) => p.category === category || p.category === 'both'
    )
  }

  hasProvider(key: string): boolean {
    return this.providers.has(key)
  }
}