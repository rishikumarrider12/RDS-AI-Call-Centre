import { FeatureFlagRepository } from '../repositories/featureFlag.repository'
import type { FeatureFlag, FeatureFlagFilter } from '@rds/types'

export class FeatureFlagService {
  private repository = new FeatureFlagRepository()

  async list(filters?: FeatureFlagFilter): Promise<FeatureFlag[]> {
    return this.repository.list(filters)
  }

  async getById(id: string): Promise<FeatureFlag | null> {
    return this.repository.getById(id)
  }

  async create(input: {
    name: string
    description: string
    environment: string
    organizationId?: string | null
    rolloutPercentage?: number
    enabled?: boolean
  }): Promise<FeatureFlag> {
    return this.repository.create(input)
  }

  async update(id: string, input: {
    name?: string
    description?: string
    environment?: string
    organizationId?: string | null
    rolloutPercentage?: number
    enabled?: boolean
  }): Promise<FeatureFlag> {
    return this.repository.update(id, input)
  }

  async delete(id: string): Promise<void> {
    return this.repository.delete(id)
  }
}
