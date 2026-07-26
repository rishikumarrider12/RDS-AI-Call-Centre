import type { IVoiceProvider } from '../IVoiceProvider'
import type { VoiceProviderCategory, VoiceModel, SupportedLanguage } from '@rds/types'

const DEFAULT_TIMEOUT_MS = 30000
const DEFAULT_MAX_RETRIES = 3
const DEFAULT_BASE_DELAY_MS = 1000

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class OpenAIProvider implements IVoiceProvider {
  key = 'openai'
  name = 'OpenAI Voice'
  category = 'both' as VoiceProviderCategory
  capabilities = {
    tts: true,
    stt: true,
    streaming: true,
    voiceListing: true,
    languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'ro', 'hu', 'cs', 'sk', 'sl', 'hr', 'bg', 'uk', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi', 'th', 'tr', 'nl', 'sv', 'da', 'no', 'fi', 'el', 'he'],
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
    const model = options?.model as string | undefined || 'tts-1'

    if (!apiKey) throw new Error('Missing OpenAI API key')

    const response = await this.retryOperation(
      () => this.withTimeout(
        fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiKey,
          },
          body: JSON.stringify({
            model,
            voice: voiceId,
            input: text,
            response_format: 'mp3',
            speed: options?.speed ?? 1.0,
          }),
        }),
        options?.timeoutMs as number | undefined
      ),
      options?.maxRetries as number | undefined
    )

    if (!response.ok) {
      throw new Error('OpenAI TTS request failed: ' + response.status)
    }

    const audioBuffer = await response.arrayBuffer()
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' })
    const audioUrl = URL.createObjectURL(audioBlob)

    return { audioUrl, durationMs: 0 }
  }

  async streamAudio(text: string, voiceId: string, options?: Record<string, unknown>): Promise<ReadableStream<Uint8Array>> {
    const apiKey = options?.apiKey as string | undefined
    const model = options?.model as string | undefined || 'tts-1'

    if (!apiKey) throw new Error('Missing OpenAI API key')

    const response = await this.retryOperation(
      () => this.withTimeout(
        fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiKey,
          },
          body: JSON.stringify({
            model,
            voice: voiceId,
            input: text,
            response_format: 'opus',
            speed: options?.speed ?? 1.0,
          }),
        }),
        options?.timeoutMs as number | undefined
      ),
      options?.maxRetries as number | undefined
    )

    if (!response.ok) {
      throw new Error('OpenAI streaming request failed: ' + response.status)
    }

    if (!response.body) {
      throw new Error('OpenAI streaming: response body is null')
    }

    return response.body
  }

  async transcribeAudio(audioUrl: string, language?: string, options?: Record<string, unknown>): Promise<{ text: string; confidence: number }> {
    const apiKey = options?.apiKey as string | undefined
    const model = options?.model as string | undefined || 'whisper-1'

    if (!apiKey) throw new Error('Missing OpenAI API key')

    const response = await this.retryOperation(
      () => this.withTimeout(
        fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + apiKey,
          },
          body: JSON.stringify({
            model,
            file: audioUrl,
            language: language ?? undefined,
            response_format: 'verbose',
          }),
        }),
        options?.timeoutMs as number | undefined
      ),
      options?.maxRetries as number | undefined
    )

    if (!response.ok) {
      throw new Error('OpenAI STT request failed: ' + response.status)
    }

    const data = await response.json()
    return { text: data.text ?? '', confidence: 0.95 }
  }

  async streamTranscription(audioStream: ReadableStream<Uint8Array>, language?: string, options?: Record<string, unknown>): Promise<{ text: string; confidence: number }> {
    const apiKey = options?.apiKey as string | undefined
    if (!apiKey) throw new Error('Missing OpenAI API key')

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

    const blob = new Blob([combinedBuffer], { type: 'audio/webm' })
    const formData = new FormData()
    formData.append('file', blob, 'audio.webm')
    formData.append('model', 'whisper-1')
    if (language) formData.append('language', language)
    formData.append('response_format', 'verbose')

    const response = await this.retryOperation(
      () => this.withTimeout(
        fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + apiKey,
          },
          body: formData,
        }),
        options?.timeoutMs as number | undefined
      ),
      options?.maxRetries as number | undefined
    )

    if (!response.ok) {
      throw new Error('OpenAI streaming STT failed: ' + response.status)
    }

    const data = await response.json()
    return { text: data.text ?? '', confidence: 0.95 }
  }

  async getAvailableVoices(_language?: string): Promise<VoiceModel[]> {
    return [
      { id: 'openai-onyx', providerKey: 'openai', modelId: 'onyx', name: 'Onyx', type: 'tts', language: 'en', gender: 'male', isActive: true, metadata: {}, createdAt: '', updatedAt: '' },
      { id: 'openai-alloy', providerKey: 'openai', modelId: 'alloy', name: 'Alloy', type: 'tts', language: 'en', gender: 'neutral', isActive: true, metadata: {}, createdAt: '', updatedAt: '' },
      { id: 'openai-nova', providerKey: 'openai', modelId: 'nova', name: 'Nova', type: 'tts', language: 'en', gender: 'female', isActive: true, metadata: {}, createdAt: '', updatedAt: '' },
      { id: 'openai-shimmer', providerKey: 'openai', modelId: 'shimmer', name: 'Shimmer', type: 'tts', language: 'en', gender: 'female', isActive: true, metadata: {}, createdAt: '', updatedAt: '' },
    ]
  }

  async getSupportedLanguages(): Promise<SupportedLanguage[]> {
    return [
      { id: '', providerKey: 'openai', languageCode: 'en', languageName: 'English', isActive: true, createdAt: '', updatedAt: '' },
      { id: '', providerKey: 'openai', languageCode: 'es', languageName: 'Spanish', isActive: true, createdAt: '', updatedAt: '' },
      { id: '', providerKey: 'openai', languageCode: 'fr', languageName: 'French', isActive: true, createdAt: '', updatedAt: '' },
      { id: '', providerKey: 'openai', languageCode: 'de', languageName: 'German', isActive: true, createdAt: '', updatedAt: '' },
      { id: '', providerKey: 'openai', languageCode: 'it', languageName: 'Italian', isActive: true, createdAt: '', updatedAt: '' },
    ]
  }

  async verifyCredentials(credentials: Record<string, unknown>): Promise<{ valid: boolean; error?: string }> {
    const apiKey = credentials?.apiKey as string | undefined
    if (!apiKey) return { valid: false, error: 'API key is required' }

    try {
      const response = await this.retryOperation(
        () => this.withTimeout(
          fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': 'Bearer ' + apiKey },
          })
        )
      )
      if (response.ok) return { valid: true }
      return { valid: false, error: 'Invalid API key: ' + response.status }
    } catch {
      return { valid: false, error: 'Failed to connect to OpenAI' }
    }
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'down'; latencyMs: number | null; details: Record<string, unknown> }> {
    const startTime = Date.now()
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': 'Bearer ' + (await this.getApiKey()) },
        signal: AbortSignal.timeout(5000),
      })
      const elapsed = Date.now() - startTime
      this.latencyMs = elapsed
      this.lastHealthCheck = new Date().toISOString()
      if (response.ok) {
        this.healthStatus = 'healthy'
        return { status: 'healthy', latencyMs: elapsed, details: { provider: 'openai' } }
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

  private async getApiKey(): Promise<string> {
    return ''
  }
}