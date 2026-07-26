import { UsageRepository } from '../repositories/usage.repository'

export interface UsageMeteringInput {
  organizationId: string
  aiMinutes: number
  telephonyMinutes: number
  callsCount: number
  storageBytes: number
  sttMinutes: number
  ttsCharacters: number
}

export class UsageMeteringService {
  private repository = new UsageRepository()

  async recordUsage(input: UsageMeteringInput) {
    const today = new Date().toISOString().slice(0, 10)
    return this.repository.upsert(input.organizationId, {
      recordDate: today,
      aiMinutes: input.aiMinutes,
      telephonyMinutes: input.telephonyMinutes,
      callsCount: input.callsCount,
      storageBytes: input.storageBytes,
      sttMinutes: input.sttMinutes,
      ttsCharacters: input.ttsCharacters,
    })
  }

  async getUsageHistory(organizationId: string, options: { dateFrom?: string; dateTo?: string; page?: number; pageSize?: number }) {
    return this.repository.list(organizationId, options)
  }

  async getLatestUsage(organizationId: string, days = 30) {
    return this.repository.getLatest(organizationId, days)
  }
}
