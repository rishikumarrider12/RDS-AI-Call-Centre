-- ============================================================================
-- Phase 6 Milestone 7: Multi-region readiness (6.7)
-- ============================================================================

CREATE TABLE IF NOT EXISTS regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  primary_region_id UUID NOT NULL REFERENCES regions(id) ON DELETE RESTRICT,
  secondary_region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
  failover_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id)
);

CREATE INDEX IF NOT EXISTS idx_regions_code ON regions (code);
CREATE INDEX IF NOT EXISTS idx_organization_regions_org ON organization_regions (organization_id);

ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY regions_select ON regions FOR SELECT
  USING (true);

CREATE POLICY regions_admin_write ON regions FOR INSERT
  WITH CHECK (is_system_admin());

CREATE POLICY regions_admin_update ON regions FOR UPDATE
  USING (is_system_admin())
  WITH CHECK (is_system_admin());

CREATE POLICY regions_admin_delete ON regions FOR DELETE
  USING (is_system_admin());

CREATE POLICY organization_regions_org_isolation ON organization_regions FOR ALL
  USING (organization_id = current_user_org_id() OR is_system_admin())
  WITH CHECK (organization_id = current_user_org_id() OR is_system_admin());
