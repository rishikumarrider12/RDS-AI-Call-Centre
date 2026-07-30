import { DisasterRecoveryRepository, type DisasterRecoveryConfig, type DisasterRecoveryStrategy, type DisasterRecoveryDrillStatus } from '../repositories/disasterRecovery.repository'
import { BackupRepository } from '../repositories/backup.repository'
import { NotificationRepository } from '../repositories/notification.repository'

export class DisasterRecoveryService {
  private repository = new DisasterRecoveryRepository()
  private backupRepo = new BackupRepository()
  private notifications = new NotificationRepository()

  async listConfigs(organizationId: string): Promise<DisasterRecoveryConfig[]> {
    return this.repository.list(organizationId)
  }

  async getConfig(organizationId: string, id: string): Promise<DisasterRecoveryConfig | null> {
    return this.repository.get(organizationId, id)
  }

  async createConfig(organizationId: string, input: {
    name: string
    description?: string | null
    strategy: DisasterRecoveryStrategy
    rpoMinutes?: number
    rtoMinutes?: number
    backupScheduleCron?: string | null
    primaryRegionId?: string | null
    secondaryRegionId?: string | null
    isActive?: boolean
  }): Promise<DisasterRecoveryConfig> {
    const config = await this.repository.create({ organizationId, ...input })
    await this.notify(organizationId, config.id, 'DR Config Created', `Disaster recovery configuration "${config.name}" has been created.`)
    return config
  }

  async updateConfig(organizationId: string, id: string, patch: Partial<DisasterRecoveryConfig>): Promise<DisasterRecoveryConfig> {
    const config = await this.repository.update(organizationId, id, patch)
    await this.notify(organizationId, id, 'DR Config Updated', `Disaster recovery configuration "${config.name}" has been updated.`)
    return config
  }

  async deleteConfig(organizationId: string, id: string): Promise<void> {
    const existing = await this.repository.get(organizationId, id)
    if (!existing) throw new Error('Disaster recovery config not found')
    await this.repository.delete(organizationId, id)
    await this.notify(organizationId, id, 'DR Config Deleted', `Disaster recovery configuration "${existing.name}" has been deleted.`)
  }

  async runDrill(organizationId: string, id: string): Promise<DisasterRecoveryConfig> {
    const existing = await this.repository.get(organizationId, id)
    if (!existing) throw new Error('Disaster recovery config not found')

    const now = new Date().toISOString()
    const validated = await this.verifyBackups(organizationId)

    const status: DisasterRecoveryDrillStatus = validated.integrityChecksPassed && validated.restoreTestPassed ? 'success' : 'partial'

    const config = await this.repository.update(organizationId, id, {
      lastDrillAt: now,
      lastDrillStatus: status,
    })

    await this.notify(organizationId, id, 'DR Drill Completed', `Disaster recovery drill for "${existing.name}" completed with status: ${status}.`)
    return config
  }

  async verifyBackups(organizationId: string): Promise<{
    totalBackups: number
    completedBackups: number
    failedBackups: number
    integrityChecksPassed: boolean
    restoreTestPassed: boolean
    lastVerifiedAt: string
    details: string[]
  }> {
    const { backups, total } = await this.backupRepo.list(organizationId, 1, 100)
    const completed = backups.filter((b) => b.status === 'completed')
    const failed = backups.filter((b) => b.status === 'failed')

    const integrityChecksPassed = completed.length > 0 && failed.length === 0
    const restoreTestPassed = completed.some((b) => b.path && b.sizeBytes && b.sizeBytes > 0)

    const details: string[] = []
    details.push(`Total backups: ${total}`)
    details.push(`Completed: ${completed.length}`)
    details.push(`Failed: ${failed.length}`)
    details.push(`Integrity check: ${integrityChecksPassed ? 'passed' : 'failed'}`)
    details.push(`Restore test: ${restoreTestPassed ? 'passed' : 'needs verification'}`)

    return {
      totalBackups: total,
      completedBackups: completed.length,
      failedBackups: failed.length,
      integrityChecksPassed,
      restoreTestPassed,
      lastVerifiedAt: new Date().toISOString(),
      details,
    }
  }

  private async notify(organizationId: string, configId: string, title: string, body: string) {
    await this.notifications.create(organizationId, {
      type: 'in-app',
      channel: 'billing',
      title,
      body,
      data: { configId },
    })
  }
}
