-- ============================================================================
-- Phase 7 Milestone 10: Enterprise Observability & Production Readiness (7.10)
-- ============================================================================

-- 1. System Health Checks
CREATE TABLE IF NOT EXISTS system_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  component TEXT NOT NULL CHECK (component IN ('database', 'redis', 'queue', 'api', 'storage', 'ai_engine', 'telephony', 'integration')),
  status TEXT NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'down', 'unknown')),
  latency_ms INT,
  details JSONB NOT NULL DEFAULT '{}',
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_health_checks_org ON system_health_checks (organization_id);
CREATE INDEX IF NOT EXISTS idx_system_health_checks_component ON system_health_checks (component);
CREATE INDEX IF NOT EXISTS idx_system_health_checks_checked_at ON system_health_checks (checked_at DESC);

-- 2. Alert Rules
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  metric TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('gt', 'gte', 'lt', 'lte', 'eq', 'neq')),
  threshold NUMERIC NOT NULL,
  window_seconds INT NOT NULL DEFAULT 60,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  channels JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_org ON alert_rules (organization_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_metric ON alert_rules (metric);

-- 3. Alert History
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
  severity TEXT NOT NULL,
  metric TEXT NOT NULL,
  value NUMERIC NOT NULL,
  threshold NUMERIC NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'firing' CHECK (status IN ('firing', 'resolved', 'silenced')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_history_org ON alert_history (organization_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_rule ON alert_history (rule_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_status ON alert_history (status);
CREATE INDEX IF NOT EXISTS idx_alert_history_created_at ON alert_history (created_at DESC);

-- 4. Deployments
CREATE TABLE IF NOT EXISTS deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  environment TEXT NOT NULL CHECK (environment IN ('staging', 'production', 'preview')),
  version TEXT NOT NULL,
  commit_sha TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'deploying', 'success', 'failed', 'rolled_back')),
  deployed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rollback_of UUID REFERENCES deployments(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deployments_org ON deployments (organization_id);
CREATE INDEX IF NOT EXISTS idx_deployments_environment ON deployments (environment);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments (status);
CREATE INDEX IF NOT EXISTS idx_deployments_created_at ON deployments (created_at DESC);

-- 5. Maintenance Windows
CREATE TABLE IF NOT EXISTS maintenance_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_maintenance_windows_org ON maintenance_windows (organization_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_windows_active ON maintenance_windows (organization_id, is_active, starts_at, ends_at);

-- 6. Scheduled Jobs
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('metrics_cleanup', 'report_generation', 'data_retention', 'health_check', 'backup', 'custom')),
  cron TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_status TEXT NOT NULL DEFAULT 'pending' CHECK (last_status IN ('pending', 'running', 'success', 'failed')),
  last_error TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_org ON scheduled_jobs (organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_type ON scheduled_jobs (job_type);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_active ON scheduled_jobs (is_active);

-- Row Level Security
ALTER TABLE system_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'system_health_checks', 'alert_rules', 'alert_history',
    'deployments', 'maintenance_windows', 'scheduled_jobs'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I_org_isolation ON %I FOR ALL USING (organization_id = current_user_org_id() OR is_system_admin()) WITH CHECK (organization_id = current_user_org_id() OR is_system_admin())',
      t, t
    );
  END LOOP;
END $$;
