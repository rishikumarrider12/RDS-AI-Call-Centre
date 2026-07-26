-- =============================================
-- RDS AI Call Centre — System Seed
-- =============================================

-- Default system settings
INSERT INTO system_settings (key, value, description) VALUES
  ('app.name', '"RDS AI Call Centre"', 'Application display name'),
  ('app.version', '"1.0.0"', 'Current application version'),
  ('auth.token_expiry_minutes', '60', 'JWT access token expiry'),
  ('auth.refresh_token_expiry_days', '30', 'Refresh token lifetime'),
  ('billing.currency_default', '"USD"', 'Default billing currency'),
  ('billing.trial_days', '14', 'Default trial period in days'),
  ('compliance.dnd_check_enabled', 'true', 'Global DND check toggle'),
  ('compliance.consent_required', 'true', 'Global consent requirement'),
  ('limits.max_calls_per_minute', '1000', 'Global rate limit'),
  ('notifications.email_from', '"noreply@rds.ai"', 'System email sender');
