-- ============================================================================
-- Phase 6 Milestone 4: Database backup and restore runbook (6.4)
-- ============================================================================

CREATE TABLE IF NOT EXISTS backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'full' CHECK (type IN ('full', 'schema', 'data', 'incremental')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'restoring')),
  size_bytes BIGINT,
  path TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_backups_org_created ON backups (organization_id, created_at DESC);

ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY backups_org_isolation ON backups FOR ALL
  USING (organization_id = current_user_org_id() OR is_system_admin())
  WITH CHECK (organization_id = current_user_org_id() OR is_system_admin());
