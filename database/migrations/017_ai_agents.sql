-- ============================================================================
-- Phase 7 Milestone 1: AI Agent Management (7.1)
-- ============================================================================

ALTER TABLE ai_agents
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMPTZ;

ALTER TABLE ai_agents
  ADD CONSTRAINT IF NOT EXISTS ai_agents_status_check
  CHECK (status IN ('active', 'inactive', 'testing'));

CREATE INDEX IF NOT EXISTS idx_ai_agents_status ON ai_agents (status);
