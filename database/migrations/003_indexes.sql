-- =============================================
-- RDS AI Call Centre — Indexes
-- Optimized for multi-tenant SaaS workloads
-- =============================================

-- Multi-tenant first
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_status ON organizations(status);

CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_status ON users(status);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_org_id ON user_roles(organization_id);
CREATE INDEX idx_roles_organization_id ON roles(organization_id);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Call center
CREATE INDEX idx_ai_agents_organization_id ON ai_agents(organization_id);
CREATE INDEX idx_ai_scripts_organization_id ON ai_scripts(organization_id);
CREATE INDEX idx_voice_profiles_organization_id ON voice_profiles(organization_id);
CREATE INDEX idx_phone_numbers_organization_id ON phone_numbers(organization_id);
CREATE INDEX idx_phone_numbers_number ON phone_numbers(number);

CREATE INDEX idx_contact_lists_organization_id ON contact_lists(organization_id);
CREATE INDEX idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX idx_contacts_contact_list_id ON contacts(contact_list_id);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_email ON contacts(email);

CREATE INDEX idx_campaigns_organization_id ON campaigns(organization_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_contact_list_id ON campaigns(contact_list_id);
CREATE INDEX idx_campaigns_started_at ON campaigns(started_at);

CREATE INDEX idx_call_queues_organization_id ON call_queues(organization_id);
CREATE INDEX idx_calls_organization_id ON calls(organization_id);
CREATE INDEX idx_calls_campaign_id ON calls(campaign_id);
CREATE INDEX idx_calls_contact_id ON calls(contact_id);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_direction ON calls(direction);
CREATE INDEX idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX idx_calls_call_queue_id ON calls(call_queue_id);

CREATE INDEX idx_call_recordings_call_id ON call_recordings(call_id);
CREATE INDEX idx_call_recordings_organization_id ON call_recordings(organization_id);
CREATE INDEX idx_call_transcripts_call_id ON call_transcripts(call_id);
CREATE INDEX idx_call_transcripts_sequence ON call_transcripts(call_id, sequence);
CREATE INDEX idx_call_analytics_call_id ON call_analytics(call_id);

CREATE INDEX idx_knowledge_base_organization_id ON knowledge_base(organization_id);
CREATE INDEX idx_knowledge_base_agent_id ON knowledge_base(ai_agent_id);
CREATE INDEX idx_knowledge_base_tags ON knowledge_base USING GIN (tags);

-- Integrations & webhooks
CREATE INDEX idx_api_keys_organization_id ON api_keys(organization_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_integrations_organization_id ON integrations(organization_id);
CREATE INDEX idx_webhooks_organization_id ON webhooks(organization_id);
CREATE INDEX idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);

-- Billing & usage
CREATE INDEX idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_payments_organization_id ON payments(organization_id);
CREATE INDEX idx_wallets_organization_id ON wallets(organization_id);
CREATE INDEX idx_usage_records_org_date ON usage_records(organization_id, record_date DESC);

-- System & support
CREATE INDEX idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
CREATE INDEX idx_support_tickets_organization_id ON support_tickets(organization_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);

CREATE INDEX idx_activity_logs_organization_id ON activity_logs(organization_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_metadata ON activity_logs USING GIN (metadata);

CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_before ON audit_logs USING GIN (before);
CREATE INDEX idx_audit_logs_after ON audit_logs USING GIN (after);

CREATE INDEX idx_system_settings_key ON system_settings(key);

-- JSONB GIN indexes for search/filtering
CREATE INDEX idx_organizations_branding ON organizations USING GIN (branding);
CREATE INDEX idx_calls_metadata ON calls USING GIN (metadata);
CREATE INDEX idx_contacts_metadata ON contacts USING GIN (metadata);
CREATE INDEX idx_notifications_data ON notifications USING GIN (data);
CREATE INDEX idx_integrations_config ON integrations USING GIN (config);
CREATE INDEX idx_webhook_deliveries_payload ON webhook_deliveries USING GIN (payload);

-- Vector index for semantic search (cosine distance)
CREATE INDEX idx_knowledge_base_embedding ON knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
