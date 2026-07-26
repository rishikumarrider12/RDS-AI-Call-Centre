import type { IVoiceProvider } from '../IVoiceProvider'
import type { VoiceProviderCategory, VoiceModel, SupportedLanguage } from '@rds/types'

const DEFAULT_TIMEOUT_MS = 30000
const DEFAULT_MAX_RETRIES = 3
const DEFAULT_BASE_DELAY_MS = 1000

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class GoogleCloudSpeechProvider implements IVoiceProvider {
  key = 'google'
  name = 'Google Cloud Speech'
  category = 'both' as VoiceProviderCategory
  capabilities = {
    tts: true,
    stt: true,
    streaming: true,
    voiceListing: true,
    languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'ro', 'hu', 'cs', 'sk', 'sl', 'hr', 'bg', 'uk', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi', 'th', 'tr', 'nl', 'sv', 'da', 'no', 'fi', 'el', 'he', 'id', 'ms', 'vi', 'tl', 'cy', 'uk', 'be', 'bg', 'hr', 'cs', 'da', 'et', 'et', 'fi', 'el', 'iw', 'ja', 'ko', 'lv', 'lt', 'mn', 'nb', 'fa', 'pl', 'pt', 'ro', 'ru', 'sr', 'sk', 'sl', 'es', 'sv', 'tl', 'tr', 'vi'],
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
    const languageCode = options?.languageCode as string | undefined || 'en-US'
    const projectId = options?.projectId as string | undefined

    if (!apiKey) throw new Error('Missing Google Cloud API key')
    if (!projectId) throw new Error('Missing Google Cloud project ID')

    const response = await this.retryOperation(
      () => this.withTimeout(
        fetch(
          'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + apiKey,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: { text },
              voice: { languageCode, name: voiceId },
              audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0 },
            }),
          }
        ),
        options?.timeoutMs as number | undefined
      ),
      options?.maxRetries as number | undefined
    )

    if (!response.ok) {
      throw new Error('Google Cloud TTS request failed: ' + response.status)
    }

    const data = await response.json()
    const audioBytes = data.audioContent
    const audioBuffer = Buffer.from(audioBytes, 'base64')
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' })
    const audioUrl = URL.createObjectURL(audioBlob)

    return { audioUrl, durationMs: 0 }
  }

  async streamAudio(text: string, voiceId: string, options?: Record<string, unknown>): Promise<ReadableStream<Uint8Array>> {
    const apiKey = options?.apiKey as string | undefined
    const languageCode = options?.languageCode as string | undefined || 'en-US'
    const projectId = options?.projectId as string | undefined

    if (!apiKey) throw new Error('Missing Google Cloud API key')
    if (!projectId) throw new Error('Missing Google Cloud project ID')

    const response = await this.retryOperation(
      () => this.withTimeout(
        fetch(
          'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + apiKey,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: { text },
              voice: { languageCode, name: voiceId },
              audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0 },
            }),
          }
        ),
        options?.timeoutMs as number | undefined
      ),
      options?.maxRetries as number | undefined
    )

    if (!response.ok) {
      throw new Error('Google Cloud TTS streaming failed: ' + response.status)
    }

    const data = await response.json()
    const audioBytes = data.audioContent
    const audioBuffer = Buffer.from(audioBytes, 'base64')
    const uint8Array = new Uint8Array(audioBuffer)

    return new ReadableStream({
      start(controller) {
        controller.enqueue(uint8Array)
        controller.close()
      },
    })
  }

  async transcribeAudio(audioUrl: string, language?: string, options?: Record<string, unknown>): Promise<{ text: string; confidence: number }> {
    const apiKey = options?.apiKey as string | undefined
    const projectId = options?.projectId as string | undefined
    const languageCode = language ?? 'en-US'

    if (!apiKey) throw new Error('Missing Google Cloud API key')
    if (!projectId) throw new Error('Missing Google Cloud project ID')

    const response = await this.retryOperation(
      () => this.withTimeout(
        fetch(
          'https://speech.googleapis.com/v1/speech:recognize?key=' + apiKey,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              config: {
                encoding: 'MP3',
                sampleRateHertz: 48000,
                languageCode,
                enableAutomaticPunctuation: true,
              },
              audio: { uri: audioUrl },
            }),
          }
        ),
        options?.timeoutMs as number | undefined
      ),
      options?.maxRetries as number | undefined
    )

    if (!response.ok) {
      throw new Error('Google Cloud STT request failed: ' + response.status)
    }

    const data = await response.json()
    const result = data.results?.[0]
    const transcript = result?.alternatives?.[0]?.transcript ?? ''
    const confidence = result?.alternatives?.[0]?.confidence ?? 0.9

    return { text: transcript, confidence }
  }

  async streamTranscription(audioStream: ReadableStream<Uint8Array>, language?: string, options?: Record<string, unknown>): Promise<{ text: string; confidence: number }> {
    const apiKey = options?.apiKey as string | undefined
    const projectId = options?.projectId as string | undefined
    const _languageCode = language ?? 'en-US'

    if (!apiKey) throw new Error('Missing Google Cloud API key')
    if (!projectId) throw new Error('Missing Google Cloud project ID')

    const chunks: Uint8Array[] = []
    const reader = audioStream.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }
    } finally {
      reader.releaseLock()
    }

    const combinedBuffer = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
    let offset = 0
    for (const chunk of chunks) {
      combinedBuffer.set(chunk, offset)
      offset += chunk.length
    }

    const response = await this.retryOperation(
      () => this.withTimeout(
        fetch(
          'https://speech.googleapis.com/v1/speech:recognize?key=' + apiKey,
          {
            method: 'POST',
            headers: { 'Content-Type': 'audio/mpeg' },
            body: combinedBuffer,
          }
        ),
        options?.timeoutMs as number | undefined
      ),
      options?.maxRetries as number | undefined
    )

    if (!response.ok) {
      throw new Error('Google Cloud streaming STT failed: ' + response.status)
    }

    const data = await response.json()
    const result = data.results?.[0]
    const transcript = result?.alternatives?.[0]?.transcript ?? ''
    const confidence = result?.alternatives?.[0]?.confidence ?? 0.9

    return { text: transcript, confidence }
  }

  async getAvailableVoices(_language?: string): Promise<VoiceModel[]> {
    return [
      { id: 'google-ja-JP-Wavenet-A', providerKey: 'google', modelId: 'ja-JP-Wavenet-A', name: 'Ja-JP Wavenet A', type: 'tts', language: 'ja', gender: 'female', isActive: true, metadata: {}, createdAt: '', updatedAt: '' },
      { id: 'google-en-US-Wavenet-A', providerKey: 'google', modelId: 'en-US-Wavenet-A', name: 'En-US Wavenet A', type: 'tts', language: 'en', gender: 'female', isActive: true, metadata: {}, createdAt: '', updatedAt: '' },
      { id: 'google-en-US-Wavenet-B', providerKey: 'google', modelId: 'en-US-Wavenet-B', name: 'En-US Wavenet B', type: 'tts', language: 'en', gender: 'male', isActive: true, metadata: {}, createdAt: '', updatedAt: '' },
      { id: 'google-en-US-Wavenet-C', providerKey: 'google', modelId: 'en-US-Wavenet-C', name: 'En-US Wavenet C', type: 'tts', language: 'en', gender: 'male', isActive: true, metadata: {}, createdAt: '', updatedAt: '' },
    ]
  }

  async getSupportedLanguages(): Promise<SupportedLanguage[]> {
    return [
      { id: '', providerKey: 'google', languageCode: 'en', languageName: 'English', isActive: true, createdAt: '', updatedAt: '' },
      { id: '', providerKey: 'google', languageCode: 'es', languageName: 'Spanish', isActive: true, createdAt: '', updatedAt: '' },
      { id: '', providerKey: 'google', languageCode: 'fr', languageName: 'French', isActive: true, createdAt: '', updatedAt: '' },
      { id: '', providerKey: 'google', languageCode: 'de', languageName: 'German', isActive: true, createdAt: '', updatedAt: '' },
      { id: '', providerKey: 'google', languageCode: 'it', languageName: 'Italian', isActive: true, createdAt: '', updatedAt: '' },
    ]
  }

  async verifyCredentials(credentials: Record<string, unknown>): Promise<{ valid: boolean; error?: string }> {
    const apiKey = credentials?.apiKey as string | undefined
    const projectId = credentials?.projectId as string | undefined
    if (!apiKey) return { valid: false, error: 'API key is required' }
    if (!projectId) return { valid: false, error: 'Project ID is required' }

    try {
      const response = await this.retryOperation(
        () => this.withTimeout(
          fetch('https://texttospeech.googleapis.com/v1/voices?key=' + apiKey),
          10000
        ),
        2
      )
      if (response.ok) return { valid: true }
      return { valid: false, error: 'Invalid credentials: ' + response.status }
    } catch {
      return { valid: false, error: 'Failed to connect to Google Cloud Speech' }
    }
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'down'; latencyMs: number | null; details: Record<string, unknown> }> {
    const startTime = Date.now()
    try {
      const apiKey = ''
      const response = await fetch(
        'https://texttospeech.googleapis.com/v1/voices?key=' + apiKey,
        { signal: AbortSignal.timeout(5000) }
      )
      const elapsed = Date.now() - startTime
      this.latencyMs = elapsed
      this.lastHealthCheck = new Date().toISOString()
      if (response.ok) {
        this.healthStatus = 'healthy'
        return { status: 'healthy', latencyMs: elapsed, details: { provider: 'google' } }
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