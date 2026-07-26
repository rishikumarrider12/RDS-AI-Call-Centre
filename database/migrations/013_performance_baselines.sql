-- ============================================================================
-- Phase 6 Milestone 5: Load testing and performance baseline (6.5)
-- ============================================================================

CREATE TABLE IF NOT EXISTS performance_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  p50_ms NUMERIC NOT NULL,
  p95_ms NUMERIC NOT NULL,
  p99_ms NUMERIC NOT NULL,
  max_concurrent INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_performance_baselines_org ON performance_baselines (organization_id, created_at DESC);

ALTER TABLE performance_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY performance_baselines_org_isolation ON performance_baselines FOR ALL
  USING (organization_id = current_user_org_id() OR is_system_admin())
  WITH CHECK (organization_id = current_user_org_id() OR is_system_admin());
