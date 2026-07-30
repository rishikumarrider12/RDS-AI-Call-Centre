-- Phase 9.3 — Backup, Disaster Recovery & Maintenance Management
-- Adds disaster_recovery_configs table and RLS policies.

CREATE TABLE IF NOT EXISTS disaster_recovery_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  strategy TEXT NOT NULL DEFAULT 'backup_restore' CHECK (strategy IN ('backup_restore', 'multi_region', 'active_passive', 'active_active')),
  rpo_minutes INTEGER NOT NULL DEFAULT 60,
  rto_minutes INTEGER NOT NULL DEFAULT 120,
  backup_schedule_cron TEXT,
  primary_region_id UUID REFERENCES regions(id),
  secondary_region_id UUID REFERENCES regions(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_drill_at TIMESTAMPTZ,
  last_drill_status TEXT CHECK (last_drill_status IN ('success', 'failed', 'partial')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dr_configs_org ON disaster_recovery_configs (organization_id);
CREATE INDEX IF NOT EXISTS idx_dr_configs_active ON disaster_recovery_configs (organization_id, is_active);

ALTER TABLE disaster_recovery_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_admin_can_manage_dr" ON disaster_recovery_configs
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE auth_user_id = auth.uid()));
