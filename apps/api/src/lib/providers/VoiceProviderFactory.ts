import type { IVoiceProvider } from './IVoiceProvider'
import { VoiceProviderRegistry } from './VoiceProviderRegistry'
import type { VoiceProviderCategory } from '@rds/types'

export class VoiceProviderFactory {
  private registry: VoiceProviderRegistry
  private providerClasses: Map<string, new (config: Record<string, unknown>) => IVoiceProvider> = new Map()

  constructor(registry: VoiceProviderRegistry) {
    this.registry = registry
  }

  registerProviderClass(key: string, providerClass: new (config: Record<string, unknown>) => IVoiceProvider): void {
    this.providerClasses.set(key, providerClass)
  }

  createProvider(key: string, config: Record<string, unknown>): IVoiceProvider {
    const providerClass = this.providerClasses.get(key)
    if (!providerClass) {
      throw new Error(`Voice provider class not registered for key: ${key}`)
    }
    const provider = new providerClass(config)
    this.registry.register(provider)
    return provider
  }

  createProviderFromConfig(providerKey: string, config: Record<string, unknown>): IVoiceProvider {
    return this.createProvider(providerKey, config)
  }

  getRegistry(): VoiceProviderRegistry {
    return this.registry
  }
}