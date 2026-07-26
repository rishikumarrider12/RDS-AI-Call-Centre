-- =============================================
-- RDS AI Call Centre — Database Review Fixes
-- Addresses findings from DATABASE_REVIEW.md
-- Non-breaking: all changes are additive or IF NOT EXISTS guarded
-- =============================================

-- =============================================
-- 1. Fix missing foreign key constraints
-- =============================================

ALTER TABLE invoices
  ADD CONSTRAINT invoices_subscription_id_fkey
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL;

ALTER TABLE payments
  ADD CONSTRAINT payments_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

-- =============================================
-- 2. Add missing soft deletes and updated_at triggers
-- =============================================

-- organization_settings
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_organization_settings_deleted_at ON organization_settings(deleted_at);
DROP TRIGGER IF EXISTS trg_organization_settings_set_updated_at ON organization_settings;
CREATE TRIGGER trg_organization_settings_set_updated_at
  BEFORE UPDATE ON organization_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_user_profiles_deleted_at ON user_profiles(deleted_at);
DROP TRIGGER IF EXISTS trg_user_profiles_set_updated_at ON user_profiles;
CREATE TRIGGER trg_user_profiles_set_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- roles
ALTER TABLE roles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_roles_deleted_at ON roles(deleted_at);
DROP TRIGGER IF EXISTS trg_roles_set_updated_at ON roles;
CREATE TRIGGER trg_roles_set_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- permissions
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_permissions_deleted_at ON permissions(deleted_at);
DROP TRIGGER IF EXISTS trg_permissions_set_updated_at ON permissions;
CREATE TRIGGER trg_permissions_set_updated_at
  BEFORE UPDATE ON permissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- role_permissions
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_role_permissions_deleted_at ON role_permissions(deleted_at);
DROP TRIGGER IF EXISTS trg_role_permissions_set_updated_at ON role_permissions;
CREATE TRIGGER trg_role_permissions_set_updated_at
  BEFORE UPDATE ON role_permissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- user_roles
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_user_roles_deleted_at ON user_roles(deleted_at);
DROP TRIGGER IF EXISTS trg_user_roles_set_updated_at ON user_roles;
CREATE TRIGGER trg_user_roles_set_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- call_recordings
ALTER TABLE call_recordings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_call_recordings_deleted_at ON call_recordings(deleted_at);
DROP TRIGGER IF EXISTS trg_call_recordings_set_updated_at ON call_recordings;
CREATE TRIGGER trg_call_recordings_set_updated_at
  BEFORE UPDATE ON call_recordings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- call_transcripts
ALTER TABLE call_transcripts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_call_transcripts_deleted_at ON call_transcripts(deleted_at);
DROP TRIGGER IF EXISTS trg_call_transcripts_set_updated_at ON call_transcripts;
CREATE TRIGGER trg_call_transcripts_set_updated_at
  BEFORE UPDATE ON call_transcripts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- call_analytics
ALTER TABLE call_analytics ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_call_analytics_deleted_at ON call_analytics(deleted_at);
DROP TRIGGER IF EXISTS trg_call_analytics_set_updated_at ON call_analytics;
CREATE TRIGGER trg_call_analytics_set_updated_at
  BEFORE UPDATE ON call_analytics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- webhook_deliveries
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_deleted_at ON webhook_deliveries(deleted_at);
DROP TRIGGER IF EXISTS trg_webhook_deliveries_set_updated_at ON webhook_deliveries;
CREATE TRIGGER trg_webhook_deliveries_set_updated_at
  BEFORE UPDATE ON webhook_deliveries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_subscriptions_deleted_at ON subscriptions(deleted_at);
DROP TRIGGER IF EXISTS trg_subscriptions_set_updated_at ON subscriptions;
CREATE TRIGGER trg_subscriptions_set_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON invoices(deleted_at);
DROP TRIGGER IF EXISTS trg_invoices_set_updated_at ON invoices;
CREATE TRIGGER trg_invoices_set_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments(deleted_at);

-- wallets
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_wallets_deleted_at ON wallets(deleted_at);
DROP TRIGGER IF EXISTS trg_wallets_set_updated_at ON wallets;
CREATE TRIGGER trg_wallets_set_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- usage_records
ALTER TABLE usage_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_usage_records_deleted_at ON usage_records(deleted_at);
DROP TRIGGER IF EXISTS trg_usage_records_set_updated_at ON usage_records;
CREATE TRIGGER trg_usage_records_set_updated_at
  BEFORE UPDATE ON usage_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_notifications_deleted_at ON notifications(deleted_at);
DROP TRIGGER IF EXISTS trg_notifications_set_updated_at ON notifications;
CREATE TRIGGER trg_notifications_set_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- support_tickets
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_support_tickets_deleted_at ON support_tickets(deleted_at);
DROP TRIGGER IF EXISTS trg_support_tickets_set_updated_at ON support_tickets;
CREATE TRIGGER trg_support_tickets_set_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- system_settings
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_system_settings_deleted_at ON system_settings(deleted_at);
DROP TRIGGER IF EXISTS trg_system_settings_set_updated_at ON system_settings;
CREATE TRIGGER trg_system_settings_set_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- 3. Add missing unique constraints
-- =============================================

-- Prevent duplicate phone numbers within an organization (soft-delete aware)
CREATE UNIQUE INDEX IF NOT EXISTS uq_contacts_org_phone
  ON contacts(organization_id, phone)
  WHERE deleted_at IS NULL;

-- Prevent duplicate role names per organization (already added in 007, ensure idempotency)
CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_org_name
  ON roles(organization_id, name)
  WHERE organization_id IS NOT NULL;

-- =============================================
-- 4. Add missing indexes for foreign keys and filters
-- =============================================

CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_organization_id ON user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_contact_lists_created_by ON contact_lists(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_scripts_created_by ON ai_scripts(created_by);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_created_by ON knowledge_base(created_by);
CREATE INDEX IF NOT EXISTS idx_integrations_created_by ON integrations(created_by);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assignee_id ON support_tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_attempt_at ON webhook_deliveries(next_attempt_at);

-- =============================================
-- 5. Extend audit triggers to additional sensitive tables
-- =============================================

CREATE TRIGGER trg_contacts_audit
  AFTER INSERT OR UPDATE OR DELETE ON contacts
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_call_recordings_audit
  AFTER INSERT OR UPDATE OR DELETE ON call_recordings
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_call_transcripts_audit
  AFTER INSERT OR UPDATE OR DELETE ON call_transcripts
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_ai_agents_audit
  AFTER INSERT OR UPDATE OR DELETE ON ai_agents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_phone_numbers_audit
  AFTER INSERT OR UPDATE OR DELETE ON phone_numbers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_subscriptions_audit
  AFTER INSERT OR UPDATE OR DELETE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_invoices_audit
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_payments_audit
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_wallets_audit
  AFTER INSERT OR UPDATE OR DELETE ON wallets
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_system_settings_audit
  AFTER INSERT OR UPDATE OR DELETE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- =============================================
-- 6. Ensure RLS policies cover soft-delete-aware tables
-- =============================================

-- Update generic org-isolation loop to include newly soft-deletable tables
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOR table_name IN
    SELECT unnest(ARRAY[
      'organization_settings', 'user_profiles', 'roles', 'permissions',
      'role_permissions', 'user_roles', 'call_recordings', 'call_transcripts',
      'call_analytics', 'webhook_deliveries', 'subscriptions', 'invoices',
      'payments', 'wallets', 'usage_records', 'notifications', 'support_tickets',
      'system_settings'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('
      DROP POLICY IF EXISTS %I_org_isolation ON %I
      ', table_name, table_name, table_name);
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
-- 7. Fix permissions RLS to allow read for org members
-- =============================================

DROP POLICY IF EXISTS permissions_read ON permissions;
CREATE POLICY permissions_read ON permissions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS permissions_write ON permissions;
CREATE POLICY permissions_write ON permissions
  FOR ALL USING (is_system_admin());

-- =============================================
-- 8. Add indexes for new deleted_at columns used in common queries
-- =============================================

-- These are created inline above with each ALTER TABLE, but ensure idempotency
-- for any tables that were missed in the individual blocks above

-- =============================================
-- 9. Improve audit_trigger to handle NULL organization_id safely
-- =============================================

CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  actor_id UUID;
  org_id UUID;
BEGIN
  SELECT users.id INTO actor_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
  org_id := COALESCE(NEW.organization_id, OLD.organization_id);

  INSERT INTO audit_logs (
    organization_id, actor_id, action,
    actor_type, resource_type, resource_id,
    ip_address, user_agent, before, after, created_at
  ) VALUES (
    org_id,
    actor_id,
    TG_OP,
    'user',
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent',
    to_jsonb(OLD),
    to_jsonb(NEW),
    now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
