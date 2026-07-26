-- ============================================================================
-- Phase 6 Milestone 6: Auto scaling and performance (6.6)
-- ============================================================================

CREATE TABLE IF NOT EXISTS auto_scaling_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  min_replicas INT NOT NULL DEFAULT 1,
  max_replicas INT NOT NULL DEFAULT 10,
  target_cpu_percent INT NOT NULL DEFAULT 60,
  target_memory_percent INT NOT NULL DEFAULT 70,
  scale_up_cooldown_seconds INT NOT NULL DEFAULT 60,
  scale_down_cooldown_seconds INT NOT NULL DEFAULT 300,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id)
);

CREATE TABLE IF NOT EXISTS scaling_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  replicas INT NOT NULL,
  cpu_percent NUMERIC NOT NULL,
  memory_percent NUMERIC NOT NULL,
  requests_per_second NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scaling_metrics_org_recorded ON scaling_metrics (organization_id, recorded_at DESC);

ALTER TABLE auto_scaling_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scaling_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY auto_scaling_configs_org_isolation ON auto_scaling_configs FOR ALL
  USING (organization_id = current_user_org_id() OR is_system_admin())
  WITH CHECK (organization_id = current_user_org_id() OR is_system_admin());

CREATE POLICY scaling_metrics_org_isolation ON scaling_metrics FOR ALL
  USING (organization_id = current_user_org_id() OR is_system_admin())
  WITH CHECK (organization_id = current_user_org_id() OR is_system_admin());
