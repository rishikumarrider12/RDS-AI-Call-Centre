-- ============================================================================
-- Phase 8 Milestone 7: AI Call Intelligence (8.7)
-- ============================================================================

-- 1. AI Call Summaries
CREATE TABLE IF NOT EXISTS ai_call_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  intent TEXT,
  key_topics TEXT[],
  action_items TEXT[],
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  confidence NUMERIC NOT NULL DEFAULT 0,
  model_used TEXT,
  tokens_used INT,
  cost NUMERIC,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_call_summaries_call ON ai_call_summaries(call_id);
CREATE INDEX IF NOT EXISTS idx_ai_call_summaries_organization ON ai_call_summaries(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_call_summaries_sentiment ON ai_call_summaries(sentiment);

-- 2. AI Agent Assist Suggestions
CREATE TABLE IF NOT EXISTS agent_assist_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('response', 'escalation', 'pause', 'transfer', 'note', 'follow_up')),
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  is_applied BOOLEAN NOT NULL DEFAULT false,
  applied_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_assist_call ON agent_assist_suggestions(call_id);
CREATE INDEX IF NOT EXISTS idx_agent_assist_organization ON agent_assist_suggestions(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_assist_agent ON agent_assist_suggestions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_assist_applied ON agent_assist_suggestions(is_applied);

-- 3. Real-time Sentiment Tracking
CREATE TABLE IF NOT EXISTS call_sentiment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('customer', 'agent', 'system')),
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  confidence NUMERIC NOT NULL DEFAULT 0,
  emotion TEXT,
  transcript_line_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_sentiment_call ON call_sentiment(call_id);
CREATE INDEX IF NOT EXISTS idx_call_sentiment_organization ON call_sentiment(organization_id);
CREATE INDEX IF NOT EXISTS idx_call_sentiment_sentiment ON call_sentiment(sentiment);

-- 4. AI Intent Classifications
CREATE TABLE IF NOT EXISTS call_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  intent TEXT NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  entities JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_intents_call ON call_intents(call_id);
CREATE INDEX IF NOT EXISTS idx_call_intents_organization ON call_intents(organization_id);
CREATE INDEX IF NOT EXISTS idx_call_intents_intent ON call_intents(intent);

-- 5. AI Call Analytics
CREATE TABLE IF NOT EXISTS ai_call_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  total_duration_seconds INT,
  talk_ratio_customer NUMERIC,
  talk_ratio_agent NUMERIC,
  talk_ratio_system NUMERIC,
  interruption_count INT DEFAULT 0,
  silence_duration_seconds INT DEFAULT 0,
  average_sentiment_score NUMERIC,
  sentiment_trend TEXT CHECK (sentiment_trend IN ('improving', 'stable', 'declining')),
  ai_response_latency_ms INT,
  summary_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_call_metrics_call ON ai_call_metrics(call_id);
CREATE INDEX IF NOT EXISTS idx_ai_call_metrics_organization ON ai_call_metrics(organization_id);

-- 6. Add summary_id to calls table for linking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'summary_id'
  ) THEN
    ALTER TABLE calls ADD COLUMN summary_id UUID REFERENCES ai_call_summaries(id);
  END IF;
END$$;
