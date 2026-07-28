import { CallRepository } from '../repositories/call.repository'
import { ProviderSelectionService } from './providerSelection.service'
import { ProviderDIContainer } from '../lib/providers/ProviderDIContainer'
import { recordAudit } from '../lib/audit'
import { logger } from '../lib/logger'
import type { Call } from '@rds/types'
import type { ITelephonyProvider } from '../lib/telephony/ITelephonyProvider'

export class CallExecutionService {
  private repository = new CallRepository()
  private selectionService = new ProviderSelectionService()
  private diContainer = ProviderDIContainer.getInstance()

  async startCall(options: {
    to: string
    from: string
    callerId?: string
    organizationId: string
    campaignId?: string
    contactId?: string
    agentId?: string
    preferredTtsProvider?: string
    preferredSttProvider?: string
    ttsVoiceId?: string
    metadata?: Record<string, unknown>
  }): Promise<{ call: Call; callSid: string }> {
    const orgId = options.organizationId
    const ttsProvider = await this.selectionService.selectTtsProvider(orgId, options.preferredTtsProvider)
    if (!ttsProvider) {
      throw new Error('No active TTS provider available')
    }

    const diRegistry = this.diContainer.getRegistry()
    const telephonyProvider = diRegistry.getProvider('twilio') as ITelephonyProvider | undefined
    if (!telephonyProvider || !telephonyProvider.isActive) {
      throw new Error('No active telephony provider available')
    }

    const dialResult = await telephonyProvider.dial({
      to: options.to,
      from: options.from,
      callerId: options.callerId,
      metadata: options.metadata,
    })

    const call = await this.repository.createCall(orgId, 'system', {
      campaignId: options.campaignId ?? null,
      contactId: options.contactId ?? null,
      agentId: options.agentId ?? null,
      direction: 'outbound',
      status: 'ringing',
      provider: 'twilio',
      providerCallSid: dialResult.callSid,
      toNumber: options.to,
      fromNumber: options.from,
      callerId: options.callerId ?? options.from,
    })

    await recordAudit({
      action: 'call.started',
      actorId: 'system',
      actorType: 'system',
      resourceType: 'call',
      resourceId: call.id,
      organizationId: orgId,
      before: { status: 'ringing', providerCallSid: dialResult.callSid },
    })

    logger.info({ callId: call.id, callSid: dialResult.callSid }, 'Call started')

    return { call, callSid: dialResult.callSid }
  }

  async answerCall(callSid: string, organizationId: string): Promise<void> {
    const telephonyProvider = this.diContainer.getRegistry().getProvider('twilio') as ITelephonyProvider | undefined
    if (!telephonyProvider) {
      throw new Error('No telephony provider available')
    }
    await telephonyProvider.answer(callSid)

    const existing = await this.repository.findById(organizationId, callSid)
    if (existing) {
      await this.repository.updateStatus(callSid, 'in-progress', { organizationId })
      await recordAudit({
        action: 'call.answered',
        actorId: 'system',
        actorType: 'system',
        resourceType: 'call',
        resourceId: callSid,
        organizationId,
      })
    }
  }

  async endCall(callSid: string, organizationId: string): Promise<void> {
    const telephonyProvider = this.diContainer.getRegistry().getProvider('twilio') as ITelephonyProvider | undefined
    if (!telephonyProvider) {
      throw new Error('No telephony provider available')
    }
    await telephonyProvider.hangup(callSid)

    const existing = await this.repository.findById(organizationId, callSid)
    if (existing) {
      await this.repository.updateStatus(callSid, 'completed', { organizationId, outcome: 'completed' })
      await recordAudit({
        action: 'call.ended',
        actorId: 'system',
        actorType: 'system',
        resourceType: 'call',
        resourceId: callSid,
        organizationId,
        after: { status: 'completed' },
      })
    }
  }

  async playCallAudio(callSid: string, organizationId: string, text: string, voiceId?: string): Promise<void> {
    const ttsProvider = await this.selectionService.selectTtsProvider(organizationId)
    if (!ttsProvider) {
      throw new Error('No TTS provider available')
    }

    const diContainer = ProviderDIContainer.getInstance()
    const provider = diContainer.getProvider(ttsProvider.key)
    if (!provider) {
      throw new Error(`TTS provider ${ttsProvider.key} not found`)
    }

    const audioStream = await provider.streamAudio(
      text,
      voiceId ?? '',
      { organizationId }
    )

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

    const audioBlob = new Blob(chunks, { type: 'audio/mpeg' })
    const audioUrl = URL.createObjectURL(audioBlob)

    const telephonyProvider = this.diContainer.getRegistry().getProvider('twilio') as ITelephonyProvider | undefined
    if (!telephonyProvider) {
      throw new Error('No telephony provider available')
    }

    await telephonyProvider.playAudio(callSid, audioUrl)
  }

  async recordCall(callSid: string, organizationId: string): Promise<{ recordingUrl: string }> {
    const telephonyProvider = this.diContainer.getRegistry().getProvider('twilio') as ITelephonyProvider | undefined
    if (!telephonyProvider) {
      throw new Error('No telephony provider available')
    }

    const result = await telephonyProvider.startRecording(callSid)

    const existing = await this.repository.findById(organizationId, callSid)
    if (existing) {
      await this.repository.updateStatus(callSid, existing.status, { organizationId, recordingUrl: result.recordingUrl })
    }

    return result
  }

  async stopCallRecording(callSid: string, organizationId: string): Promise<void> {
    const telephonyProvider = this.diContainer.getRegistry().getProvider('twilio') as ITelephonyProvider | undefined
    if (!telephonyProvider) {
      throw new Error('No telephony provider available')
    }
    await telephonyProvider.stopRecording(callSid)
  }

  async getCallStatus(callSid: string): Promise<{ status: string; durationMs?: number; recordingUrl?: string }> {
    const telephonyProvider = this.diContainer.getRegistry().getProvider('twilio') as ITelephonyProvider | undefined
    if (!telephonyProvider) {
      throw new Error('No telephony provider available')
    }
    return telephonyProvider.getCallStatus(callSid)
  }

  async executeCallFlow(options: {
    callSid: string
    to: string
    from: string
    organizationId: string
    ttsText: string
    voiceId?: string
  }): Promise<{ callSid: string; status: string; recordingUrl?: string }> {
    const { callSid, ttsText, voiceId, organizationId } = options

    await this.playCallAudio(callSid, organizationId, ttsText, voiceId)

    await this.recordCall(callSid, organizationId)

    const status = await this.getCallStatus(callSid)

    return { callSid, status: status.status, recordingUrl: status.recordingUrl }
  }
}