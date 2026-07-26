import { BackupRepository, type BackupRecord } from '../repositories/backup.repository'
import type { BackupType } from '@rds/types'
import { NotificationRepository } from '../repositories/notification.repository'

export class BackupService {
  private repository = new BackupRepository()
  private notifications = new NotificationRepository()

  async listBackups(organizationId: string, page = 1, pageSize = 25) {
    return this.repository.list(organizationId, page, pageSize)
  }

  async getBackup(organizationId: string, id: string): Promise<BackupRecord | null> {
    return this.repository.get(organizationId, id)
  }

  async createBackup(organizationId: string, type: BackupType): Promise<BackupRecord> {
    const backup = await this.repository.create({ organizationId, type, status: 'running', startedAt: new Date().toISOString() })
    await this.notify(organizationId, backup.id, 'Backup started', `${type} backup is in progress.`)
    return backup
  }

  async completeBackup(organizationId: string, id: string, sizeBytes: number, path: string): Promise<BackupRecord> {
    const backup = await this.repository.update(organizationId, id, {
      status: 'completed',
      sizeBytes,
      path,
      completedAt: new Date().toISOString(),
    } as Partial<BackupRecord>)
    await this.notify(organizationId, id, 'Backup completed', `${backup.type} backup finished successfully.`)
    return backup
  }

  async failBackup(organizationId: string, id: string, error: string): Promise<BackupRecord> {
    const backup = await this.repository.update(organizationId, id, {
      status: 'failed',
      error,
      completedAt: new Date().toISOString(),
    } as Partial<BackupRecord>)
    await this.notify(organizationId, id, 'Backup failed', error)
    return backup
  }

  async startRestore(organizationId: string, id: string): Promise<BackupRecord> {
    const existing = await this.repository.get(organizationId, id)
    if (!existing) throw new Error('Backup not found')
    if (existing.status !== 'completed') throw new Error('Only completed backups can be restored')
    return this.repository.update(organizationId, id, { status: 'restoring' } as Partial<BackupRecord>)
  }

  async deleteBackup(organizationId: string, id: string): Promise<void> {
    const existing = await this.repository.get(organizationId, id)
    if (!existing) throw new Error('Backup not found')
    if (existing.status === 'restoring') throw new Error('Cannot delete a backup that is being restored')
    await this.repository.delete(organizationId, id)
  }

  private async notify(organizationId: string, backupId: string, title: string, body: string) {
    await this.notifications.create(organizationId, {
      type: 'in-app',
      channel: 'billing',
      title,
      body,
      data: { backupId },
    })
  }
}
