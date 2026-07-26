-- ============================================================================
-- Phase 8 Milestone 1: Real AI Voice Integration (8.1)
-- ============================================================================

-- 1. Voice Providers (registry of supported providers)
CREATE TABLE IF NOT EXISTS voice_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('tts', 'stt', 'both')),
  description TEXT,
  config_schema JSONB NOT NULL DEFAULT '{}',
  capabilities JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_voice_providers_key ON voice_providers(key);
CREATE INDEX IF NOT EXISTS idx_voice_providers_category ON voice_providers(category);

-- 2. Provider Credentials (per-org encrypted API keys)
CREATE TABLE IF NOT EXISTS provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL,
  credentials JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(organization_id, provider_key)
);

CREATE INDEX IF NOT EXISTS idx_provider_credentials_org ON provider_credentials(organization_id);
CREATE INDEX IF NOT EXISTS idx_provider_credentials_provider ON provider_credentials(provider_key);

-- 3. Voice Models (available models per provider)
CREATE TABLE IF NOT EXISTS voice_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key TEXT NOT NULL REFERENCES voice_providers(key),
  model_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('tts', 'stt')),
  language TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'neutral', 'unknown')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(provider_key, model_id, language)
);

CREATE INDEX IF NOT EXISTS idx_voice_models_provider ON voice_models(provider_key);
CREATE INDEX IF NOT EXISTS idx_voice_models_type ON voice_models(type);
CREATE INDEX IF NOT EXISTS idx_voice_models_language ON voice_models(language);

-- 4. Supported Languages (language support per provider)
CREATE TABLE IF NOT EXISTS supported_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key TEXT NOT NULL REFERENCES voice_providers(key),
  language_code TEXT NOT NULL,
  language_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(provider_key, language_code)
);

CREATE INDEX IF NOT EXISTS idx_supported_languages_provider ON supported_languages(provider_key);
CREATE INDEX IF NOT EXISTS idx_supported_languages_code ON supported_languages(language_code);

-- Row Level Security
ALTER TABLE voice_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE supported_languages ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'voice_providers', 'provider_credentials', 'voice_models', 'supported_languages'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I_org_isolation ON %I FOR ALL USING (organization_id = current_user_org_id() OR is_system_admin()) WITH CHECK (organization_id = current_user_org_id() OR is_system_admin())',
      t, t
    );
  END LOOP;
END $$;

-- Voice providers are global (no org_id), so we need a different policy for them
DROP POLICY IF EXISTS voice_providers_org_isolation ON voice_providers;
CREATE POLICY voice_providers_read ON voice_providers FOR SELECT USING (true);
CREATE POLICY voice_providers_admin ON voice_providers FOR ALL USING (is_system_admin()) WITH CHECK (is_system_admin());
