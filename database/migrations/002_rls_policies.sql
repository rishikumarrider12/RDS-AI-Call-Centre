-- =============================================
-- RDS AI Call Centre — RLS Policies
-- Enforce org isolation and minimal access
-- =============================================

-- Helper: get current user's org_id from users table
CREATE OR REPLACE FUNCTION current_user_org_id()
RETURNS UUID AS $$
  SELECT users.organization_id
  FROM users
  WHERE users.auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Helper: check if current user is system/admin (super admin)
CREATE OR REPLACE FUNCTION is_system_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = (
      SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1
    )
    AND r.key = 'super_admin'
  );
$$ LANGUAGE sql STABLE;

-- =============================================
-- Organizations
-- =============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY owner_read ON organizations
  FOR SELECT USING (
    id = current_user_org_id() OR is_system_admin()
  );

CREATE POLICY owner_update ON organizations
  FOR UPDATE USING (
    id = current_user_org_id() OR is_system_admin()
  );

-- =============================================
-- Users
-- =============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_read_own_org ON users
  FOR SELECT USING (
    organization_id = current_user_org_id() OR is_system_admin()
  );

CREATE POLICY users_update_self ON users
  FOR UPDATE USING (
    (auth_user_id = auth.uid()) OR is_system_admin()
  );

-- =============================================
-- Default: org isolation for tenant tables
-- =============================================

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOR table_name IN
    SELECT unnest(ARRAY[
      'organization_settings', 'user_profiles', 'user_roles', 'ai_agents',
      'voice_profiles', 'phone_numbers', 'contact_lists',
      'contacts', 'campaigns', 'call_queues', 'calls', 'call_recordings',
      'call_transcripts', 'call_analytics', 'knowledge_base', 'api_keys',
      'integrations', 'webhooks', 'webhook_deliveries', 'subscriptions',
      'invoices', 'payments', 'wallets', 'usage_records', 'notifications',
      'support_tickets', 'activity_logs', 'audit_logs'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('
      CREATE POLICY %I_org_isolation ON %I
        FOR ALL
        USING (
          organization_id = current_user_org_id() OR is_system_admin()
        )
      ', table_name, table_name, table_name);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Public read for system_settings
-- =============================================

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY system_settings_read ON system_settings
  FOR SELECT USING (true);

CREATE POLICY system_settings_write ON system_settings
  FOR ALL USING (is_system_admin());
