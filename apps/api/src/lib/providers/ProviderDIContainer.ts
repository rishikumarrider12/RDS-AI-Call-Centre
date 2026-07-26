import type { IVoiceProvider } from './IVoiceProvider'
import { VoiceProviderRegistry } from './VoiceProviderRegistry'
import { VoiceProviderFactory } from './VoiceProviderFactory'
import { VoiceProviderFailover } from '../../services/voiceProviderFailover.service'
import type { VoiceProviderCategory } from '@rds/types'

interface ProviderDependency {
  key: string
  name: string
  category: VoiceProviderCategory
  capabilities: Record<string, unknown>
  configSchema: Record<string, unknown>
  create: (config: Record<string, unknown>) => IVoiceProvider
}

export class ProviderDIContainer {
  private static instance: ProviderDIContainer | null = null
  private registry: VoiceProviderRegistry
  private factory: VoiceProviderFactory
  private failover: VoiceProviderFailover
  private dependencies: Map<string, ProviderDependency> = new Map()

  private constructor() {
    this.registry = new VoiceProviderRegistry()
    this.factory = new VoiceProviderFactory(this.registry)
    this.failover = new VoiceProviderFailover()
  }

  static getInstance(): ProviderDIContainer {
    if (!ProviderDIContainer.instance) {
      ProviderDIContainer.instance = new ProviderDIContainer()
    }
    return ProviderDIContainer.instance
  }

  registerProviderDependency(dependency: ProviderDependency): void {
    this.dependencies.set(dependency.key, dependency)
    this.factory.registerProviderClass(dependency.key, dependency.create as unknown as new (config: Record<string, unknown>) => IVoiceProvider)
  }

  registerProviderInstance(provider: IVoiceProvider): void {
    this.registry.register(provider)
    this.failover.registerProvider(provider)
  }

  getRegistry(): VoiceProviderRegistry {
    return this.registry
  }

  getFactory(): VoiceProviderFactory {
    return this.factory
  }

  getFailover(): VoiceProviderFailover {
    return this.failover
  }

  getProvider(key: string): IVoiceProvider | undefined {
    return this.registry.getProvider(key)
  }

  getAllProviders(): IVoiceProvider[] {
    return this.registry.getAllProviders()
  }

  getActiveProviders(): IVoiceProvider[] {
    return this.registry.getActiveProviders()
  }

  getProvidersByCategory(category: VoiceProviderCategory): IVoiceProvider[] {
    return this.registry.getProvidersByCategory(category)
  }

  getNextProvider(category: VoiceProviderCategory): IVoiceProvider | null {
    return this.failover.getNextProvider(category)
  }

  recordProviderFailure(key: string): void {
    this.failover.recordFailure(key)
  }

  recordProviderSuccess(key: string): void {
    this.failover.recordSuccess(key)
  }

  isProviderCircuitOpen(key: string): boolean {
    return this.failover.isCircuitOpen(key)
  }

  createProvider(key: string, config: Record<string, unknown>): IVoiceProvider {
    return this.factory.createProvider(key, config)
  }

  hasProvider(key: string): boolean {
    return this.registry.hasProvider(key)
  }
}