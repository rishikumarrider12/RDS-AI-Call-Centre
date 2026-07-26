-- =============================================
-- RDS AI Call Centre — Functions & Triggers
-- =============================================

-- 1. Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Audit trigger for high-sensitivity tables
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  actor UUID;
  actor_id UUID;
BEGIN
  SELECT users.id INTO actor_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
  INSERT INTO audit_logs (
    organization_id, actor_id, action,
    actor_type, resource_type, resource_id,
    ip_address, user_agent, before, after, created_at
  ) VALUES (
    COALESCE(NEW.organization_id, OLD.organization_id),
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

-- 3. Usage increment function
CREATE OR REPLACE FUNCTION increment_usage_record(
  p_organization_id UUID,
  p_record_date DATE,
  p_ai_minutes NUMERIC DEFAULT 0,
  p_telephony_minutes NUMERIC DEFAULT 0,
  p_calls_count INT DEFAULT 0,
  p_storage_bytes BIGINT DEFAULT 0,
  p_stt_minutes NUMERIC DEFAULT 0,
  p_tts_characters INT DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  INSERT INTO usage_records (
    organization_id, record_date, ai_minutes, telephony_minutes,
    calls_count, storage_bytes, stt_minutes, tts_characters, created_at, updated_at
  ) VALUES (
    p_organization_id, p_record_date, p_ai_minutes, p_telephony_minutes,
    p_calls_count, p_storage_bytes, p_stt_minutes, p_tts_characters, now(), now()
  )
  ON CONFLICT (organization_id, record_date)
  DO UPDATE SET
    ai_minutes = usage_records.ai_minutes + EXCLUDED.ai_minutes,
    telephony_minutes = usage_records.telephony_minutes + EXCLUDED.telephony_minutes,
    calls_count = usage_records.calls_count + EXCLUDED.calls_count,
    storage_bytes = usage_records.storage_bytes + EXCLUDED.storage_bytes,
    stt_minutes = usage_records.stt_minutes + EXCLUDED.stt_minutes,
    tts_characters = usage_records.tts_characters + EXCLUDED.tts_characters,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- 4. Auto-update contact_list totals
CREATE OR REPLACE FUNCTION refresh_contact_list_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE contact_lists
    SET total_contacts = (
      SELECT count(*) FROM contacts
      WHERE contact_list_id = NEW.contact_list_id
      AND deleted_at IS NULL
    )
    WHERE id = NEW.contact_list_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE contact_lists
    SET total_contacts = (
      SELECT count(*) FROM contacts
      WHERE contact_list_id = OLD.contact_list_id
      AND deleted_at IS NULL
    )
    WHERE id = OLD.contact_list_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Auto-update campaign totals
CREATE OR REPLACE FUNCTION refresh_campaign_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE campaigns
    SET
      completed_contacts = (
        SELECT count(*) FROM calls
        WHERE campaign_id = NEW.campaign_id
        AND status IN ('ended', 'connected')
        AND deleted_at IS NULL
      ),
      failed_contacts = (
        SELECT count(*) FROM calls
        WHERE campaign_id = NEW.campaign_id
        AND status IN ('failed', 'no-answer', 'busy')
        AND deleted_at IS NULL
      )
    WHERE id = NEW.campaign_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE campaigns
    SET
      completed_contacts = (
        SELECT count(*) FROM calls
        WHERE campaign_id = OLD.campaign_id
        AND status IN ('ended', 'connected')
        AND deleted_at IS NULL
      ),
      failed_contacts = (
        SELECT count(*) FROM calls
        WHERE campaign_id = OLD.campaign_id
        AND status IN ('failed', 'no-answer', 'busy')
        AND deleted_at IS NULL
      )
    WHERE id = OLD.campaign_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Cleanup old logs (retention: 90 days)
CREATE OR REPLACE FUNCTION purge_old_logs()
RETURNS VOID AS $$
BEGIN
  DELETE FROM activity_logs WHERE created_at < now() - INTERVAL '90 days';
  DELETE FROM webhook_deliveries WHERE created_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
