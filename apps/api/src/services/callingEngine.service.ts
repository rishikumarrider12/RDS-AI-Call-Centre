import { CallRepository } from '../repositories/call.repository'
import type { Call, CallEvent, CallTranscriptLine } from '@rds/types'
import { recordAudit } from '../lib/audit'

export class CallingEngineService {
  private repository = new CallRepository()

  private mapCall(dbCall: any): Call {
    return {
      id: dbCall.id,
      organizationId: dbCall.organization_id,
      campaignId: dbCall.campaign_id ?? null,
      contactId: dbCall.contact_id ?? null,
      agentId: dbCall.agent_id ?? null,
      callQueueId: dbCall.call_queue_id ?? null,
      direction: dbCall.direction,
      status: dbCall.status,
      outcome: dbCall.outcome ?? null,
      provider: dbCall.provider ?? null,
      providerCallSid: dbCall.provider_call_sid ?? null,
      toNumber: dbCall.to_number,
      fromNumber: dbCall.from_number,
      durationSeconds: dbCall.duration_seconds ?? 0,
      billSeconds: dbCall.bill_seconds ?? 0,
      recordingUrl: dbCall.recording_url ?? null,
      recordingDuration: dbCall.recording_duration ?? null,
      cost: dbCall.cost ?? null,
      currency: dbCall.currency ?? null,
      dialAttempt: dbCall.dial_attempt ?? 1,
      startAt: dbCall.start_at ?? null,
      answerAt: dbCall.answer_at ?? null,
      endAt: dbCall.end_at ?? null,
      hangupCause: dbCall.hangupCause ?? dbCall.hangup_cause ?? null,
      transcript: dbCall.transcript ?? null,
      summary: dbCall.summary ?? null,
      metadata: dbCall.metadata ?? {},
      createdAt: dbCall.created_at,
      updatedAt: dbCall.updated_at,
    }
  }

  async start(organizationId: string, actorId: string, input: Record<string, unknown>): Promise<Call> {
    const dbCall = await this.repository.createCall(organizationId, actorId, input)
    await this.repository.createAiCall(organizationId, dbCall.id, input)
    await this.repository.createSession(dbCall.id, organizationId, { agentId: input.agentId ?? null, contactId: input.contactId ?? null })
    await this.repository.addEvent(dbCall.id, organizationId, 'start', { direction: input.direction, toNumber: input.toNumber }, actorId)
    const call = this.mapCall(dbCall)
    await recordAudit({
      organizationId,
      action: 'call.start',
      actorId,
      resourceType: 'call',
      resourceId: dbCall.id,
      after: call as unknown as Record<string, unknown>,
    })
    return call
  }

  async end(organizationId: string, actorId: string, id: string): Promise<Call> {
    const dbCall = await this.repository.findById(organizationId, id)
    if (!dbCall) throw new Error('Call not found')
    const duration = dbCall.start_at ? Math.max(0, Math.round((Date.now() - new Date(dbCall.start_at).getTime()) / 1000)) : 0
    const updated = await this.repository.updateStatus(id, 'ended', { ended_at: new Date().toISOString(), duration_seconds: duration })
    await this.repository.updateSession(id, { status: 'ended', ended_at: new Date().toISOString() })
    await this.repository.updateAiCall(id, { status: 'ended', ended_at: new Date().toISOString() })
    await this.repository.addEvent(id, organizationId, 'end', { durationSeconds: duration }, actorId)
    const call = this.mapCall(updated)
    await recordAudit({
      organizationId,
      action: 'call.end',
      actorId,
      resourceType: 'call',
      resourceId: id,
      after: call as unknown as Record<string, unknown>,
    })
    return call
  }

  async pause(organizationId: string, actorId: string, id: string): Promise<Call> {
    const dbCall = await this.repository.findById(organizationId, id)
    if (!dbCall) throw new Error('Call not found')
    const updated = await this.repository.updateStatus(id, 'paused')
    await this.repository.updateSession(id, { status: 'held' })
    await this.repository.updateAiCall(id, { status: 'paused' })
    await this.repository.addEvent(id, organizationId, 'pause', {}, actorId)
    const call = this.mapCall(updated)
    await recordAudit({
      organizationId,
      action: 'call.pause',
      actorId,
      resourceType: 'call',
      resourceId: id,
      after: call as unknown as Record<string, unknown>,
    })
    return call
  }

  async resume(organizationId: string, actorId: string, id: string): Promise<Call> {
    const dbCall = await this.repository.findById(organizationId, id)
    if (!dbCall) throw new Error('Call not found')
    const updated = await this.repository.updateStatus(id, 'connected')
    await this.repository.updateSession(id, { status: 'active' })
    await this.repository.updateAiCall(id, { status: 'connected' })
    await this.repository.addEvent(id, organizationId, 'resume', {}, actorId)
    const call = this.mapCall(updated)
    await recordAudit({
      organizationId,
      action: 'call.resume',
      actorId,
      resourceType: 'call',
      resourceId: id,
      after: call as unknown as Record<string, unknown>,
    })
    return call
  }

  async transfer(organizationId: string, actorId: string, id: string, toAgentId: string): Promise<Call> {
    const dbCall = await this.repository.findById(organizationId, id)
    if (!dbCall) throw new Error('Call not found')
    const updated = await this.repository.updateStatus(id, 'connected', { agent_id: toAgentId })
    await this.repository.updateSession(id, { status: 'transferred', transferred_to_agent_id: toAgentId, agent_id: toAgentId })
    await this.repository.updateAiCall(id, { status: 'connected', agent_id: toAgentId })
    await this.repository.addEvent(id, organizationId, 'transfer', { toAgentId }, actorId)
    const call = this.mapCall(updated)
    await recordAudit({
      organizationId,
      action: 'call.transfer',
      actorId,
      resourceType: 'call',
      resourceId: id,
      after: call as unknown as Record<string, unknown>,
    })
    return call
  }

  async getTranscript(organizationId: string, callId: string): Promise<CallTranscriptLine[]> {
    const dbCall = await this.repository.findById(organizationId, callId)
    if (!dbCall) throw new Error('Call not found')
    const transcripts = await this.repository.getTranscripts(callId)
    return transcripts.map((t) => ({
      sequence: t.sequence,
      channel: t.channel,
      text: t.text,
      confidence: t.confidence ?? null,
      isFinal: t.is_final ?? false,
    }))
  }

  async getEvents(organizationId: string, callId: string): Promise<CallEvent[]> {
    const dbCall = await this.repository.findById(organizationId, callId)
    if (!dbCall) throw new Error('Call not found')
    const events = await this.repository.getEvents(callId)
    return events.map((e) => ({
      id: e.id,
      callId: e.call_id,
      organizationId: e.organization_id,
      eventType: e.event_type as CallEvent['eventType'],
      payload: e.payload ?? {},
      createdBy: e.created_by ?? null,
      createdAt: e.created_at,
    }))
  }
}
