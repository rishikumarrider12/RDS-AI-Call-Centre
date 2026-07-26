import { supabaseAdmin } from '../lib/supabase'
import type { DeploymentEnvironment, DeploymentStatus } from '@rds/types'

export interface DeploymentRow {
  id: string
  organizationId: string
  environment: DeploymentEnvironment
  version: string
  commitSha: string | null
  status: DeploymentStatus
  deployedById: string | null
  startedAt: string | null
  completedAt: string | null
  rollbackOfId: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export class DeploymentRepository {
  async list(organizationId: string, environment?: string) {
    let query = supabaseAdmin
      .from('deployments')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (environment) query = query.eq('environment', environment)

    const { data, error } = await query
    if (error) throw error
    return (data || []).map((row: any) => ({
      id: row.id,
      organizationId: row.organization_id,
      environment: row.environment,
      version: row.version,
      commitSha: row.commit_sha,
      status: row.status,
      deployedById: row.deployed_by,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      rollbackOfId: row.rollback_of,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })) as DeploymentRow[]
  }

  async getById(organizationId: string, id: string) {
    const { data, error } = await supabaseAdmin
      .from('deployments')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    return {
      id: data.id,
      organizationId: data.organization_id,
      environment: data.environment,
      version: data.version,
      commitSha: data.commit_sha,
      status: data.status,
      deployedById: data.deployed_by,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      rollbackOfId: data.rollback_of,
      metadata: data.metadata ?? {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as DeploymentRow
  }

  async create(organizationId: string, input: {
    environment: string
    version: string
    commitSha?: string | null
    deployedById?: string | null
    rollbackOfId?: string | null
    metadata?: Record<string, unknown>
  }) {
    const { data, error } = await supabaseAdmin
      .from('deployments')
      .insert({
        organization_id: organizationId,
        environment: input.environment,
        version: input.version,
        commit_sha: input.commitSha ?? null,
        deployed_by: input.deployedById ?? null,
        rollback_of: input.rollbackOfId ?? null,
        status: 'pending',
        metadata: input.metadata ?? {},
      })
      .select()
      .single()

    if (error) throw error
    return {
      id: data.id,
      organizationId: data.organization_id,
      environment: data.environment,
      version: data.version,
      commitSha: data.commit_sha,
      status: data.status,
      deployedById: data.deployed_by,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      rollbackOfId: data.rollback_of,
      metadata: data.metadata ?? {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as DeploymentRow
  }

  async updateStatus(organizationId: string, id: string, status: string, extra: Record<string, unknown> = {}) {
    const payload: Record<string, unknown> = { status, ...extra }
    const { data, error } = await supabaseAdmin
      .from('deployments')
      .update(payload)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (error) throw error
    return {
      id: data.id,
      organizationId: data.organization_id,
      environment: data.environment,
      version: data.version,
      commitSha: data.commit_sha,
      status: data.status,
      deployedById: data.deployed_by,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      rollbackOfId: data.rollback_of,
      metadata: data.metadata ?? {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } as DeploymentRow
  }
}
