-- =============================================
-- RDS AI Call Centre — Demo / Test Data
-- ONLY for local development / testing
-- =============================================

-- Demo organization (no owner_id initially due to FK circularity)
INSERT INTO organizations (id, name, slug, plan, status, timezone, locale) VALUES
  ('00000000-0000-0000-0000-000000000001', 'RDS Demo', 'rds-demo', 'enterprise', 'active', 'Asia/Kolkata', 'en-US');

-- Demo admin user
INSERT INTO users (id, auth_user_id, email, full_name, organization_id, status) VALUES
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'admin@rds.ai', 'Rishi Kumar', '00000000-0000-0000-0000-000000000001', 'active');

-- Link owner back to org
UPDATE organizations SET owner_id = '00000000-0000-0000-0000-000000000002' WHERE id = '00000000-0000-0000-0000-000000000001';

-- Org settings
INSERT INTO organization_settings (organization_id) VALUES ('00000000-0000-0000-0000-000000000001');

-- Demo user profile
INSERT INTO user_profiles (user_id, organization_id) VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001');

-- Demo voices
INSERT INTO voice_profiles (id, organization_id, name, provider, voice_id, language, gender) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Aria (EN)', 'elevenlabs', 'voice_aria', 'en-US', 'female'),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Ravi (EN)', 'elevenlabs', 'voice_ravi', 'en-US', 'male');

-- Demo contacts
INSERT INTO contacts (id, organization_id, contact_list_id, first_name, last_name, email, phone, country) VALUES
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', NULL, 'Alice', 'Smith', 'alice@example.com', '+14155551234', 'US'),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', NULL, 'Bob', 'Johnson', 'bob@example.com', '+14155555678', 'US');

-- Demo AI agent
INSERT INTO ai_agents (id, organization_id, name, system_prompt, llm_provider, llm_model, tts_provider, tts_voice_id, stt_provider, stt_model) VALUES
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', 'Support Bot', 'You are a helpful support assistant.', 'openai', 'gpt-4o', 'elevenlabs', 'voice_aria', 'deepgram', 'nova-2');

-- Demo phone numbers
INSERT INTO phone_numbers (id, organization_id, number, country, provider, status) VALUES
  ('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000001', '+14155550000', 'US', 'twilio', 'active');

-- Demo webhook
INSERT INTO webhooks (id, organization_id, url, secret, events, is_active) VALUES
  ('00000000-0000-0000-0000-000000000050',
   '00000000-0000-0000-0000-000000000001',
   'https://example.com/webhook', 'whsec_demo_secret',
   ARRAY['call.ended', 'call.recording.completed'], true);

-- Demo subscription
INSERT INTO subscriptions (id, organization_id, plan, status, current_period_start, current_period_end) VALUES
  ('00000000-0000-0000-0000-000000000060', '00000000-0000-0000-0000-000000000001', 'enterprise', 'active', now(), now() + INTERVAL '1 month');
