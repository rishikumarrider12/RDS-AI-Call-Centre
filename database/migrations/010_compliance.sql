-- ============================================================================
-- Phase 5: Compliance & Security
-- Consent records, DND registry, retention policies, data subject requests
-- and an append-only guard for the immutable audit log.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Consent records (5.4 consent recording enforcement)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  consented BOOLEAN NOT NULL DEFAULT true,
  method TEXT NOT NULL DEFAULT 'automated_disclosure'
    CHECK (method IN ('verbal', 'ivr', 'keypress', 'written', 'automated_disclosure')),
  disclosed_at TIMESTAMPTZ,
  disclosure_text TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_records_org ON consent_records (organization_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_contact ON consent_records (contact_id);

-- ---------------------------------------------------------------------------
-- DND registry (5.5 DND pre-check before dial)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dnd_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  source TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE (organization_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_dnd_entries_org_phone ON dnd_entries (organization_id, phone);

-- ---------------------------------------------------------------------------
-- Retention policies (5.8 data retention and deletion policies)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  retention_days INTEGER NOT NULL CHECK (retention_days >= 0),
  action TEXT NOT NULL DEFAULT 'delete' CHECK (action IN ('anonymize', 'delete')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, resource_type)
);

-- ---------------------------------------------------------------------------
-- Data subject requests (5.9 GDPR-style export / erasure)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'processing', 'completed', 'failed')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  download_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_data_export_requests_org ON data_export_requests (organization_id);

CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'processing', 'completed', 'failed')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  scope TEXT
);

CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_org ON data_deletion_requests (organization_id);

-- ---------------------------------------------------------------------------
-- Append-only guard for the immutable audit log (5.6)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_append_only ON audit_logs;
CREATE TRIGGER audit_logs_append_only
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE dnd_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'consent_records', 'dnd_entries', 'retention_policies',
    'data_export_requests', 'data_deletion_requests'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I_org_isolation ON %I FOR ALL USING (organization_id = current_user_org_id() OR is_system_admin()) WITH CHECK (organization_id = current_user_org_id() OR is_system_admin())',
      t, t
    );
  END LOOP;
END $$;
