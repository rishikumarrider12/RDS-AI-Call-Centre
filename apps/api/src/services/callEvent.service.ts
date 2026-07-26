import { CallRepository } from '../repositories/call.repository'
import type { CallEvent } from '@rds/types'

export class EventService {
  private repository = new CallRepository()

  async getEvents(callId: string): Promise<CallEvent[]> {
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
