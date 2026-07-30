import { MaintenanceRepository, type MaintenanceWindow } from '../repositories/maintenance.repository'
import { ScheduledJobRepository, type ScheduledJob, type ScheduledJobType } from '../repositories/scheduledJob.repository'
import { NotificationRepository } from '../repositories/notification.repository'

export class MaintenanceService {
  private maintenanceRepo = new MaintenanceRepository()
  private jobRepo = new ScheduledJobRepository()
  private notifications = new NotificationRepository()

  private async notify(organizationId: string, id: string, title: string, body: string) {
    await this.notifications.create(organizationId, {
      type: 'in-app',
      channel: 'billing',
      title,
      body,
      data: { id },
    })
  }

  // Maintenance Windows
  async listMaintenanceWindows(organizationId: string): Promise<MaintenanceWindow[]> {
    return this.maintenanceRepo.list(organizationId)
  }

  async getMaintenanceWindow(organizationId: string, id: string): Promise<MaintenanceWindow | null> {
    return this.maintenanceRepo.get(organizationId, id)
  }

  async createMaintenanceWindow(organizationId: string, input: {
    title: string
    description?: string | null
    startsAt: string
    endsAt: string
    isActive?: boolean
  }): Promise<MaintenanceWindow> {
    const window = await this.maintenanceRepo.create({ organizationId, ...input })
    await this.notify(organizationId, window.id, 'Maintenance Scheduled', `Maintenance window "${window.title}" has been scheduled.`)
    return window
  }

  async updateMaintenanceWindow(organizationId: string, id: string, patch: Partial<MaintenanceWindow>): Promise<MaintenanceWindow> {
    const window = await this.maintenanceRepo.update(organizationId, id, patch)
    await this.notify(organizationId, id, 'Maintenance Updated', `Maintenance window "${window.title}" has been updated.`)
    return window
  }

  async deleteMaintenanceWindow(organizationId: string, id: string): Promise<void> {
    const existing = await this.maintenanceRepo.get(organizationId, id)
    if (!existing) throw new Error('Maintenance window not found')
    await this.maintenanceRepo.delete(organizationId, id)
    await this.notify(organizationId, id, 'Maintenance Cancelled', `Maintenance window "${existing.title}" has been cancelled.`)
  }

  // Scheduled Jobs
  async listScheduledJobs(organizationId: string): Promise<ScheduledJob[]> {
    return this.jobRepo.list(organizationId)
  }

  async getScheduledJob(organizationId: string, id: string): Promise<ScheduledJob | null> {
    return this.jobRepo.get(organizationId, id)
  }

  async createScheduledJob(organizationId: string, input: {
    name: string
    jobType: ScheduledJobType
    cron: string
    payload?: Record<string, unknown>
    isActive?: boolean
  }): Promise<ScheduledJob> {
    const job = await this.jobRepo.create({ organizationId, ...input })
    await this.notify(organizationId, job.id, 'Scheduled Job Created', `Scheduled job "${job.name}" has been created.`)
    return job
  }

  async updateScheduledJob(organizationId: string, id: string, patch: Partial<ScheduledJob>): Promise<ScheduledJob> {
    const job = await this.jobRepo.update(organizationId, id, patch)
    await this.notify(organizationId, id, 'Scheduled Job Updated', `Scheduled job "${job.name}" has been updated.`)
    return job
  }

  async deleteScheduledJob(organizationId: string, id: string): Promise<void> {
    const existing = await this.jobRepo.get(organizationId, id)
    if (!existing) throw new Error('Scheduled job not found')
    await this.jobRepo.delete(organizationId, id)
    await this.notify(organizationId, id, 'Scheduled Job Deleted', `Scheduled job "${existing.name}" has been deleted.`)
  }

  async toggleScheduledJob(organizationId: string, id: string, isActive: boolean): Promise<ScheduledJob> {
    return this.jobRepo.update(organizationId, id, { isActive })
  }
}
