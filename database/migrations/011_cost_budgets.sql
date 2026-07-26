-- ============================================================================
-- Phase 6 Milestone 2: Cost tracking, usage accounting, budget tracking,
-- spending alerts (6.2 + 6.3)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Cost tracking: per-day, per-category spend rollup (telephony, AI, STT, TTS, storage)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('telephony', 'ai', 'stt', 'tts', 'storage', 'other')),
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'unit',
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, record_date, category)
);

CREATE INDEX IF NOT EXISTS idx_cost_tracking_org_date ON cost_tracking (organization_id, record_date);

-- ---------------------------------------------------------------------------
-- Budgets: per-category (or 'total') monthly spend caps with alert thresholds
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'total' CHECK (category IN ('total', 'telephony', 'ai', 'stt', 'tts', 'storage', 'other')),
  period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly', 'daily')),
  limit_amount NUMERIC NOT NULL CHECK (limit_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  warn_threshold NUMERIC NOT NULL DEFAULT 0.8 CHECK (warn_threshold >= 0 AND warn_threshold <= 1),
  alert_threshold NUMERIC NOT NULL DEFAULT 1.0 CHECK (alert_threshold >= 0 AND alert_threshold <= 1),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, category, period)
);

-- ---------------------------------------------------------------------------
-- Spending alerts: audit trail of threshold crossings (for 6.3 alerting)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spending_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('warning', 'limit')),
  threshold NUMERIC NOT NULL,
  spent NUMERIC NOT NULL,
  limit_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  notified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spending_alerts_org ON spending_alerts (organization_id, created_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE spending_alerts ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['cost_tracking', 'budgets', 'spending_alerts']
  LOOP
    EXECUTE format(
      'CREATE POLICY %I_org_isolation ON %I FOR ALL USING (organization_id = current_user_org_id() OR is_system_admin()) WITH CHECK (organization_id = current_user_org_id() OR is_system_admin())',
      t, t
    );
  END LOOP;
END $$;
