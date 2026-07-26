-- ============================================================================
-- Phase 7 Milestone 4: LLM Conversation Engine (7.4)
-- ============================================================================

-- 1. LLM Providers configuration
CREATE TABLE IF NOT EXISTS llm_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google', 'openrouter', 'ollama')),
  api_key_encrypted TEXT,
  api_base_url TEXT,
  default_model TEXT NOT NULL,
  temperature NUMERIC NOT NULL DEFAULT 0.7,
  max_tokens INT NOT NULL DEFAULT 1024,
  top_p NUMERIC,
  frequency_penalty NUMERIC,
  presence_penalty NUMERIC,
  stop_sequences TEXT[],
  metadata JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_llm_providers_organization ON llm_providers (organization_id);
CREATE INDEX IF NOT EXISTS idx_llm_providers_provider ON llm_providers (provider);

-- 2. Prompt templates
CREATE TABLE IF NOT EXISTS prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT,
  variables JSONB NOT NULL DEFAULT '[]',
  tags TEXT[],
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_prompt_templates_organization ON prompt_templates (organization_id);

-- 3. AI conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'openai',
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  intent TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'failed', 'transferred')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_organization ON ai_conversations (organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_agent ON ai_conversations (agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_call ON ai_conversations (call_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_status ON ai_conversations (status);

-- 4. Conversation messages
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  content TEXT NOT NULL,
  intent TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  confidence NUMERIC,
  tokens_used INT,
  latency_ms INT,
  provider TEXT,
  model TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation ON conversation_messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_organization ON conversation_messages (organization_id);

-- 5. AI memory (long-term memory per contact/agent)
CREATE TABLE IF NOT EXISTS ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('summary', 'fact', 'preference', 'intent', 'sentiment_history')),
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  importance_score NUMERIC NOT NULL DEFAULT 0.5,
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_memory_organization ON ai_memory (organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_memory_contact ON ai_memory (contact_id);
CREATE INDEX IF NOT EXISTS idx_ai_memory_agent ON ai_memory (agent_id);

-- 6. LLM usage tracking
CREATE TABLE IF NOT EXISTS llm_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES conversation_messages(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INT NOT NULL,
  completion_tokens INT NOT NULL,
  total_tokens INT NOT NULL,
  latency_ms INT,
  cost NUMERIC,
  currency TEXT NOT NULL DEFAULT 'USD',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_llm_usage_organization ON llm_usage (organization_id);
CREATE INDEX IF NOT EXISTS idx_llm_usage_conversation ON llm_usage (conversation_id);
CREATE INDEX IF NOT EXISTS idx_llm_usage_recorded_at ON llm_usage (recorded_at);
