import { CallRepository } from '../repositories/call.repository'
import type { CallTranscriptLine } from '@rds/types'

export class TranscriptService {
  private repository = new CallRepository()

  async getTranscript(callId: string): Promise<CallTranscriptLine[]> {
    const transcripts = await this.repository.getTranscripts(callId)
    return transcripts.map((t) => ({
      sequence: t.sequence,
      channel: t.channel,
      text: t.text,
      confidence: t.confidence ?? null,
      isFinal: t.is_final ?? false,
    }))
  }
}
