# RDS AI Call Centre — Database Review

**Database Engine:** PostgreSQL 16+  
**Reviewer:** Kilo Architect  
**Review Date:** 2026-07-04  
**Schema Version:** 1.0.0  
**Overall Score:** 85 / 100

---

## Executive Summary

The production database architecture is **enterprise-grade** and **Supabase-compatible**, with strong multi-tenant isolation via RLS, comprehensive indexing, and audit logging. However, the review identified **critical missing foreign keys**, **inconsistent soft-delete coverage**, **incomplete audit triggers**, and **missing unique constraints** that must be addressed before production.

No previous migrations were modified. All fixes are provided in a single new migration: `009_database_review_fixes.sql`.

---

## 1. Architecture Quality — 90/100

### Strengths
- Clean multi-tenant schema with `organization_id` on all operational tables
- UUID-based PKs aligned with Supabase Auth
- JSONB used extensively for white-label metadata
- Realtime publications on 8 tables
- Vector extension configured for semantic search
- Comprehensive views for reporting and active calls

### Observations
- `organizations.owner_id` is nullable to avoid circular FK — good design
- All foreign keys use `ON DELETE SET NULL` or `ON DELETE CASCADE` appropriately
- Storage paths enforce org isolation via prefix (`org/<org_id>/...`)

### Deductions
- **Missing FKs:** `invoices.subscription_id` and `payments.invoice_id` lack foreign key constraints
- **Missing soft deletes:** 18 tables lack `deleted_at`, breaking consistency for backup/restore workflows

---

## 2. Security Review — 80/100

### Strengths
- RLS enabled on all tenant tables
- `current_user_org_id()` helper enforces org isolation
- `is_system_admin()` grants super-admin bypass
- Audit trigger fires on 7 high-sensitivity tables
- Storage RLS isolates files by org path
- PII stored in JSONB allows application-layer masking

### Critical Issues
| Issue | Severity | Status |
|-------|----------|--------|
| `invoices.subscription_id` missing FK | High | Fixed in 009 |
| `payments.invoice_id` missing FK | High | Fixed in 009 |
| `contacts.phone` not unique per org | Medium | Fixed in 009 |
| `roles` RLS missing in initial migration 002 | High | Fixed in 007 |
| `is_system_admin()` checked `roles.key` (non-existent column) | High | Fixed in 007 |

### Observations
- `activity_logs` and `audit_logs` correctly **lack** soft deletes (append-only)
- `audit_trigger()` uses `inet_client_addr()` — may return NULL behind proxies; consider `X-Forwarded-For` header parsing at the app layer
- `audit_logs.before/after` GIN indexes provide fast state diffing

### Deductions
- Audit trigger coverage is incomplete (only 7 tables); added coverage for `contacts`, `call_recordings`, `call_transcripts`, `ai_agents`, `phone_numbers`, `webhooks` in 009
- `system_settings` lacks audit logging entirely

---

## 3. Performance Review — 85/100

### Strengths
- 60+ indexes including GIN for JSONB and ivfflat for vectors
- Composite indexes on common query patterns (`usage_records(org, date)`, `call_transcripts(call, sequence)`)
- DESC index on `calls.created_at` for recent-first call lists
- Vector index on `knowledge_base.embedding` with cosine ops

### Missing Indexes
| Table | Column | Impact |
|-------|--------|--------|
| `organizations` | `owner_id` | Owner lookups for org management |
| `user_profiles` | `organization_id` | Profile queries by org |
| `contact_lists` | `created_by` | Creator-based filtering |
| `ai_scripts` | `created_by` | Creator-based filtering |
| `knowledge_base` | `created_by` | Author-based filtering |
| `integrations` | `created_by` | Creator-based filtering |
| `support_tickets` | `assignee_id` | Agent queue lookups |
| `payments` | `invoice_id` | Payment reconciliation joins |
| `webhook_deliveries` | `next_attempt_at` | Retry queue scheduling |

### Slow Query Risks
- `v_campaign_summary` performs 4+ COUNT subqueries per campaign — will degrade with 100k+ calls
- `v_call_performance` uses `DATE_TRUNC('hour')` with GROUP BY — may need materialized view + index refresh for production dashboards
- `refresh_campaign_totals()` trigger fires on **every** call INSERT/UPDATE/DELETE; recommend batching via cron for high-volume orgs

### Deductions
- Missing indexes on `created_by` foreign keys reduce dashboard performance
- No materialized views for heavy analytics queries

---

## 4. Scalability Review — 80/100

### Strengths
- Extension-based approach (`uuid-ossp`, `pgcrypto`, `vector`) is production-ready
- `REPLICA IDENTITY FULL` on realtime tables supports logical replication
- `usage_records` uses daily aggregation for metering

### Observations
- `audit_logs` and `activity_logs` are not partitioned; growth will impact vacuum and index maintenance
- `webhook_deliveries` will accumulate quickly; retention fixed at 30 days in `purge_old_logs()`
- No table partitioning strategy for tenant-scale data (10M+ rows per table)

### Deductions
- No horizontal partitioning for `calls`, `audit_logs`, `activity_logs`
- No connection pooling guidance beyond Docker Compose comment
- `campaigns.total_contacts` is denormalized but recalculated via trigger on every call — risk of contention

---

## 5. Maintainability Review — 90/100

### Strengths
- Numbered migrations with clear headers
- Consistent naming conventions (`idx_*`, `uq_*`, `trg_*`, `v_*`)
- Comprehensive ER diagram in `docs/04_Database_Design.md`
- `DATABASE_REPORT.md` provides installation and verification steps

### Observations
- `007_fixes.sql` is a catch-all; recommend splitting future fixes into focused migrations
- `DATABASE_REPORT.md` should include migration order in a numbered table

### Deductions
- Fix migration 007 mixed DDL concerns (functions, indexes, policies) in one file
- No migration status tracking table (e.g., `schema_migrations`) for idempotent deployments

---

## 6. Compliance Review — 85/100

### Strengths
- `compliance_dnd_check` and `compliance_consent_required` flags at org level
- `contacts.dnd_status` flag for per-contact suppression
- Immutable `audit_logs` table
- Retention functions prescript calls for 13 months, logs for 90 days hot

### Observations
- `audit_logs` captures `before` and `after` JSONB for full state diffing — excellent for forensics
- `purge_old_logs()` uses `DELETE` rather than partition detach — may cause table bloat
- No PII masking at database layer (correctly delegated to app layer)

### Deductions
- `purge_old_logs()` is a manual function; no scheduled job reference
- No GDPR-style `right_to_deletion` flag on users/contacts
- `call_transcripts` stores raw text without redaction; consent enforcement not automated in DB

---

## 7. White-Label Compatibility — 90/100

### Strengths
- `organizations.branding` JSONB stores logos, colors, custom domains
- `organizations.slug` enables subdomain-based routing
- `organizations.locale` and `timezone` for i18n
- `system_settings` allows global feature flags
- Extensive `metadata` JSONB columns avoid schema migrations for new org-specific fields

### Observations
- `organization_settings.ai_greeting` and `ai_fallback_message` are good white-label hooks
- `voice_profiles` allow org-specific TTS branding

### Deductions
- `organizations.metadata` is not indexed via GIN in initial schema (added in 003, but verify)
- No CNAME/custom domain validation constraints at DB level

---

## 8. Foreign Key Review

| FK | Source | Target | ON DELETE | Status |
|----|--------|--------|-----------|--------|
| `organizations.owner_id` | users | users | SET NULL | ✅ |
| `user_profiles.user_id` | users | users | CASCADE | ✅ |
| `user_roles.user_id` | users | users | CASCADE | ✅ |
| `user_roles.role_id` | roles | roles | CASCADE | ✅ |
| `role_permissions.role_id` | roles | roles | CASCADE | ✅ |
| `role_permissions.permission_id` | permissions | permissions | CASCADE | ✅ |
| `contacts.contact_list_id` | contact_lists | contact_lists | SET NULL | ✅ |
| `calls.campaign_id` | campaigns | campaigns | SET NULL | ✅ |
| `calls.contact_id` | contacts | contacts | SET NULL | ✅ |
| `calls.agent_id` | ai_agents | ai_agents | SET NULL | ✅ |
| `calls.from_number_id` | phone_numbers | phone_numbers | SET NULL | ✅ |
| `calls.call_queue_id` | call_queues | call_queues | SET NULL | ✅ |
| `call_recordings.call_id` | calls | calls | CASCADE | ✅ |
| `call_transcripts.call_id` | calls | calls | CASCADE | ✅ |
| `call_analytics.call_id` | calls | calls | CASCADE | ✅ |
| `knowledge_base.ai_agent_id` | ai_agents | ai_agents | SET NULL | ✅ |
| `knowledge_base.created_by` | users | users | NO ACTION | ✅ |
| `invoices.subscription_id` | subscriptions | subscriptions | — | ❌ Missing |
| `payments.invoice_id` | invoices | invoices | — | ❌ Missing |

---

## 9. Unique Constraints Review

| Table | Columns | Status |
|-------|---------|--------|
| `organizations` | `slug` | ✅ |
| `users` | `auth_user_id` | ✅ |
| `users` | `email` | ✅ |
| `user_profiles` | `user_id` | ✅ |
| `permissions` | `key` | ✅ |
| `role_permissions` | `(role_id, permission_id)` | ✅ |
| `user_roles` | `(user_id, role_id, organization_id)` | ✅ |
| `organization_settings` | `organization_id` | ✅ |
| `wallets` | `organization_id` | ✅ |
| `subscriptions` | `organization_id` | ✅ |
| `contacts` | `(organization_id, phone)` | ❌ Missing |
| `roles` | `(organization_id, name)` | ✅ Fixed in 007 |

---

## 10. Soft Deletes Review

| Table | Has `deleted_at` | Recommendation |
|-------|------------------|----------------|
| `organizations` | ✅ | — |
| `users` | ✅ | — |
| `ai_agents` | ✅ | — |
| `ai_scripts` | ✅ | — |
| `voice_profiles` | ✅ | — |
| `phone_numbers` | ✅ | — |
| `contact_lists` | ✅ | — |
| `contacts` | ✅ | — |
| `campaigns` | ✅ | — |
| `calls` | ✅ | — |
| `knowledge_base` | ✅ | — |
| `api_keys` | ✅ | — |
| `integrations` | ✅ | — |
| `webhooks` | ✅ | — |
| `call_queues` | ✅ | Fixed in 007 |
| **`organization_settings`** | ❌ | Add |
| **`user_profiles`** | ❌ | Add |
| **`roles`** | ❌ | Add |
| **`permissions`** | ❌ | Add |
| **`role_permissions`** | ❌ | Add |
| **`user_roles`** | ❌ | Add |
| **`call_recordings`** | ❌ | Add |
| **`call_transcripts`** | ❌ | Add |
| **`call_analytics`** | ❌ | Add |
| **`subscriptions`** | ❌ | Add |
| **`invoices`** | ❌ | Add |
| **`payments`** | ❌ | Add |
| **`wallets`** | ❌ | Add |
| **`usage_records`** | ❌ | Add |
| **`notifications`** | ❌ | Add |
| **`support_tickets`** | ❌ | Add |
| **`system_settings`** | ❌ | Add |
| `activity_logs` | ❌ | ✅ Correct (append-only) |
| `audit_logs` | ❌ | ✅ Correct (append-only) |
| `webhook_deliveries` | ❌ | Consider (log-like) |

---

## 11. Audit Trigger Coverage

| Table | Audit Trigger | Status |
|-------|---------------|--------|
| `organizations` | ✅ | — |
| `users` | ✅ | — |
| `api_keys` | ✅ | — |
| `integrations` | ✅ | — |
| `webhooks` | ✅ | — |
| `calls` | ✅ | — |
| `campaigns` | ✅ | — |
| `contacts` | ❌ | Add |
| `call_recordings` | ❌ | Add |
| `call_transcripts` | ❌ | Add |
| `ai_agents` | ❌ | Add |
| `phone_numbers` | ❌ | Add |
| `subscriptions` | ❌ | Add |
| `invoices` | ❌ | Add |
| `payments` | ❌ | Add |
| `wallets` | ❌ | Add |

---

## Future Recommendations

1. **Partition `audit_logs` by month** — use declarative partitioning in PostgreSQL 16+
2. **Partition `calls` by `created_at`** — monthly partitions for efficient purging
3. **Materialized views** for `v_campaign_summary` and `v_call_performance` with refresh cron
4. **Add `schema_migrations` table** for idempotent deployment tracking
5. **Add PII redaction trigger** on `contacts.phone` and `contacts.email` for support staff access
6. **Implement connection pooling** via PgBouncer for production
7. **Add `updated_at` trigger to `user_roles`** for accurate role-change auditing
8. **Consider `ON DELETE RESTRICT`** for `payments` to prevent accidental invoice deletion
9. **Add `deleted_at` index coverage** for all soft-deletable tables
10. **Create `storage.objects` RLS** in `public` schema for Supabase compatibility

---

*Report generated: 2026-07-04*
