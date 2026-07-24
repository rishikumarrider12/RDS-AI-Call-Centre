-- ============================================================================
-- Phase 7 Milestone 5: Contact List Management & CSV Import (7.5)
-- ============================================================================

-- 1. Contact segments (smart filtered groups of contacts)
CREATE TABLE IF NOT EXISTS contact_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '{}',
  contact_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_contact_segments_organization ON contact_segments (organization_id);

-- 2. Segment member junction (contacts included in a segment)
CREATE TABLE IF NOT EXISTS contact_segment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES contact_segments(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contact_segment_members_unique
  ON contact_segment_members (segment_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_segment_members_segment ON contact_segment_members (segment_id);
CREATE INDEX IF NOT EXISTS idx_contact_segment_members_contact ON contact_segment_members (contact_id);

-- 3. CSV import jobs (async job tracking)
CREATE TABLE IF NOT EXISTS csv_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_list_id UUID REFERENCES contact_lists(id) ON DELETE SET NULL,
  contact_list_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  total_rows INT NOT NULL DEFAULT 0,
  valid_rows INT NOT NULL DEFAULT 0,
  inserted INT NOT NULL DEFAULT 0,
  duplicates_skipped INT NOT NULL DEFAULT 0,
  errors INT NOT NULL DEFAULT 0,
  error_samples JSONB NOT NULL DEFAULT '[]',
  progress_percent NUMERIC NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_csv_import_jobs_organization ON csv_import_jobs (organization_id);
CREATE INDEX IF NOT EXISTS idx_csv_import_jobs_status ON csv_import_jobs (status);

-- 4. Import history (audit trail for all imports)
CREATE TABLE IF NOT EXISTS import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  import_job_id UUID REFERENCES csv_import_jobs(id) ON DELETE SET NULL,
  contact_list_id UUID REFERENCES contact_lists(id) ON DELETE SET NULL,
  contact_list_name TEXT,
  total_rows INT NOT NULL DEFAULT 0,
  valid_rows INT NOT NULL DEFAULT 0,
  inserted INT NOT NULL DEFAULT 0,
  duplicates_skipped INT NOT NULL DEFAULT 0,
  errors INT NOT NULL DEFAULT 0,
  error_samples JSONB NOT NULL DEFAULT '[]',
  imported_by UUID,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_history_organization ON import_history (organization_id);
CREATE INDEX IF NOT EXISTS idx_import_history_import_job ON import_history (import_job_id);
CREATE INDEX IF NOT EXISTS idx_import_history_created_at ON import_history (created_at);

-- 5. Import validation errors (detailed per-row errors)
CREATE TABLE IF NOT EXISTS import_validation_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  import_job_id UUID REFERENCES csv_import_jobs(id) ON DELETE CASCADE,
  contact_list_id UUID REFERENCES contact_lists(id) ON DELETE SET NULL,
  row_number INT NOT NULL,
  error_type TEXT NOT NULL,
  message TEXT NOT NULL,
  raw_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_validation_errors_import_job ON import_validation_errors (import_job_id);
CREATE INDEX IF NOT EXISTS idx_import_validation_errors_row ON import_validation_errors (row_number);

-- 6. Duplicate contacts (tracked duplicates across imports / existing contacts)
CREATE TABLE IF NOT EXISTS duplicate_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  import_job_id UUID REFERENCES csv_import_jobs(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  duplicate_of_phone TEXT NOT NULL,
  duplicate_contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'detected' CHECK (status IN ('detected', 'reviewed', 'merged', 'ignored')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_duplicate_contacts_organization ON duplicate_contacts (organization_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_contacts_import_job ON duplicate_contacts (import_job_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_contacts_contact_id ON duplicate_contacts (contact_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_contacts_phone ON duplicate_contacts (duplicate_of_phone);
