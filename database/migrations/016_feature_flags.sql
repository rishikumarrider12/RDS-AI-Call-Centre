-- ============================================================================
-- Phase 6 Milestone 10: Feature flags for gradual rollout (6.10)
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'development',
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  rollout_percentage INT NOT NULL DEFAULT 100,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_org ON feature_flags (organization_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_env ON feature_flags (environment);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags (enabled);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY feature_flags_admin_write ON feature_flags FOR INSERT
  WITH CHECK (is_system_admin());

CREATE POLICY feature_flags_admin_update ON feature_flags FOR UPDATE
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

CREATE POLICY feature_flags_admin_delete ON feature_flags FOR DELETE
  USING (is_system_admin());

CREATE POLICY feature_flags_select ON feature_flags FOR SELECT
  USING (organization_id = current_user_org_id() OR is_system_admin() OR organization_id IS NULL);
