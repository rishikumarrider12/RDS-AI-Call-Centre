-- =============================================
-- RDS AI Call Centre — Reference Data
-- System roles and permissions
-- =============================================

-- Permissions
INSERT INTO permissions (id, key, description) VALUES
  (gen_random_uuid(), 'calls.read', 'Read calls'),
  (gen_random_uuid(), 'calls.create', 'Create calls'),
  (gen_random_uuid(), 'calls.update', 'Update calls'),
  (gen_random_uuid(), 'calls.delete', 'Delete calls'),

  (gen_random_uuid(), 'campaigns.read', 'Read campaigns'),
  (gen_random_uuid(), 'campaigns.create', 'Create campaigns'),
  (gen_random_uuid(), 'campaigns.update', 'Update campaigns'),
  (gen_random_uuid(), 'campaigns.delete', 'Delete campaigns'),

  (gen_random_uuid(), 'contacts.read', 'Read contacts'),
  (gen_random_uuid(), 'contacts.create', 'Create contacts'),
  (gen_random_uuid(), 'contacts.update', 'Update contacts'),
  (gen_random_uuid(), 'contacts.delete', 'Delete contacts'),

  (gen_random_uuid(), 'recordings.read', 'Read recordings'),
  (gen_random_uuid(), 'recordings.download', 'Download recordings'),

  (gen_random_uuid(), 'analytics.read', 'Read analytics'),

  (gen_random_uuid(), 'billing.read', 'Read billing'),
  (gen_random_uuid(), 'billing.update', 'Update billing'),

  (gen_random_uuid(), 'settings.read', 'Read settings'),
  (gen_random_uuid(), 'settings.update', 'Update settings'),

  (gen_random_uuid(), 'users.read', 'Read users'),
  (gen_random_uuid(), 'users.create', 'Create users'),
  (gen_random_uuid(), 'users.update', 'Update users'),
  (gen_random_uuid(), 'users.delete', 'Delete users'),

  (gen_random_uuid(), 'integrations.manage', 'Manage integrations'),
  (gen_random_uuid(), 'webhooks.manage', 'Manage webhooks'),

  (gen_random_uuid(), 'audit_logs.read', 'Read audit logs'),
  (gen_random_uuid(), 'system.manage', 'System administration');

-- System roles
INSERT INTO roles (id, name, description, is_system) VALUES
  (gen_random_uuid(), 'Super Admin', 'Full system access', true),
  (gen_random_uuid(), 'Org Admin', 'Organization administrator', true),
  (gen_random_uuid(), 'Agent', 'Human call agent', true),
  (gen_random_uuid(), 'Viewer', 'Read-only access', true);
