-- ============================================================================
-- Phase 7 Milestone 2: AI Campaign Orchestration (7.2)
-- ============================================================================

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns (status);
