import { IntegrationRepository } from '../repositories/integration.repository'
import type { Integration, IntegrationProvider } from '@rds/types'

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  {
    key: 'salesforce',
    name: 'Salesforce',
    description: 'Sync contacts and call outcomes to Salesforce CRM.',
    category: 'crm',
    fields: [
      { key: 'instanceUrl', label: 'Instance URL', type: 'url', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },
  {
    key: 'hubspot',
    name: 'HubSpot',
    description: 'Push call activity into HubSpot deals and contacts.',
    category: 'crm',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  {
    key: 'zendesk',
    name: 'Zendesk',
    description: 'Create tickets from support calls.',
    category: 'messaging',
    fields: [
      { key: 'subdomain', label: 'Subdomain', type: 'text', required: true },
      { key: 'email', label: 'Account Email', type: 'text', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },
  {
    key: 'slack',
    name: 'Slack',
    description: 'Post live call alerts to Slack channels.',
    category: 'messaging',
    fields: [
      { key: 'webhookUrl', label: 'Incoming Webhook URL', type: 'url', required: true },
    ],
  },
  {
    key: 's3',
    name: 'Amazon S3',
    description: 'Archive recordings and transcripts in S3.',
    category: 'storage',
    fields: [
      { key: 'bucket', label: 'Bucket', type: 'text', required: true },
      { key: 'region', label: 'Region', type: 'text', required: true },
      { key: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true },
      { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true },
    ],
  },
  {
    key: 'bigquery',
    name: 'Google BigQuery',
    description: 'Stream analytics events to BigQuery.',
    category: 'analytics',
    fields: [
      { key: 'projectId', label: 'Project ID', type: 'text', required: true },
      { key: 'dataset', label: 'Dataset', type: 'text', required: true },
    ],
  },
]

export class IntegrationService {
  private repository = new IntegrationRepository()

  private toIntegration(row: any): Integration {
    return {
      id: row.id,
      organizationId: row.organization_id,
      provider: row.provider,
      name: row.name,
      status: row.status,
      config: row.config ?? {},
      webhookUrl: row.webhook_url ?? null,
      createdById: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  listProviders(): IntegrationProvider[] {
    return INTEGRATION_PROVIDERS
  }

  async list(organizationId: string): Promise<Integration[]> {
    const rows = await this.repository.list(organizationId)
    return rows.map((r: any) => this.toIntegration(r))
  }

  async getById(organizationId: string, id: string): Promise<Integration> {
    const row = await this.repository.findById(organizationId, id)
    if (!row) throw new Error('Integration not found')
    return this.toIntegration(row)
  }

  async create(
    organizationId: string,
    createdById: string,
    input: {
      provider: string
      name?: string
      config?: Record<string, unknown>
      webhookUrl?: string | null
      status?: 'active' | 'inactive' | 'error'
    }
  ): Promise<Integration> {
    const provider = INTEGRATION_PROVIDERS.find((p) => p.key === input.provider)
    if (!provider) throw new Error('Unknown integration provider')
    const row = await this.repository.create({
      organizationId,
      createdById,
      provider: input.provider,
      name: input.name?.trim() || provider.name,
      config: input.config ?? {},
      webhookUrl: input.webhookUrl ?? null,
      status: input.status,
    })
    return this.toIntegration(row)
  }

  async update(
    organizationId: string,
    id: string,
    input: {
      name?: string
      config?: Record<string, unknown>
      webhookUrl?: string | null
      status?: 'active' | 'inactive' | 'error'
    }
  ): Promise<Integration> {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Integration not found')
    const row = await this.repository.update(id, {
      name: input.name?.trim(),
      config: input.config,
      webhookUrl: input.webhookUrl,
      status: input.status,
    })
    return this.toIntegration(row)
  }

  async remove(organizationId: string, id: string) {
    const existing = await this.repository.findById(organizationId, id)
    if (!existing) throw new Error('Integration not found')
    await this.repository.softDelete(id)
  }
}
