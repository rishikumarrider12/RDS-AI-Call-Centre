import { RegionRepository } from '../repositories/region.repository'
import type { Region, OrganizationRegion, RegionHealth } from '@rds/types'

export class RegionService {
  private repository = new RegionRepository()

  async listRegions(): Promise<Region[]> {
    return this.repository.listRegions()
  }

  async getRegion(id: string): Promise<Region | null> {
    return this.repository.getRegion(id)
  }

  async createRegion(input: {
    code: string
    name: string
    location: string
    provider: string
    status?: string
    isPrimary?: boolean
  }): Promise<Region> {
    return this.repository.createRegion(input)
  }

  async updateRegion(id: string, input: {
    code?: string
    name?: string
    location?: string
    provider?: string
    status?: string
    isPrimary?: boolean
  }): Promise<Region> {
    return this.repository.updateRegion(id, input)
  }

  async deleteRegion(id: string): Promise<void> {
    return this.repository.deleteRegion(id)
  }

  async listOrganizationRegions(): Promise<OrganizationRegion[]> {
    return this.repository.listOrganizationRegions()
  }

  async getOrganizationRegion(organizationId: string): Promise<OrganizationRegion | null> {
    return this.repository.getOrganizationRegion(organizationId)
  }

  async upsertOrganizationRegion(input: {
    organizationId: string
    primaryRegionId: string
    secondaryRegionId?: string | null
    failoverEnabled?: boolean
  }): Promise<OrganizationRegion> {
    return this.repository.upsertOrganizationRegion(input)
  }

  async getRegionHealth(regionCode: string): Promise<RegionHealth> {
    return this.repository.getRegionHealth(regionCode)
  }
}
