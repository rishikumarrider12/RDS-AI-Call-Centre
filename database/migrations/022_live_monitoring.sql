-- ============================================================================
-- Phase 7 Milestone 6: Live Call Monitoring & Real-Time Dashboard (7.6)
-- ============================================================================

-- 1. Active calls view/model (lightweight snapshot for live monitoring)
CREATE TABLE IF NOT EXISTS active_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  call_queue_id UUID REFERENCES call_queues(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'ringing', 'connected', 'ended', 'failed', 'no-answer', 'busy', 'paused', 'transferred')),
  to_number TEXT NOT NULL,
  from_number TEXT NOT NULL,
  duration_seconds INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_active_calls_organization ON active_calls (organization_id);
CREATE INDEX IF NOT EXISTS idx_active_calls_status ON active_calls (status);
CREATE INDEX IF NOT EXISTS idx_active_calls_call_id ON active_calls (call_id);
CREATE INDEX IF NOT EXISTS idx_active_calls_agent_id ON active_calls (agent_id);

-- 2. Live events (real-time event stream for monitoring)
CREATE TABLE IF NOT EXISTS live_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_events_organization ON live_events (organization_id);
CREATE INDEX IF NOT EXISTS idx_live_events_created_at ON live_events (created_at);
CREATE INDEX IF NOT EXISTS idx_live_events_call_id ON live_events (call_id);

-- 3. Agent sessions (current session state for agents)
CREATE TABLE IF NOT EXISTS agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'busy', 'paused', 'offline')),
  current_call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  active_calls_count INT NOT NULL DEFAULT 0,
  completed_calls_count INT NOT NULL DEFAULT 0,
  failed_calls_count INT NOT NULL DEFAULT 0,
  total_talk_seconds INT NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_sessions_agent_org ON agent_sessions (organization_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON agent_sessions (status);

-- 4. Live metrics (time-series metrics for charts)
CREATE TABLE IF NOT EXISTS live_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('calls_per_minute', 'queue_length', 'agent_utilization', 'success_rate', 'avg_duration', 'active_calls', 'waiting_calls')),
  value NUMERIC NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_metrics_organization ON live_metrics (organization_id);
CREATE INDEX IF NOT EXISTS idx_live_metrics_type ON live_metrics (metric_type);
CREATE INDEX IF NOT EXISTS idx_live_metrics_recorded_at ON live_metrics (recorded_at);

-- 5. Queue metrics
CREATE TABLE IF NOT EXISTS queue_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  call_queue_id UUID REFERENCES call_queues(id) ON DELETE SET NULL,
  queue_name TEXT NOT NULL,
  waiting_count INT NOT NULL DEFAULT 0,
  active_count INT NOT NULL DEFAULT 0,
  completed_count INT NOT NULL DEFAULT 0,
  abandoned_count INT NOT NULL DEFAULT 0,
  avg_wait_seconds INT NOT NULL DEFAULT 0,
  max_wait_seconds INT NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_queue_metrics_organization ON queue_metrics (organization_id);
CREATE INDEX IF NOT EXISTS idx_queue_metrics_queue_id ON queue_metrics (call_queue_id);
CREATE INDEX IF NOT EXISTS idx_queue_metrics_recorded_at ON queue_metrics (recorded_at);

-- 6. Dashboard snapshots (materialized-like snapshots for fast dashboard loads)
CREATE TABLE IF NOT EXISTS dashboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('live_dashboard', 'agent_overview', 'queue_overview', 'call_volume')),
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_org_type ON dashboard_snapshots (organization_id, snapshot_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_expires ON dashboard_snapshots (expires_at);
