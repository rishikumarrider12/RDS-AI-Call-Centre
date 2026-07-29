import type { ITelephonyProvider } from '../ITelephonyProvider'

export class TwilioProvider implements ITelephonyProvider {
  key = 'twilio'
  name = 'Twilio'
  category = 'pstn' as const
  capabilities = {
    dial: true,
    answer: true,
    hangup: true,
    playAudio: true,
    recordCall: true,
    transcribeLive: false,
    sip: true,
  }
  isActive = true
  private accountSid: string
  private authToken: string
  private fromNumber: string

  constructor(config: Record<string, unknown>) {
    this.accountSid = (config.accountSid as string) ?? ''
    this.authToken = (config.authToken as string) ?? ''
    this.fromNumber = (config.fromNumber as string) ?? ''
  }

  private async request(method: string, path: string, body?: Record<string, unknown>): Promise<Response> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}${path}`
    const headers = new Headers()
    headers.set('Authorization', 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64'))
    headers.set('Content-Type', 'application/x-www-form-urlencoded')
    const options: RequestInit = { method, headers }
    if (body) {
      options.body = new URLSearchParams(body as Record<string, string>).toString()
    }
    return fetch(url, options)
  }

  async dial(options: { to: string; from: string; callerId?: string; metadata?: Record<string, unknown> }): Promise<{ callSid: string }> {
    const from = options.from || this.fromNumber
    const body: Record<string, string> = { To: options.to, From: from }
    if (options.callerId) body.CallerId = options.callerId
    const response = await this.request('POST', '/Calls.json', body)
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Twilio dial failed: ${response.status} ${error}`)
    }
    const data = await response.json()
    return { callSid: data.sid }
  }

  async answer(callSid: string): Promise<void> {
    await this.request('POST', `/Calls/${callSid}.json`, { Status: 'answered' })
  }

  async hangup(callSid: string): Promise<void> {
    await this.request('POST', `/Calls/${callSid}.json`, { Status: 'completed' })
  }

  async playAudio(callSid: string, audioUrl: string): Promise<void> {
    const twiml = `<Response><Play>${audioUrl}</Play></Response>`
    await this.request('POST', `/Calls/${callSid}.json`, { Twiml: twiml })
  }

  async startRecording(callSid: string): Promise<{ recordingUrl: string }> {
    const response = await this.request('POST', `/Calls/${callSid}.json`, { Record: 'true', RecordingStatusCallback: '' })
    if (!response.ok) {
      throw new Error(`Twilio startRecording failed: ${response.status}`)
    }
    return { recordingUrl: '' }
  }

  async stopRecording(callSid: string): Promise<void> {
    await this.request('POST', `/Calls/${callSid}.json`, { Record: 'false' })
  }

  async getCallStatus(callSid: string): Promise<{ status: 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer'; durationMs?: number; recordingUrl?: string }> {
    const response = await this.request('GET', `/Calls/${callSid}.json`)
    if (!response.ok) {
      throw new Error(`Twilio getCallStatus failed: ${response.status}`)
    }
    const data = await response.json()
    const statusMap: Record<string, 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer'> = {
      ringing: 'ringing',
      'in-progress': 'in-progress',
      completed: 'completed',
      failed: 'failed',
      busy: 'busy',
      'no-answer': 'no-answer',
    }
    return {
      status: statusMap[data.status] ?? data.status,
      durationMs: data.duration ? parseInt(data.duration, 10) * 1000 : undefined,
      recordingUrl: data.recordingUrl,
    }
  }

  async verifyCredentials(credentials: Record<string, unknown>): Promise<{ valid: boolean; error?: string }> {
    const sid = (credentials.accountSid as string) ?? this.accountSid
    const token = (credentials.authToken as string) ?? this.authToken
    if (!sid || !token) {
      return { valid: false, error: 'Missing account SID or auth token' }
    }
    try {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
         headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64') },
      })
      if (response.ok) {
        return { valid: true }
      }
      return { valid: false, error: `Invalid credentials (${response.status})` }
    } catch (err) {
      return { valid: false, error: (err as Error).message }
    }
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'down'; latencyMs: number | null; details: Record<string, unknown> }> {
    const start = Date.now()
    try {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}.json`, {
        headers: { Authorization: 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64') },
      })
      const latencyMs = Date.now() - start
      if (response.ok) {
        return { status: 'healthy', latencyMs, details: { provider: 'twilio', accountSid: this.accountSid } }
      }
      return { status: 'degraded', latencyMs, details: { provider: 'twilio', statusCode: response.status } }
    } catch (err) {
      return { status: 'down', latencyMs: null, details: { provider: 'twilio', error: (err as Error).message } }
    }
  }
}