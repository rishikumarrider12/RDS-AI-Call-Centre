export interface ITelephonyProvider {
  key: string
  name: string
  category: 'sip' | 'pstn' | 'webrtc'
  capabilities: Record<string, unknown>
  isActive: boolean

  dial(options: {
    to: string
    from: string
    callerId?: string
    metadata?: Record<string, unknown>
  }): Promise<{ callSid: string }>

  answer(callSid: string): Promise<void>

  hangup(callSid: string): Promise<void>

  playAudio(callSid: string, audioUrl: string): Promise<void>

  startRecording(callSid: string): Promise<{ recordingUrl: string }>

  stopRecording(callSid: string): Promise<void>

  getCallStatus(callSid: string): Promise<{
    status: 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer'
    durationMs?: number
    recordingUrl?: string
  }>

  verifyCredentials(credentials: Record<string, unknown>): Promise<{ valid: boolean; error?: string }>

  healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'down'; latencyMs: number | null; details: Record<string, unknown> }>
}