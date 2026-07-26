-- ============================================================================
-- Phase 7 Milestone 3: AI Calling Engine (7.3)
-- ============================================================================

-- Extend calls status to support AI calling engine states
ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_status_check;
ALTER TABLE calls ADD CONSTRAINT calls_status_check CHECK (status IN ('queued', 'ringing', 'connected', 'ended', 'failed', 'no-answer', 'busy', 'paused', 'transferred'));

-- 1. AI Call orchestration table
CREATE TABLE IF NOT EXISTS ai_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'ringing', 'connected', 'ended', 'failed', 'paused', 'transferred')),
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  llm_provider TEXT,
  llm_model TEXT,
  prompt_used TEXT,
  ai_outcome TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_calls_organization ON ai_calls (organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_calls_call ON ai_calls (call_id);
CREATE INDEX IF NOT EXISTS idx_ai_calls_agent ON ai_calls (agent_id);

-- 2. Call sessions for active call state tracking
CREATE TABLE IF NOT EXISTS call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'held', 'transferred', 'ended')),
  hold_reason TEXT,
  transferred_to_agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_sessions_call ON call_sessions (call_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_organization ON call_sessions (organization_id);

-- 3. Call events timeline
CREATE TABLE IF NOT EXISTS call_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('start', 'end', 'pause', 'resume', 'transfer', 'mute', 'unmute', 'hold', 'unhold', 'dial', 'ring', 'answer', 'hangup', 'failed', 'no_answer', 'busy')),
  payload JSONB NOT NULL DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_events_call ON call_events (call_id);
CREATE INDEX IF NOT EXISTS idx_call_events_organization ON call_events (organization_id);

-- 4. Call metrics
CREATE TABLE IF NOT EXISTS call_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  latency_ms INT,
  jitter_ms INT,
  packet_loss NUMERIC,
  audio_quality_score NUMERIC,
  stt_confidence_avg NUMERIC,
  tts_latency_ms INT,
  ai_response_time_ms INT,
  talk_ratio_customer NUMERIC,
  talk_ratio_agent NUMERIC,
  silence_seconds INT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_metrics_call ON call_metrics (call_id);
CREATE INDEX IF NOT EXISTS idx_call_metrics_organization ON call_metrics (organization_id);

-- 5. Ensure transcripts table exists (defensive; already created in 001_initial_schema.sql)
CREATE TABLE IF NOT EXISTS call_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('customer', 'agent', 'system')),
  sequence INT NOT NULL,
  text TEXT NOT NULL,
  confidence NUMERIC,
  is_final BOOLEAN NOT NULL DEFAULT false,
  words JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(call_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_call_transcripts_call ON call_transcripts (call_id);
