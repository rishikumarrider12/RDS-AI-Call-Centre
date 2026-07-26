import type { IVoiceProvider } from '../IVoiceProvider'
import type { VoiceProviderCategory, VoiceModel, SupportedLanguage } from '@rds/types'

const DEFAULT_TIMEOUT_MS = 30000
const DEFAULT_MAX_RETRIES = 3
const DEFAULT_BASE_DELAY_MS = 1000

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class AzureSpeechProvider implements IVoiceProvider {
  key = 'azure'
  name = 'Azure Speech'
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
    const region = options?.region as string | undefined || 'eastus'
    const endpoint = options?.endpoint as string | undefined || 'https://' + region + '.tts.speech.microsoft.com'

    if (!apiKey) throw new Error('Missing Azure Speech API key')

    const response = await this.retryOperation(
      () => this.withTimeout(
        fetch(endpoint + '/cognitiveservices/v1', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/ssml+xml',
            'Ocp-Apim-Subscription-Key': apiKey,
            'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
            'Authorization': 'Bearer ' + apiKey,
          },
          body: '<speak version="1.0" xml:lang="en-US"><voice name="' + voiceId + '">' + text + '</voice></speak>',
        }),
        options?.timeoutMs as number | undefined
      ),
      options?.maxRetries as number | undefined
    )

    if (!response.ok) {
      throw new Error('Azure Speech TTS request failed: ' + response.status)
    }

    const audioBuffer = await response.arrayBuffer()
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' })
    const audioUrl = URL.createObjectURL(audioBlob)

    return { audioUrl, durationMs: 0 }
  }

  async streamAudio(text: string, voiceId: string, options?: Record<string, unknown>): Promise<ReadableStream<Uint8Array>> {
    const apiKey = options?.apiKey as string | undefined
    const region = options?.region as string | undefined || 'eastus'
    const endpoint = options?.endpoint as string | undefined || 'https://' + region + '.tts.speech.microsoft.com'

    if (!apiKey) throw new Error('Missing Azure Speech API key')

    const response = await this.retryOperation(
      () => this.withTimeout(
        fetch(endpoint + '/cognitiveservices/v1', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/ssml+xml',
            'Ocp-Apim-Subscription-Key': apiKey,
            'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
            'Authorization': 'Bearer ' + apiKey,
          },
          body: '<speak version="1.0" xml:lang="en-US"><voice name="' + voiceId + '">' + text + '</voice></speak>',
        }),
        options?.timeoutMs as number | undefined
      ),
      options?.maxRetries as number | undefined
    )

    if (!response.ok) {
      throw new Error('Azure Speech streaming request failed: ' + response.status)
    }

    if (!response.body) {
      throw new Error('Azure Speech streaming: response body is null')
    }

    return response.body
  }

  async transcribeAudio(audioUrl: string, language?: string, options?: Record<string, unknown>): Promise<{ text: string; confidence: number }> {
    const apiKey = options?.apiKey as string | undefined
    const region = options?.region as string | undefined || 'eastus'
    const endpoint = options?.endpoint as string | undefined || 'https://' + region + '.stt.speech.microsoft.com'

    if (!apiKey) throw new Error('Missing Azure Speech API key')

    const response = await this.retryOperation(
      () => this.withTimeout(
        fetch(endpoint + '/speechtotext?language=' + (language ?? 'en-US') + '&format=detailed', {
          method: 'POST',
          headers: {
            'Content-Type': 'audio/mpeg',
            'Ocp-Apim-Subscription-Key': apiKey,
          },
          body: JSON.stringify({ audio: audioUrl }),
        }),
        options?.timeoutMs as number | undefined
      ),
      options?.maxRetries as number | undefined
    )

    if (!response.ok) {
      throw new Error('Azure Speech STT request failed: ' + response.status)
    }

    const data = await response.json()
    return { text: data.displayText ?? '', confidence: data.nBest?.length ? (data.nBest[0].confidence ?? 0.9) : 0.9 }
  }

  async streamTranscription(audioStream: ReadableStream<Uint8Array>, language?: string, options?: Record<string, unknown>): Promise<{ text: string; confidence: number }> {
    const apiKey = options?.apiKey as string | undefined
    const region = options?.region as string | undefined || 'eastus'
    const endpoint = options?.endpoint as string | undefined || 'https://' + region + '.stt.speech.microsoft.com'

    if (!apiKey) throw new Error('Missing Azure Speech API key')

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
        fetch(endpoint + '/speechtotext?language=' + (language ?? 'en-US') + '&format=detailed&enableContinuousRecognition=true', {
          method: 'POST',
          headers: {
            'Content-Type': 'audio/mpeg',
            'Ocp-Apim-Subscription-Key': apiKey,
            'Transfer-Encoding': 'chunked',
          },
          body: combinedBuffer,
        }),
        options?.timeoutMs as number | undefined
      ),
      options?.maxRetries as number | undefined
    )

    if (!response.ok) {
      throw new Error('Azure Speech streaming STT failed: ' + response.status)
    }

    const data = await response.json()
    return { text: data.displayText ?? '', confidence: data.nBest?.length ? (data.nBest[0].confidence ?? 0.9) : 0.9 }
  }

  async getAvailableVoices(_language?: string): Promise<VoiceModel[]> {
    return [
      { id: 'azure-aria', providerKey: 'azure', modelId: 'aria', name: 'Aria', type: 'tts', language: 'en', gender: 'female', isActive: true, metadata: {}, createdAt: '', updatedAt: '' },
      { id: 'azure-guy', providerKey: 'azure', modelId: 'guy', name: 'Guy', type: 'tts', language: 'en', gender: 'male', isActive: true, metadata: {}, createdAt: '', updatedAt: '' },
      { id: 'azure-jenny', providerKey: 'azure', modelId: 'jenny', name: 'Jenny', type: 'tts', language: 'en', gender: 'female', isActive: true, metadata: {}, createdAt: '', updatedAt: '' },
      { id: 'azure-tony', providerKey: 'azure', modelId: 'tony', name: 'Tony', type: 'tts', language: 'en', gender: 'male', isActive: true, metadata: {}, createdAt: '', updatedAt: '' },
    ]
  }

  async getSupportedLanguages(): Promise<SupportedLanguage[]> {
    return [
      { id: '', providerKey: 'azure', languageCode: 'en', languageName: 'English', isActive: true, createdAt: '', updatedAt: '' },
      { id: '', providerKey: 'azure', languageCode: 'es', languageName: 'Spanish', isActive: true, createdAt: '', updatedAt: '' },
      { id: '', providerKey: 'azure', languageCode: 'fr', languageName: 'French', isActive: true, createdAt: '', updatedAt: '' },
      { id: '', providerKey: 'azure', languageCode: 'de', languageName: 'German', isActive: true, createdAt: '', updatedAt: '' },
      { id: '', providerKey: 'azure', languageCode: 'it', languageName: 'Italian', isActive: true, createdAt: '', updatedAt: '' },
    ]
  }

  async verifyCredentials(credentials: Record<string, unknown>): Promise<{ valid: boolean; error?: string }> {
    const apiKey = credentials?.apiKey as string | undefined
    const region = credentials?.region as string | undefined
    if (!apiKey) return { valid: false, error: 'API key is required' }
    if (!region) return { valid: false, error: 'Region is required' }

    try {
      const endpoint = 'https://' + region + '.tts.speech.microsoft.com/cognitiveservices/v1'
      const response = await this.retryOperation(
        () => this.withTimeout(
          fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/ssml+xml',
              'Ocp-Apim-Subscription-Key': apiKey,
              'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
            },
            body: '<speak version="1.0" xml:lang="en-US"><voice name="en-US-AriaNeural">Test</voice></speak>',
          }),
          10000
        ),
        2
      )
      if (response.ok) return { valid: true }
      return { valid: false, error: 'Invalid credentials: ' + response.status }
    } catch {
      return { valid: false, error: 'Failed to connect to Azure Speech' }
    }
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'down'; latencyMs: number | null; details: Record<string, unknown> }> {
    const startTime = Date.now()
    try {
      const apiKey = ''
      const region = 'eastus'
      const endpoint = 'https://' + region + '.tts.speech.microsoft.com/cognitiveservices/v1'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/ssml+xml',
          'Ocp-Apim-Subscription-Key': apiKey,
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        },
        body: '<speak version="1.0" xml:lang="en-US"><voice name="en-US-AriaNeural">Test</voice></speak>',
        signal: AbortSignal.timeout(5000),
      })
      const elapsed = Date.now() - startTime
      this.latencyMs = elapsed
      this.lastHealthCheck = new Date().toISOString()
      if (response.ok) {
        this.healthStatus = 'healthy'
        return { status: 'healthy', latencyMs: elapsed, details: { provider: 'azure' } }
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