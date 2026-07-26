import type { IVoiceProvider } from '../IVoiceProvider'
import type { VoiceProviderCategory, VoiceModel, SupportedLanguage } from '@rds/types'

const DEFAULT_TIMEOUT_MS = 30000
const DEFAULT_MAX_RETRIES = 3
const DEFAULT_BASE_DELAY_MS = 1000

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class ElevenLabsProvider implements IVoiceProvider {
  key = 'elevenlabs'
  name = 'ElevenLabs'
  category = 'both' as VoiceProviderCategory
  capabilities = {
    tts: true,
    stt: false,
    streaming: true,
    voiceListing: true,
    languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'ro', 'hu', 'cs', 'sk', 'sl', 'hr', 'bg', 'uk', 'ru', 'ja', 'ko', 'zh'],
  }
  isActive = true
  healthStatus: 'healthy' | 'degraded' | 'down' | 'unknown' = 'unknown'
  lastHealthCheck: string | null = null
  latencyMs: number | null = null

  async withTimeout<T>(promise: Promise<T>, timeoutMs?: number): Promise<T> {
    const ms = timeoutMs ?? DEFAULT_TIMEOUT_MS
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), ms)
    try {
      const result = await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => reject(new Error('Request timed out after ' + ms + 'ms')))
        }),
      ])
      return result
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async retryOperation<T>(operation: () => Promise<T>, maxRetries?: number, baseDelayMs?: number): Promise<T> {
    const retries = maxRetries ?? DEFAULT_MAX_RETRIES
    const baseDelay = baseDelayMs ?? DEFAULT_BASE_DELAY_MS
    let lastError: unknown
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation()
      } catch (err) {
        lastError = err
        if (attempt < retries) {
          const backoff = baseDelay * Math.pow(2, attempt)
          await delay(backoff)
        }
      }
    }
    throw lastError
  }

  async synthesizeSpeech(text: string, voiceId: string, options?: Record<string, unknown>): Promise<{ audioUrl: string; durationMs: number }> {
    const apiKey = options?.apiKey as string | undefined
    const modelId = options?.modelId as string | undefined || 'eleven_monolingual_v1'

    if (!apiKey) throw new Error('Missing ElevenLabs API key')

    const response = await this.retryOperation(
      () => this.withTimeout(
        fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: options?.voiceSettings ?? { stability: 0.5, similarity_boost: 0.75 },
          }),
        }),
        options?.timeoutMs as number | undefined
      ),
      options?.maxRetries as number | undefined
    )

    if (!response.ok) {
      throw new Error('ElevenLabs TTS request failed: ' + response.status)
    }

    const audioBuffer = await response.arrayBuffer()
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' })
    const audioUrl = URL.createObjectURL(audioBlob)

    return { audioUrl, durationMs: 0 }
  }

  async streamAudio(text: string, voiceId: string, options?: Record<string, unknown>): Promise<ReadableStream<Uint8Array>> {
    const apiKey = options?.apiKey as string | undefined
    const modelId = options?.modelId as string | undefined || 'eleven_multilingual_v2'

    if (!apiKey) throw new Error('Missing ElevenLabs API key')

    const response = await this.retryOperation(
      () => this.withTimeout(
        fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId + '/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
            'Accept': 'audio/mpeg',
          },
          body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: options?.voiceSettings ?? { stability: 0.5, similarity_boost: 0.75 },
            output_format: 'mp3_22050_32',
          }),
        }),
        options?.timeoutMs as number | undefined
      ),
      options?.maxRetries as number | undefined
    )

    if (!response.ok) {
      throw new Error('ElevenLabs streaming request failed: ' + response.status)
    }

    if (!response.body) {
      throw new Error('ElevenLabs streaming: response body is null')
    }

    return response.body
  }

  async transcribeAudio(_audioUrl: string, _language?: string, _options?: Record<string, unknown>): Promise<{ text: string; confidence: number }> {
    throw new Error('ElevenLabs does not support STT')
  }

  async streamTranscription(_audioStream: ReadableStream<Uint8Array>, _language?: string, _options?: Record<string, unknown>): Promise<{ text: string; confidence: number }> {
    throw new Error('ElevenLabs does not support STT')
  }

  async getAvailableVoices(_language?: string): Promise<VoiceModel[]> {
    return [
      { id: 'elevenlabs-alloy', providerKey: 'elevenlabs', modelId: 'alloy', name: 'Alloy', type: 'tts', language: 'en', gender: 'neutral', isActive: true, metadata: {}, createdAt: '', updatedAt: '' },
      { id: 'elevenlabs-bella', providerKey: 'elevenlabs', modelId: 'bella', name: 'Bella', type: 'tts', language: 'en', gender: 'female', isActive: true, metadata: {}, createdAt: '', updatedAt: '' },
      { id: 'elevenlabs-emma', providerKey: 'elevenlabs', modelId: 'emma', name: 'Emma', type: 'tts', language: 'en', gender: 'female', isActive: true, metadata: {}, createdAt: '', updatedAt: '' },
      { id: 'elevenlabs-paul', providerKey: 'elevenlabs', modelId: 'paul', name: 'Paul', type: 'tts', language: 'en', gender: 'male', isActive: true, metadata: {}, createdAt: '', updatedAt: '' },
    ]
  }

  async getSupportedLanguages(): Promise<SupportedLanguage[]> {
    return [
      { id: '', providerKey: 'elevenlabs', languageCode: 'en', languageName: 'English', isActive: true, createdAt: '', updatedAt: '' },
      { id: '', providerKey: 'elevenlabs', languageCode: 'es', languageName: 'Spanish', isActive: true, createdAt: '', updatedAt: '' },
      { id: '', providerKey: 'elevenlabs', languageCode: 'fr', languageName: 'French', isActive: true, createdAt: '', updatedAt: '' },
      { id: '', providerKey: 'elevenlabs', languageCode: 'de', languageName: 'German', isActive: true, createdAt: '', updatedAt: '' },
      { id: '', providerKey: 'elevenlabs', languageCode: 'it', languageName: 'Italian', isActive: true, createdAt: '', updatedAt: '' },
    ]
  }

  async verifyCredentials(credentials: Record<string, unknown>): Promise<{ valid: boolean; error?: string }> {
    const apiKey = credentials?.apiKey as string | undefined
    if (!apiKey) return { valid: false, error: 'API key is required' }

    try {
      const response = await this.retryOperation(
        () => this.withTimeout(
          fetch('https://api.elevenlabs.io/v1/user', {
            headers: { 'xi-api-key': apiKey },
          })
        )
      )
      if (response.ok) return { valid: true }
      return { valid: false, error: 'Invalid API key: ' + response.status }
    } catch {
      return { valid: false, error: 'Failed to connect to ElevenLabs' }
    }
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'down'; latencyMs: number | null; details: Record<string, unknown> }> {
    const startTime = Date.now()
    try {
      const apiKey = ''
      const response = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: { 'xi-api-key': apiKey },
        signal: AbortSignal.timeout(5000),
      })
      const elapsed = Date.now() - startTime
      this.latencyMs = elapsed
      this.lastHealthCheck = new Date().toISOString()
      if (response.ok) {
        this.healthStatus = 'healthy'
        return { status: 'healthy', latencyMs: elapsed, details: { provider: 'elevenlabs' } }
      }
      this.healthStatus = 'degraded'
      return { status: 'degraded', latencyMs: elapsed, details: { reason: 'Unexpected response: ' + response.status } }
    } catch (err) {
      const elapsed = Date.now() - startTime
      this.latencyMs = elapsed
      this.lastHealthCheck = new Date().toISOString()
      this.healthStatus = 'down'
      return { status: 'down', latencyMs: elapsed, details: { reason: err instanceof Error ? err.message : 'Unknown error' } }
    }
  }
}