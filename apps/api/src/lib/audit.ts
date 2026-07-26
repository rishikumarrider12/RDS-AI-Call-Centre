import { supabaseAdmin } from './supabase'
import { logger } from './logger'
import type { AuditActorType } from '@rds/types'

export interface AuditEntry {
  organizationId: string
  action: string
  actorId?: string | null
  actorName?: string | null
  actorEmail?: string | null
  actorType?: AuditActorType
  resourceType?: string | null
  resourceId?: string | null
  ipAddress?: string | null
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
}

// Append-only audit writer (Phase 5.6). The audit_logs table is protected by a
// BEFORE UPDATE/DELETE trigger, so this is the only supported write path.
export async function recordAudit(entry: AuditEntry): Promise<void> {
  const { error } = await supabaseAdmin.from('audit_logs').insert({
    organization_id: entry.organizationId,
    action: entry.action,
    actor_id: entry.actorId ?? null,
    actor_name: entry.actorName ?? null,
    actor_email: entry.actorEmail ?? null,
    actor_type: entry.actorType ?? 'user',
    resource_type: entry.resourceType ?? null,
    resource_id: entry.resourceId ?? null,
    ip_address: entry.ipAddress ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
  })
  if (error) {
    logger.error({ error: error.message, action: entry.action }, 'failed to write audit log')
  }
}
