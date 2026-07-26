-- =============================================
-- RDS AI Call Centre — Supabase Storage Buckets
-- =============================================

-- Recordings bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recordings',
  'recordings',
  false,
  104857600,
  ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'video/mp4']
) ON CONFLICT (id) DO NOTHING;

-- Transcripts bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transcripts',
  'transcripts',
  false,
  10485760,
  ARRAY['text/plain', 'text/vtt', 'application/json']
) ON CONFLICT (id) DO NOTHING;

-- Knowledge base bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-base',
  'knowledge-base',
  false,
  52428800,
  ARRAY['application/pdf', 'text/plain', 'application/json', 'text/markdown']
) ON CONFLICT (id) DO NOTHING;

-- =============================================
-- Storage RLS Policies
-- =============================================

-- Objects are scoped by organization_id in path: org/<org_id>/...
CREATE POLICY storage_org_isolation ON storage.objects
  FOR ALL USING (
    auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'org'
    AND (storage.foldername(name))[2] = (
      SELECT users.organization_id::text
      FROM users
      WHERE users.auth_user_id = auth.uid()
      LIMIT 1
    )
  );
