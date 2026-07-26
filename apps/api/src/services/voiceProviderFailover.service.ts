import type { IVoiceProvider } from '../lib/providers/IVoiceProvider'
import type { VoiceProviderCategory } from '@rds/types'

interface FailoverEntry {
  provider: IVoiceProvider
  priority: number
  failureCount: number
  lastFailureAt: string | null
  circuitOpen: boolean
  circuitOpenUntil: string | null
}

export class VoiceProviderFailover {
  private entries: Map<string, FailoverEntry> = new Map()
  private circuitOpenDurationMs = 60000
  private maxFailuresBeforeCircuitOpen = 3

  registerProvider(provider: IVoiceProvider, priority: number = 0): void {
    this.entries.set(provider.key, {
      provider,
      priority,
      failureCount: 0,
      lastFailureAt: null,
      circuitOpen: false,
      circuitOpenUntil: null,
    })
  }

  unregisterProvider(key: string): void {
    this.entries.delete(key)
  }

  getNextProvider(category: VoiceProviderCategory): IVoiceProvider | null {
    const candidates = Array.from(this.entries.values())
      .filter((e) => {
        if (e.circuitOpen && e.circuitOpenUntil && new Date(e.circuitOpenUntil) > new Date()) {
          return false
        }
        if (e.circuitOpen) {
          e.circuitOpen = false
          e.circuitOpenUntil = null
        }
        return (e.provider.category === category || e.provider.category === 'both') && e.provider.isActive
      })
      .sort((a, b) => a.priority - b.priority)

    if (candidates.length === 0) return null
    return candidates[0].provider
  }

  recordFailure(key: string): void {
    const entry = this.entries.get(key)
    if (!entry) return

    entry.failureCount++
    entry.lastFailureAt = new Date().toISOString()

    if (entry.failureCount >= this.maxFailuresBeforeCircuitOpen) {
      entry.circuitOpen = true
      entry.circuitOpenUntil = new Date(Date.now() + this.circuitOpenDurationMs).toISOString()
    }
  }

  recordSuccess(key: string): void {
    const entry = this.entries.get(key)
    if (!entry) return

    entry.failureCount = 0
    entry.circuitOpen = false
    entry.circuitOpenUntil = null
  }

  isCircuitOpen(key: string): boolean {
    const entry = this.entries.get(key)
    if (!entry) return false

    if (entry.circuitOpen && entry.circuitOpenUntil && new Date(entry.circuitOpenUntil) <= new Date()) {
      entry.circuitOpen = false
      entry.circuitOpenUntil = null
      entry.failureCount = 0
      return false
    }

    return entry.circuitOpen
  }

  getAllProviders(): IVoiceProvider[] {
    return Array.from(this.entries.values()).map((e) => e.provider)
  }

  getActiveProviders(): IVoiceProvider[] {
    return this.getAllProviders().filter((p) => p.isActive)
  }

  getProvidersByCategory(category: VoiceProviderCategory): IVoiceProvider[] {
    return this.getActiveProviders().filter(
      (p) => p.category === category || p.category === 'both'
    )
  }

  getHealthStatus(key: string): { failureCount: number; circuitOpen: boolean; lastFailureAt: string | null; priority: number } | null {
    const entry = this.entries.get(key)
    if (!entry) return null
    return {
      failureCount: entry.failureCount,
      circuitOpen: entry.circuitOpen,
      lastFailureAt: entry.lastFailureAt,
      priority: entry.priority,
    }
  }
}