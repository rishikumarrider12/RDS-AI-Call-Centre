-- ============================================================================
-- Phase 7 Milestone 9: Enterprise Audit Logging & Compliance (7.9)
-- ============================================================================

-- 1. Audit Categories
CREATE TABLE IF NOT EXISTS audit_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6366f1',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_audit_categories_org ON audit_categories (organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_categories_slug ON audit_categories (slug);

-- 2. Compliance Policies
CREATE TABLE IF NOT EXISTS compliance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  framework TEXT NOT NULL CHECK (framework IN ('GDPR', 'SOC2', 'ISO27001', 'HIPAA', 'PCI-DSS', 'OTHER')),
  description TEXT,
  requirements JSONB NOT NULL DEFAULT '[]',
  controls JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  effective_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_compliance_policies_org ON compliance_policies (organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_policies_framework ON compliance_policies (framework);
CREATE INDEX IF NOT EXISTS idx_compliance_policies_status ON compliance_policies (status);

-- 3. Access Reviews
CREATE TABLE IF NOT EXISTS access_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'archived')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_access_reviews_org ON access_reviews (organization_id);
CREATE INDEX IF NOT EXISTS idx_access_reviews_status ON access_reviews (status);
CREATE INDEX IF NOT EXISTS idx_access_reviews_reviewer ON access_reviews (reviewer_id);

-- 4. Security Incidents
CREATE TABLE IF NOT EXISTS security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_security_incidents_org ON security_incidents (organization_id);
CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON security_incidents (severity);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON security_incidents (status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_occurred_at ON security_incidents (occurred_at);

-- Row Level Security
ALTER TABLE audit_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'audit_categories', 'compliance_policies', 'access_reviews', 'security_incidents'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I_org_isolation ON %I FOR ALL USING (organization_id = current_user_org_id() OR is_system_admin()) WITH CHECK (organization_id = current_user_org_id() OR is_system_admin())',
      t, t
    );
  END LOOP;
END $$;
