import { VoiceProviderRepository } from '../repositories/voiceProvider.repository'
import { VoiceModelRepository } from '../repositories/voiceModel.repository'
import { ProviderDIContainer } from '../lib/providers/ProviderDIContainer'
import type { VoiceProvider, VoiceModel } from '@rds/types'

const DI = ProviderDIContainer.getInstance()

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  pl: 'Polish',
  ro: 'Romanian',
  hu: 'Hungarian',
  cs: 'Czech',
  sk: 'Slovak',
  sl: 'Slovenian',
  hr: 'Croatian',
  bg: 'Bulgarian',
  uk: 'Ukrainian',
  ru: 'Russian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  ar: 'Arabic',
  hi: 'Hindi',
  th: 'Thai',
  tr: 'Turkish',
  nl: 'Dutch',
  sv: 'Swedish',
  da: 'Danish',
  no: 'Norwegian',
  fi: 'Finnish',
  el: 'Greek',
  he: 'Hebrew',
  id: 'Indonesian',
  ms: 'Malay',
  vi: 'Vietnamese',
  tl: 'Tagalog',
  cy: 'Welsh',
  be: 'Belarusian',
  et: 'Estonian',
  lv: 'Latvian',
  lt: 'Lithuanian',
  mn: 'Mongolian',
  nb: 'Norwegian Bokmål',
  fa: 'Persian',
  sr: 'Serbian',
}

export class ProviderSelectionService {
  private providerRepository = new VoiceProviderRepository()
  private modelRepository = new VoiceModelRepository()

  async selectTtsProvider(organizationId: string, preferredProvider?: string): Promise<VoiceProvider | null> {
    const failoverProvider = DI.getNextProvider('tts')
    if (failoverProvider) {
      const provider = DI.getRegistry().getProvider(failoverProvider.key)
      if (provider) {
        return this.providerToVoiceProvider(provider)
      }
    }

    const providers = await this.providerRepository.listActive()
    const ttsProviders = providers.filter((p) => p.category === 'tts' || p.category === 'both')
    if (!ttsProviders.length) return null
    if (preferredProvider) {
      const match = ttsProviders.find((p) => p.key === preferredProvider)
      if (match) return this.mapProviderRow(match)
    }
    return this.mapProviderRow(ttsProviders[0]) ?? null
  }

  async selectSttProvider(organizationId: string, preferredProvider?: string): Promise<VoiceProvider | null> {
    const failoverProvider = DI.getNextProvider('stt')
    if (failoverProvider) {
      const provider = DI.getRegistry().getProvider(failoverProvider.key)
      if (provider) {
        return this.providerToVoiceProvider(provider)
      }
    }

    const providers = await this.providerRepository.listActive()
    const sttProviders = providers.filter((p) => p.category === 'stt' || p.category === 'both')
    if (!sttProviders.length) return null
    if (preferredProvider) {
      const match = sttProviders.find((p) => p.key === preferredProvider)
      if (match) return this.mapProviderRow(match)
    }
    return this.mapProviderRow(sttProviders[0]) ?? null
  }

  async getAvailableVoices(providerKey: string, language?: string): Promise<VoiceModel[]> {
    const voices = await this.modelRepository.listByProvider(providerKey, 'tts')
    if (language) {
      return voices.filter((v) => v.language === language)
    }
    return voices
  }

  async getSupportedLanguages(providerKey?: string): Promise<Array<{ code: string; name: string }>> {
    const voices = await this.modelRepository.listByProvider(providerKey ?? '', 'tts')
    const languageMap = new Map<string, string>()
    for (const voice of voices) {
      if (!languageMap.has(voice.language)) {
        languageMap.set(voice.language, voice.language)
      }
    }
    return Array.from(languageMap.keys()).map((code) => ({
      code,
      name: LANGUAGE_NAMES[code] ?? code,
    }))
  }

  async listAllProviders(): Promise<VoiceProvider[]> {
    const providers = DI.getAllProviders()
    return providers.map((p) => this.providerToVoiceProvider(p))
  }

  async getProviderCapabilities(providerKey: string): Promise<Record<string, unknown> | null> {
    const provider = DI.getRegistry().getProvider(providerKey)
    if (!provider) return null
    return provider.capabilities
  }

  private mapProviderRow(row: { id: string; key: string; name: string; category: string; description: string | null; configSchema: Record<string, unknown>; capabilities: Record<string, unknown>; isActive: boolean; createdAt: string; updatedAt: string }): VoiceProvider {
    return {
      id: row.id,
      key: row.key,
      name: row.name,
      category: row.category as VoiceProvider['category'],
      description: row.description ?? null,
      configSchema: row.configSchema,
      capabilities: row.capabilities,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }

  private providerToVoiceProvider(provider: { key: string; name: string; category: string; capabilities: Record<string, unknown>; isActive: boolean }): VoiceProvider {
    return {
      id: provider.key,
      key: provider.key,
      name: provider.name,
      category: provider.category as VoiceProvider['category'],
      description: null,
      configSchema: {},
      capabilities: provider.capabilities,
      isActive: provider.isActive,
      createdAt: '',
      updatedAt: '',
    }
  }
}