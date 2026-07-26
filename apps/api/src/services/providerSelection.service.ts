import { VoiceProviderService } from './voiceProvider.service'
import type { VoiceProvider, VoiceModel } from '@rds/types'

export class ProviderSelectionService {
  private providerService = new VoiceProviderService()

  async selectTtsProvider(organizationId: string, preferredProvider?: string): Promise<VoiceProvider | null> {
    const providers = await this.providerService.listProviders()
    const ttsProviders = providers.filter((p) => p.category === 'tts' || p.category === 'both')
    if (!ttsProviders.length) return null
    if (preferredProvider) {
      const match = ttsProviders.find((p) => p.key === preferredProvider)
      if (match) return match
    }
    return ttsProviders[0] ?? null
  }

  async selectSttProvider(organizationId: string, preferredProvider?: string): Promise<VoiceProvider | null> {
    const providers = await this.providerService.listProviders()
    const sttProviders = providers.filter((p) => p.category === 'stt' || p.category === 'both')
    if (!sttProviders.length) return null
    if (preferredProvider) {
      const match = sttProviders.find((p) => p.key === preferredProvider)
      if (match) return match
    }
    return sttProviders[0] ?? null
  }

  async getAvailableVoices(_providerKey: string, _language?: string): Promise<VoiceModel[]> {
    // In a real implementation, this would query voice_models or call the provider API.
    // For Phase 8.1, we return an empty list as a stub.
    return []
  }

  async getSupportedLanguages(_providerKey: string): Promise<Array<{ code: string; name: string }>> {
    // In a real implementation, this would query supported_languages or provider docs.
    return []
  }
}
