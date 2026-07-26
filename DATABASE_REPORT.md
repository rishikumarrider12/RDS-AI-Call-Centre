# RDS AI Call Centre — Database Report

**Database Engine:** PostgreSQL 16+  
**Compatibility:** Supabase (PostgreSQL with Auth, Realtime, Storage)  
**Schema Version:** 1.0.0  
**Date:** 2026-07-04  
**Status:** Phase 2 — Enterprise Database Architecture Complete

---

## Architecture Summary

| Attribute | Value |
|-----------|-------|
| **Total Tables** | 36 |
| **Total Views** | 6 |
| **Total Functions** | 8 |
| **Total Triggers** | 40+ |
| **Extensions Used** | uuid-ossp, pgcrypto, vector |
| **RLS Enabled** | Yes — all tables |
| **Realtime Enabled** | Yes — 8 tables |
| **Vector Index** | Yes — ivfflat on knowledge_base |
| **Default Retention** | Calls: 13 months, Logs: 90 days hot |
| **Storage Buckets** | 3 (recordings, transcripts, knowledge-base) |

---

## Migration Files

| File | Purpose | Status |
|------|---------|--------|
| `001_initial_schema.sql` | All 36 tables + Realtime identity | ✅ Complete |
| `002_rls_policies.sql` | Row Level Security policies (initial) | ✅ Complete |
| `003_indexes.sql` | Index strategy (btree, GIN, ivfflat) | ✅ Complete |
| `004_functions_triggers.sql` | SQL functions for business logic | ✅ Complete |
| `005_views.sql` | Read models and reporting views | ✅ Complete |
| `006_trigger_assignments.sql` | Trigger bindings to tables | ✅ Complete |
| `007_fixes.sql` | RLS fixes, schema corrections, unique indexes | ✅ Complete |
| `008_storage_buckets.sql` | Supabase Storage buckets + RLS | ✅ Complete |
| `seeds/001_system_seed.sql` | System settings seed | ✅ Complete |
| `seeds/002_reference_data.sql` | Roles and permissions seed | ✅ Complete |
| `seeds/003_demo_data.sql` | Local development demo data | ✅ Complete |

---

## Installation

### 1. Create Database
\1. Create a new PostgreSQL database (local or Supabase):
   \`\`\`bash
   createdb rds_call_centre
   \`\`\`\2. Connect and enable extensions:
   \`\`\`sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "pgcrypto";
   CREATE EXTENSION IF NOT EXISTS "vector";
   \`\`\`\3. Apply migrations in order:
   \`\`\`bash
   psql -U postgres -d rds_call_centre -f database/migrations/001_initial_schema.sql
   psql -U postgres -d rds_call_centre -f database/migrations/002_rls_policies.sql
   psql -U postgres -d rds_call_centre -f database/migrations/003_indexes.sql
   psql -U postgres -d rds_call_centre -f database/migrations/004_functions_triggers.sql
   psql -U postgres -d rds_call_centre -f database/migrations/005_views.sql
   psql -U postgres -d rds_call_centre -f database/migrations/006_trigger_assignments.sql
   psql -U postgres -d rds_call_centre -f database/migrations/007_fixes.sql
   psql -U postgres -d rds_call_centre -f database/migrations/008_storage_buckets.sql
   psql -U postgres -d rds_call_centre -f database/migrations/seeds/001_system_seed.sql
   psql -U postgres -d rds_call_centre -f database/migrations/seeds/002_reference_data.sql
   psql -U postgres -d rds_call_centre -f database/migrations/seeds/003_demo_data.sql
   \`\`\`\### 2. Supabase Project Setup
\1. Create a new Supabase project.\2. In Supabase SQL Editor, copy-paste each migration file in order.
   \3. Enable Realtime for the following tables in Supabase Dashboard:
   - organizations
   - users
   - campaigns
   - calls
   - call_transcripts
   - call_recordings
   - activity_logs
   - notifications\4. Storage buckets are auto-created by `008_storage_buckets.sql`. Verify in Supabase Dashboard > Storage.
   \### 3. Verification
   \`\`\`sql
   -- Verify tables
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

   -- Verify extensions
   SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto', 'vector');

   -- Verify RLS is enabled
   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

   -- Verify system rows
   SELECT * FROM system_settings;
   SELECT * FROM permissions;
   SELECT * FROM roles;

   -- Verify RLS policies exist for critical tables
   SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('users', 'organizations', 'calls', 'campaigns', 'roles', 'permissions');

   -- Verify indexes
   SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;

   -- Verify triggers
   SELECT tgname FROM pg_trigger WHERE tgisinternal = false ORDER BY tgname;

   -- Verify functions
   SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace ORDER BY proname;

   -- Verify views
   SELECT viewname FROM pg_views WHERE schemaname = 'public' ORDER BY viewname;

   -- Verify storage buckets
   SELECT id, name, public FROM storage.buckets ORDER BY name;
   \`\`\`
   \---

## Security Checklist

- [x] All tenant data isolated by `organization_id`
- [x] RLS policies enforce tenant isolation
- [x] Soft deletes on all mutable tables via `deleted_at`
- [x] Append-only audit trail via `audit_trigger()`
- [x] Auto-updated `updated_at` timestamps
- [x] Sensitive columns flagged for encryption (at application layer)
- [x] Vector index configured for semantic search
- [x] Realtime publications enabled for live features
- [x] DND and consent compliance fields present
- [x] JSONB used for extensible metadata (white-label ready)
- [x] Storage buckets isolated by org path prefix
- [x] Roles/permissions RLS enforced
- [x] `is_system_admin()` correctly checks `roles.name`

---

## Known Limitations / Next Steps

1. **Horizontal partitioning:** `audit_logs` and `activity_logs` will grow quickly. Production should partition `audit_logs` by month.
2. **Connection pooling:** Production should use PgBouncer or Supabase connection pooler for web-scale connections.
3. **Backup strategy:** Configure automated daily backups with point-in-time recovery (PITR).
4. **Encryption at rest:** Supabase provides disk encryption. Application-layer field encryption for PII is TBD in Phase 5.
5. **Retention policies:** Implement cron jobs for purging old logs and archived recordings per compliance settings.
6. **Read replicas:** For analytics-heavy workloads, consider read replicas for `v_*` views.

---

## ER Diagram

Refer to `docs/04_Database_Design.md` for the full Mermaid ER diagram.

---

## Verified Migrations

| Check | Result |
|-------|--------|
| Foreign key references resolve | ✅ |
| No circular FK without deferrability | ✅ (owner_id deferred via nullable FK) |
| All `organization_id` columns indexed | ✅ |
| All `updated_at` columns have triggers | ✅ |
| RLS policies cover SELECT/INSERT/UPDATE/DELETE | ✅ |
| `audit_trigger()` fires on high-sensitivity tables | ✅ |
| Views reference existing columns | ✅ |
| Seed data respects FK order | ✅ |
| Storage bucket paths enforce org isolation | ✅ |

---

*Report generated: 2026-07-04*
