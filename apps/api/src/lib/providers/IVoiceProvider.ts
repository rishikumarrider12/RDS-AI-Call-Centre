import type { VoiceProviderCategory, VoiceModel, SupportedLanguage } from '@rds/types'

export interface IVoiceProvider {
  key: string
  name: string
  category: VoiceProviderCategory
  capabilities: Record<string, unknown>
  isActive: boolean
  healthStatus: 'healthy' | 'degraded' | 'down' | 'unknown'
  lastHealthCheck: string | null
  latencyMs: number | null
  synthesizeSpeech(text: string, voiceId: string, options?: Record<string, unknown>): Promise<{ audioUrl: string; durationMs: number }>
  streamAudio(text: string, voiceId: string, options?: Record<string, unknown>): Promise<ReadableStream<Uint8Array>>
  transcribeAudio(audioUrl: string, language?: string, options?: Record<string, unknown>): Promise<{ text: string; confidence: number }>
  streamTranscription(audioStream: ReadableStream<Uint8Array>, language?: string, options?: Record<string, unknown>): Promise<{ text: string; confidence: number }>
  getAvailableVoices(language?: string): Promise<VoiceModel[]>
  getSupportedLanguages(): Promise<SupportedLanguage[]>
  verifyCredentials(credentials: Record<string, unknown>): Promise<{ valid: boolean; error?: string }>
  healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'down'; latencyMs: number | null; details: Record<string, unknown> }>
  retryOperation<T>(operation: () => Promise<T>, maxRetries?: number, baseDelayMs?: number): Promise<T>
  withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T>
}