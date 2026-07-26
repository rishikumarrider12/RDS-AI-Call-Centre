-- =============================================
-- RDS AI Call Centre — Views
-- =============================================

-- 1. Active calls view (60s stale grace)
CREATE OR REPLACE VIEW v_active_calls AS
SELECT
  c.*,
  o.name AS organization_name,
  cp.first_name AS contact_first_name,
  cp.last_name AS contact_last_name,
  cp.phone AS contact_phone,
  ag.name AS agent_name
FROM calls c
JOIN organizations o ON o.id = c.organization_id
LEFT JOIN contacts cp ON cp.id = c.contact_id
LEFT JOIN ai_agents ag ON ag.id = c.agent_id
WHERE c.status IN ('queued', 'ringing', 'connected')
  AND c.answer_at > now() - INTERVAL '1 hour'
  AND (c.end_at IS NULL OR c.end_at < c.answer_at + INTERVAL '1 hour')
  AND c.deleted_at IS NULL;

-- 2. Campaign summary view
CREATE OR REPLACE VIEW v_campaign_summary AS
SELECT
  camp.id,
  camp.name,
  camp.organization_id,
  o.name AS organization_name,
  camp.status,
  camp.total_contacts,
  camp.completed_contacts,
  camp.failed_contacts,
  ROUND(
    CASE WHEN camp.total_contacts > 0 THEN
      (camp.completed_contacts::NUMERIC / camp.total_contacts::NUMERIC) * 100
    ELSE 0 END,
    2
  ) AS completion_rate,
  COUNT(c.id) AS total_calls,
  COUNT(CASE WHEN c.status = 'connected' THEN 1 END) AS connected_calls,
  COUNT(CASE WHEN c.status = 'failed' THEN 1 END) AS failed_calls,
  ROUND(SUM(c.duration_seconds) / 60.0, 2) AS total_minutes,
  ROUND(SUM(c.cost), 2) AS total_cost
FROM campaigns camp
JOIN organizations o ON o.id = camp.organization_id
LEFT JOIN calls c ON c.campaign_id = camp.id AND c.deleted_at IS NULL
WHERE camp.deleted_at IS NULL
GROUP BY camp.id, camp.name, camp.organization_id, o.name, camp.status;

-- 3. Daily org usage view
CREATE OR REPLACE VIEW v_org_usage_daily AS
SELECT
  ur.organization_id,
  o.name AS organization_name,
  ur.record_date,
  ur.ai_minutes,
  ur.telephony_minutes,
  ur.calls_count,
  ur.storage_bytes,
  ur.stt_minutes,
  ur.tts_characters,
  ROUND((ur.ai_minutes + ur.telephony_minutes + ur.stt_minutes) / 60.0, 2) AS total_hours
FROM usage_records ur
JOIN organizations o ON o.id = ur.organization_id
ORDER BY ur.record_date DESC;

-- 4. Readable audit trail
CREATE OR REPLACE VIEW v_audit_trail AS
SELECT
  al.id,
  al.organization_id,
  o.name AS organization_name,
  al.actor_id,
  u.full_name AS actor_name,
  u.email AS actor_email,
  al.action,
  al.actor_type,
  al.resource_type,
  al.resource_id,
  al.ip_address,
  al.before,
  al.after,
  al.created_at
FROM audit_logs al
LEFT JOIN organizations o ON o.id = al.organization_id
LEFT JOIN users u ON u.id = al.actor_id
ORDER BY al.created_at DESC;

-- 5. Call performance view
CREATE OR REPLACE VIEW v_call_performance AS
SELECT
  DATE_TRUNC('hour', c.created_at) AS hour,
  c.organization_id,
  o.name AS organization_name,
  COUNT(*) AS total_calls,
  COUNT(CASE WHEN c.status = 'connected' THEN 1 END) AS connected_calls,
  COUNT(CASE WHEN c.status = 'failed' THEN 1 END) AS failed_calls,
  ROUND(COUNT(CASE WHEN c.status = 'connected' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100, 2) AS connect_rate,
  ROUND(AVG(c.duration_seconds), 2) AS avg_duration,
  ROUND(SUM(c.cost), 2) AS total_cost
FROM calls c
JOIN organizations o ON o.id = c.organization_id
WHERE c.deleted_at IS NULL
  AND c.created_at >= now() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('hour', c.created_at), c.organization_id, o.name;

-- 6. Agent usage view
CREATE OR REPLACE VIEW v_agent_usage AS
SELECT
  a.id,
  a.name,
  a.organization_id,
  o.name AS organization_name,
  COUNT(c.id) AS total_calls,
  COUNT(CASE WHEN c.status = 'connected' THEN 1 END) AS connected_calls,
  ROUND(AVG(c.duration_seconds), 2) AS avg_duration,
  ROUND(SUM(c.cost), 2) AS total_cost
FROM ai_agents a
JOIN organizations o ON o.id = a.organization_id
LEFT JOIN calls c ON c.agent_id = a.id AND c.deleted_at IS NULL
WHERE a.deleted_at IS NULL
GROUP BY a.id, a.name, a.organization_id, o.name;
