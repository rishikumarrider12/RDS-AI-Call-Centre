-- =============================================
-- RDS AI Call Centre — Database Fixes
-- Applies corrections to existing schema, RLS, and indexes
-- =============================================

-- =============================================
-- 1. Fix is_system_admin() to use roles.name
-- =============================================

CREATE OR REPLACE FUNCTION is_system_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = (
      SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1
    )
    AND r.name = 'Super Admin'
  );
$$ LANGUAGE sql STABLE;

-- =============================================
-- 2. Add deleted_at to call_queues for consistency
-- =============================================

ALTER TABLE call_queues ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- =============================================
-- 3. Fix RLS for roles, permissions, role_permissions
-- =============================================

-- Roles: org members can read roles in their org; system admin can manage all
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS roles_org_isolation ON roles;
CREATE POLICY roles_org_isolation ON roles
  FOR SELECT USING (
    organization_id = current_user_org_id() OR is_system_admin()
  );

DROP POLICY IF EXISTS roles_insert_own_org ON roles;
CREATE POLICY roles_insert_own_org ON roles
  FOR INSERT WITH CHECK (
    organization_id = current_user_org_id() OR is_system_admin()
  );

DROP POLICY IF EXISTS roles_update_own_org ON roles;
CREATE POLICY roles_update_own_org ON roles
  FOR UPDATE USING (
    organization_id = current_user_org_id() OR is_system_admin()
  );

DROP POLICY IF EXISTS roles_delete_own_org ON roles;
CREATE POLICY roles_delete_own_org ON roles
  FOR DELETE USING (
    organization_id = current_user_org_id() OR is_system_admin()
  );

-- Permissions: readable by authenticated users; writable by system admin
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS permissions_read ON permissions;
CREATE POLICY permissions_read ON permissions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS permissions_write ON permissions;
CREATE POLICY permissions_write ON permissions
  FOR ALL USING (is_system_admin());

-- Role permissions: readable by org members; manageable by system admin
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS role_permissions_read ON role_permissions;
CREATE POLICY role_permissions_read ON role_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM roles r
      WHERE r.id = role_permissions.role_id
      AND (r.organization_id = current_user_org_id() OR is_system_admin())
    )
  );

DROP POLICY IF EXISTS role_permissions_write ON role_permissions;
CREATE POLICY role_permissions_write ON role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM roles r
      WHERE r.id = role_permissions.role_id
      AND (r.organization_id = current_user_org_id() OR is_system_admin())
    )
  );

-- =============================================
-- 4. Partial unique index for org roles
-- =============================================

-- Prevent duplicate role names within an org (system roles with NULL org_id allowed)
CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_org_name
  ON roles(organization_id, name)
  WHERE organization_id IS NOT NULL;

-- =============================================
-- 5. Ensure call_queues has updated_at trigger and soft-delete index
-- =============================================

DROP TRIGGER IF EXISTS trg_call_queues_set_updated_at ON call_queues;
CREATE TRIGGER trg_call_queues_set_updated_at
  BEFORE UPDATE ON call_queues
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_call_queues_deleted_at
  ON call_queues(deleted_at);

-- =============================================
-- 6. Fix organizations RLS to allow system admin full access
-- =============================================

DROP POLICY IF EXISTS organizations_org_isolation ON organizations;
DROP POLICY IF EXISTS owner_read ON organizations;
CREATE POLICY owner_read ON organizations
  FOR SELECT USING (
    id = current_user_org_id() OR is_system_admin()
  );

DROP POLICY IF EXISTS owner_update ON organizations;
CREATE POLICY owner_update ON organizations
  FOR UPDATE USING (
    id = current_user_org_id() OR is_system_admin()
  );

DROP POLICY IF EXISTS owner_insert ON organizations;
CREATE POLICY owner_insert ON organizations
  FOR INSERT WITH CHECK (
    is_system_admin()
  );

DROP POLICY IF EXISTS owner_delete ON organizations;
CREATE POLICY owner_delete ON organizations
  FOR DELETE USING (
    is_system_admin()
  );

-- =============================================
-- 7. Ensure user_profiles RLS inherits org membership
-- =============================================

DROP POLICY IF EXISTS user_profiles_org_isolation ON user_profiles;
CREATE POLICY user_profiles_org_isolation ON user_profiles
  FOR ALL USING (
    organization_id = current_user_org_id() OR is_system_admin()
  );

-- =============================================
-- 8. Fix system_settings policies
-- =============================================

DROP POLICY IF EXISTS system_settings_read ON system_settings;
CREATE POLICY system_settings_read ON system_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS system_settings_write ON system_settings;
CREATE POLICY system_settings_write ON system_settings
  FOR ALL USING (is_system_admin());
