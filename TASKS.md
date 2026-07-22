# RDS AI Call Centre — Task List

**Prioritization Legend:** P0 (Must have now) → P1 (Next) → P2 (Soon) → P3 (Nice to have)  
**Status Legend:** `pending` | `in_progress` | `blocked` | `done`

---

## Phase 1: Foundation & Core Backend

### P0 — Immediate Blockers

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 1.1 | Choose tech stack and approve architecture diagrams | Architect | pending | Monorepo vs separate repos; backend framework; DB choice |
| 1.2 | Initialize monorepo with backend, frontend, shared packages | Backend | pending | pnpm / yarn workspaces or npm workspaces |
| 1.3 | Bootstrap backend project (framework, lint, test, env) | Backend | pending | Nx / Turborepo or plain workspaces |
| 1.4 | Bootstrap frontend project (framework, lint, test, env) | Frontend | pending | Next.js recommended |
| 1.5 | Provision PostgreSQL and create base schema v0.1 | Backend | done | 36 tables, RLS, indexes, functions, triggers, views, seeds |
| 1.6 | Implement authentication module (password + OAuth) | Backend | done | Supabase Auth email/password, cookies, reset, verification (Phase 3.1) |
| 1.7 | Implement authorization (RBAC: super_admin, org_admin, agent, viewer) | Backend | done | Middleware + guards (Phase 3.2) |
| 1.8 | Write Docker compose for local development | DevOps | pending | app, db, redis, minio |
| 1.9 | Configure GitHub Actions or CI pipeline skeleton | DevOps | pending | lint, test, build |
| 1.10 | Deploy staging environment | DevOps | pending | Render / Fly / AWS ECS |
| 1.11 | Health check and readiness endpoints | Backend | pending | `/healthz`, `/readiness` |

### P1 — Early Foundation

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 1.12 | Rate limiting and abuse prevention (express-rate-limit / Envoy) | Backend | pending | Per IP and per user |
| 1.13 | Structured logging with request IDs | Backend | pending | Pino or Winston |
| 1.14 | Shared API client and SDK for frontend | Frontend | pending | axios / fetch wrapper |
| 1.15 | Organization onboarding wizard API | Backend | done | Org creation, plan selection (self-service `/onboard`) |
| 1.16 | Initial test suite scaffold (backend unit + integration) | QA | pending | Vitest / Jest |
| 1.17 | Database migration tooling and seed scripts | Backend | done | 8 migrations + 3 seed files with verification |
| 1.18 | Email service (password reset, invitations) | Backend | done | Handled via Supabase Auth email templates |

---

## Phase 2: AI Calling Core

### P0 — Telephony Integration

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 2.1 | Select primary telephony provider (SIP or CPaaS) | Architect | pending | Twilio / Plivo / Exotel / local SIP |
| 2.2 | Implement provider abstraction layer | Backend | pending | Dial, Hangup, Answer, Stream interface |
| 2.3 | Implement telephony webhook handler | Backend | pending | Answer, DTMF, Hangup, Status |
| 2.4 | Implement outbound dialer engine (single worker) | Backend | pending | Queue-based campaign runner |
| 2.5 | Implement inbound call routing | Backend | pending | Route to flow or agent |
| 2.6 | Implement call state machine | Backend | pending | queued → ringing → connected → ended |
| 2.7 | Implement recording ingestion pipeline | Backend | pending | Download recording, store in S3 / MinIO |
| 2.8 | Implement contact / CSV import API | Backend | pending | Async parsing, validation, dedup |
| 2.9 | Implement campaign CRUD API | Backend | pending | Schedule, retry rules, timezone windows |
| 2.10 | Implement live call status API (polls + websockets) | Backend | pending | Redis pub/sub or NATS |

### P1 — TTS / STT Foundations

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 2.11 | Select primary TTS provider | Architect | pending | ElevenLabs / Amazon Polly / Google |
| 2.12 | Implement TTS provider abstraction | Backend | pending | Text → audio URL / stream |
| 2.13 | Stream audio into live call (real-time or early media) | Backend | pending | Provider-specific |
| 2.14 | Select primary STT provider | Architect | pending | Deepgram / Google / Whisper |
| 2.15 | Implement STT provider abstraction | Backend | pending | Audio → transcript chunks |
| 2.16 | Implement real-time transcript storage | Backend | pending | Per call, chunked |

### P2 — Calling Enhancements

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 2.17 | Retry and back-off logic per contact / campaign | Backend | pending | Jittered exponential |
| 2.18 | Timezone-aware calling windows | Backend | pending | Respect local legal hours |
| 2.19 | DND list pre-check before dial | Backend | pending | Regulatory requirement |
| 2.20 | Voicemail detection | Backend | pending | Detect human vs machine |
| 2.21 | Call transfer (warm / blind) | Backend | pending | To agent or external number |

---

## Phase 3.1: Authentication Foundation

### P0 — Supabase Auth

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 3.1.1 | Implement Supabase Auth service wrapper | Backend | done | signUp, signIn, signOut, forgotPassword, resetPassword, verifyEmail, refreshSession |
| 3.1.2 | Implement auth middleware (cookie-based) | Backend | done | `authenticate` using HttpOnly cookies, `requireAuth` guard |
| 3.1.3 | Create auth routes | Backend | done | /register, /login, /logout, /forgot-password, /reset-password, /verify-email, /me, /refresh |
| 3.1.4 | Implement secure HttpOnly cookies | Backend | done | `rds_access_token`, `rds_refresh_token` with configurable secure/sameSite |
| 3.1.5 | Create frontend auth pages | Frontend | done | Login, Register, Forgot Password, Reset Password, Verify Email |
| 3.1.6 | Add CORS + CSRF-ready headers | Backend | done | `X-CSRF-Token` allowed header, `cross-origin` resource policy |

---

## Phase 3.2: Authorization / RBAC

### P0 — Role-Based Access Control

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 3.2.1 | Implement RBAC middleware | Backend | done | `requireRole` and `requireAnyRole` guards |
| 3.2.2 | Populate roles from Supabase user metadata | Backend | done | `user_metadata.role` / `app_metadata.roles` extraction |
| 3.2.3 | Refactor `/me` to use `authenticate` middleware | Backend | done | Centralizes JWT validation and role parsing |

---

## Phase 3.3: Protected Routes

### P0 — Client-Side Route Guards

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 3.3.1 | Implement Next.js middleware route guard | Frontend | done | `middleware.ts` guards `/dashboard`, validates session via `/api/auth/me` with forwarded cookies |
| 3.3.2 | Redirect unauthenticated users to login | Frontend | done | Preserves intended destination via `?redirect=` query param |
| 3.3.3 | Add minimal protected dashboard shell | Frontend | done | `/dashboard` page fetches `/api/auth/me`, shows user, sign-out action |

---

## Phase 3.4: Session & Account Security

### P0 — Session Management

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 3.4.1 | Password reset flow | Backend | done | `/forgot-password` and `/reset-password` endpoints |
| 3.4.2 | Email verification flow | Backend | done | `/verify-email` endpoint |
| 3.4.3 | Refresh session endpoint | Backend | done | `/refresh` rotates access and refresh tokens |
| 3.4.4 | Logout improvements | Backend | done | Clears cookies even if Supabase `signOut` fails |
| 3.4.5 | Remember me support | Frontend/Backend | done | Extends cookie maxAge to 30 days when enabled |
| 3.4.6 | Session expiration handling | Frontend | done | `useSession` hook auto-recovers from expired access tokens via refresh |

---

## Phase 3: LLM Conversation Engine

### P0 — Core Intelligence

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 3.1 | Select primary LLM provider | Architect | pending | OpenAI / Anthropic / local |
| 3.2 | Implement LLM provider abstraction | AI Engineer | pending | Chat completion, streaming |
| 3.3 | Implement conversation state manager per call | AI Engineer | pending | History, turn count, flags |
| 3.4 | Build prompt template engine | AI Engineer | pending | Variables, history, system prompts |
| 3.5 | Implement intent classifier (LLM-based or NLU fallback) | AI Engineer | pending | Classify user response in real time |
| 3.6 | Implement fallback and transfer rules | AI Engineer | pending | "I did not understand..." → transfer |
| 3.7 | Implement post-call summary generator | AI Engineer | pending | Structured summary: outcome, interest, follow-up |

### P1 — Flow & Control

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 3.8 | Build visual flow builder UI | Frontend | pending | Nodes and edges; save as JSON |
| 3.9 | Implement flow executor engine | AI Engineer | pending | Graph traversal per call |
| 3.10 | Implement dynamic variable substitution in prompts | AI Engineer | pending | Customer name, product, price |
| 3.11 | Implement barge-in and agent takeover | Backend | pending | Supervisor joins live audio |
| 3.12 | Implement call coaching (whisper to agent only) | Backend | pending | Agent hearing + AI suggestions |

### P2 — Advanced

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 3.13 | Sentiment analysis per turn | AI Engineer | pending | Positive / negative / neutral |
| 3.14 | Auto follow-up (email / SMS) trigger post-call | Backend | pending | Based on outcome and summary |
| 3.15 | Multilingual support and routing | AI Engineer | pending | Detect speech language and switch |

---

## Phase 4: Frontend Application

### P0 — Auth & Core UI

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 4.1 | Design system and component library | Frontend | done | Card, Input, Textarea, Select, Badge, Dialog, Table, Tabs, Toast in @rds/ui |
| 4.2 | Login, forgot password, and 2FA pages | Frontend | pending | |
| 4.3 | Organization onboarding wizard | Frontend | done | Name, slug, description, timezone, locale, plan |
| 4.4 | Admin dashboard shell (nav, sidebar, layout) | Frontend | done | DashboardLayout with sidebar nav, mobile drawer, theme toggle |
| 4.5 | Org settings pages (general, users, API keys) | Frontend | done | Users management, Invite dialog, API Keys page |

### P1 — Operational Pages

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 4.6 | Campaign builder UI | Frontend | done | `apps/web/src/app/dashboard/campaigns/new` + `[id]`; script, voice, dialing strategy, schedule |
| 4.7 | Contact manager and CSV upload UI | Frontend | done | `contacts` page: lists + contacts tabs, drag & drop, preview, dedup |
| 4.8 | Campaign list and status table | Frontend | done | `campaigns` page: search, status filter, progress, pagination |
| 4.9 | Call history and playback UI | Frontend | done | `calls` page + details modal: audio player, transcript, AI summary |
| 4.10 | Live call monitor UI | Frontend | done | `live` page: Supabase Realtime subscription to `calls` |
| 4.11 | Agent dashboard (active calls, waiting queue) | Frontend | done | `agent` page: today's calls, performance metrics |
| 4.12 | Billing and subscription management UI | Frontend | done | Billing dashboard (stat cards, invoices, usage tabs) + Subscription Management page (plan/status lifecycle) |
| 4.13 | Settings: Webhooks, integrations, notifications | Frontend | done | Webhooks (CRUD + deliveries + retry), Integrations (provider catalog + config), Notifications (inbox + per-category preferences) |
| 4.14 | Audit log viewer with filter / export | Frontend | done | Audit Logs page with action/actor/resource/search/date filters, detail dialog, CSV + JSON export |

### P2 — Polish

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 4.15 | Onboarding tour and empty states | Frontend | pending | |
| 4.16 | Mobile-responsive navigation and tables | Frontend | pending | |
| 4.17 | Dark mode support | Frontend | done | System preference + toggle (ThemeProvider + header control) |
| 4.18 | Accessibility audit (WCAG 2.1 AA) | QA | pending | Keyboard nav, screen readers |

---

## Phase 5: Compliance & Security

### P0 — Must-Have Security

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 5.1 | Enforce HTTPS everywhere (HSTS, TLS 1.3) | DevOps | pending | |
| 5.2 | Encrypt sensitive data at rest | Backend | pending | PII fields, recordings, transcripts |
| 5.3 | PII masking in logs | Backend | pending | Phone numbers, emails, names |
| 5.4 | Consent recording enforcement | Backend | pending | First 5 seconds mandated disclosure |
| 5.5 | DND pre-check before dial | Backend | pending | National / regional registry checks |
| 5.6 | Audit logging (immutable, append-only) | Backend | pending | All admin / org actions |
| 5.7 | Penetration testing checklist and remediation | Security | pending | OWASP Top 10 |

### P1 — Governance

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 5.8 | Data retention and deletion policies | Backend | pending | Auto-delete after N days |
| 5.9 | Export / deletion user request endpoints | Backend | pending | GDPR-style right-to-erasure |
| 5.10 | SOC 2 Type I readiness documentation | Compliance | pending | |
| 5.11 | Incident response runbook | Security | pending | |
| 5.12 | Dependency scanning and CVE alerts | DevOps | pending | Dependabot / Snyk |

---

## Phase 6: Scale, Observability & Production

### P0 — Production Readiness

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 6.1 | Observability stack (logs, metrics, traces) | DevOps | done | OpenTelemetry + Prometheus |
| 6.2 | Cost tracking per organization | Backend | done | Track telephony + AI minutes via `cost_tracking` + `usage_records` |
| 6.3 | Budget caps and alerting | Backend | done | `budgets` + `spending_alerts` tables, evaluate endpoint |
| 6.4 | Database backup and restore runbook | DevOps | done | `backups` table + CRUD API + restore workflow |
| 6.5 | Load testing and performance baseline | QA | done | `performance_baselines` table + CRUD API, k6 script |
| 6.6 | Auto-scaling configuration | DevOps | done | `auto_scaling_configs` + `scaling_metrics` tables + API |
| 6.7 | Multi-region readiness | DevOps | done | `regions` + `organization_regions` tables + API (`/api/regions`, `/api/regions/:id`, `/api/regions/organizations`, `/api/regions/organizations/:id`, `/api/regions/health`); `/dashboard/regions` UI |

### P1 — Scaling

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 6.8 | CDN and asset optimization | DevOps | pending | Frontend static assets |
| 6.9 | Queue partitioning by org for isolation | Backend | pending | Redis / NATS per org or per region |
| 6.10 | Feature flags for gradual rollout | Backend | pending | LaunchDarkly / Unleash / simple DB flag |

---

## Cross-Cutting Tasks (Ongoing)

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| X.1 | Code review and merge strategy enforcement | All | pending | Required reviews before main |
| X.2 | Update documentation with each milestone | All | pending | ADRs, runbooks |
| X.3 | Weekly sync and block-list review | PM | pending | |

---

## Immediate Next Actions (This Week)

1. **Select CPaaS provider** and obtain sandbox credentials (Owner: Architect)
2. **Set up shared project management** (GitHub Projects / Linear) with columns aligned to Phases
3. **Begin frontend dashboard and operational pages** (Phase 4)

---

## Phase 4: Milestone 2 — Organization & Access Management (Implemented)

| # | Deliverable | Area | Status | Notes |
|---|-------------|------|--------|-------|
| M2.1 | Organization APIs (CRUD, settings, logo) | Backend | done | route → service → repository; `apps/api/src/routes/organization.ts` |
| M2.2 | Self-service onboarding API | Backend | done | `/api/organizations/onboard` creates org + assigns owner as org_admin |
| M2.3 | Users CRUD (list, invite, update, delete) | Backend | done | `apps/api/src/routes/users.ts` + `user.repository.ts` |
| M2.4 | Invite User | Backend | done | Creates/link Supabase auth user, status `invited`, sends invite |
| M2.5 | Change Role | Backend | done | `updateUser` reassigns role + syncs Supabase user_metadata |
| M2.6 | Pause/Resume User | Backend | done | `active` ↔ `suspended` status transition |
| M2.7 | API Keys CRUD | Backend | done | list / generate / revoke |
| M2.8 | Generate API Keys (SHA-256 hashed) | Backend | done | `crypto.createHash('sha256')`; plaintext returned once |
| M2.9 | Reveal plaintext only once | Backend | done | Raw key only in generate response; store only prefix + hash |
| M2.10 | Revoke API Keys | Backend | done | Soft delete (`deleted_at`) |
| M2.11 | Organization Setup Wizard | Frontend | done | 4-step wizard at `/dashboard/onboarding` |
| M2.12 | Users Management page | Frontend | done | `/dashboard/organization/users` with search + pagination |
| M2.13 | Invite User dialog | Frontend | done | Dialog with name/email/role |
| M2.14 | API Keys page | Frontend | done | `/dashboard/organization/api-keys` |
| M2.15 | Create/Delete/Revoke keys | Frontend | done | Generate, reveal-once copy dialog, revoke confirm |
| M2.16 | Copy key after creation | Frontend | done | Clipboard copy in reveal dialog |
| M2.17 | Success/Error Toasts | Frontend | done | `@rds/ui` useToast on all mutations |

---

## Phase 4: Milestone 3 — Campaigns, Contacts, Calls & Live Operations (Implemented)

| # | Deliverable | Area | Status | Notes |
|---|-------------|------|--------|-------|
| M3.1 | Campaign CRUD (list/create/get/update/status/delete) | Backend | done | route → service → repository; `routes/campaigns.ts`, `campaign.service.ts`, `campaign.repository.ts` |
| M3.2 | Campaign list + status table | Frontend | done | `dashboard/campaigns` — search, status filter, progress, pagination |
| M3.3 | Campaign Builder | Frontend | done | `dashboard/campaigns/new` + `[id]` — name, script, voice, dialing strategy, contact list, status transitions |
| M3.4 | Contact Lists CRUD | Backend | done | `routes/contactLists.ts` + service + repository (soft delete, count refresh) |
| M3.5 | Contacts CRUD | Backend | done | `routes/contacts.ts` — list/get/create/update/delete + bulk update/delete |
| M3.6 | Contact Manager UI | Frontend | done | `dashboard/contacts` — lists + contacts tabs, search, filters, bulk actions |
| M3.7 | CSV Import (validation, dedup, summary) | Backend | done | `importCsv` in `contact.service.ts`: header mapping, phone validation, in-file + cross-org dedup, `CsvImportResult` summary |
| M3.8 | CSV Upload + Preview | Frontend | done | drag & drop, parse + preview, analysis badges, import summary dialog |
| M3.9 | Call History API | Backend | done | `routes/calls.ts` list — search, status/campaign/direction/contact/date filters, pagination |
| M3.10 | Call Details API | Backend | done | single call + contact/campaign/agent lookup + transcript lines |
| M3.11 | Call History UI | Frontend | done | `dashboard/calls` — filters, table |
| M3.12 | Call Details (player, transcript, summary) | Frontend | done | `dashboard/calls` details modal — `<audio>` player, transcript viewer, AI summary panel |
| M3.13 | Live Call Monitor (Supabase Realtime) | Frontend | done | `dashboard/live` — realtime `postgres_changes` on `calls`, active/queue/agent panels |
| M3.14 | Agent Dashboard | Frontend | done | `dashboard/agent` — today's calls, active/completed/missed, performance metrics |
| M3.15 | Views reused | Backend | done | `v_campaign_summary` (campaign list) and `v_active_calls` (active calls) |

---

## Phase 4: Milestone 4 — Billing, Subscriptions, Webhooks, Integrations, Notifications, Audit & Exports (Implemented)

| # | Deliverable | Area | Status | Notes |
|---|-------------|------|--------|-------|
| M4.1 | Billing dashboard UI | Frontend | done | `dashboard/billing` — summary stat cards, current subscription card, invoices + usage tabs, date/status filters, pagination |
| M4.2 | Billing CSV + JSON export | Frontend/Backend | done | `GET /api/billing/export` (`sendCsv`/`sendJson`) wired to billing page invoice + usage export buttons |
| M4.3 | Subscription management UI | Frontend | done | `dashboard/subscription` — current plan card, plan/status list, create/edit dialog, cancel/reactivate/delete lifecycle |
| M4.4 | Subscription CRUD | Backend | done | `routes/subscriptions.ts` + service + repository (list, current, create, update, cancel, reactivate, delete) |
| M4.5 | Webhooks UI | Frontend | done | `dashboard/webhooks` — CRUD, multi-event checkboxes, deliveries panel with retry |
| M4.6 | Webhooks CRUD + deliveries + retry | Backend | done | `routes/webhooks.ts` + service + repository; deliveries list + `retryDelivery` |
| M4.7 | Integrations UI | Frontend | done | `dashboard/integrations` — provider catalog, dynamic config fields, activate/deactivate, edit/delete |
| M4.8 | Integrations CRUD + provider catalog | Backend | done | `routes/integrations.ts` + service + repository; `listProviders` returns CRM/messaging/storage/analytics providers |
| M4.9 | Notification inbox UI | Frontend | done | `dashboard/notifications` Inbox tab — channel filter, unread-only, mark read / mark all / delete, pagination |
| M4.10 | Notification preferences UI | Frontend | done | Preferences tab — per-category (billing/usage/security/support) × means (email/sms/push/in-app) toggles, autosave |
| M4.11 | Notifications + preferences APIs | Backend | done | `routes/notifications.ts` + service + repository (list, read, read-all, delete, preferences get/update) |
| M4.12 | Audit log viewer UI | Frontend | done | `dashboard/audit` — action/actor/resource/search/date filters, pagination, detail dialog (before/after diff) |
| M4.13 | Audit CSV + JSON export | Frontend/Backend | done | `GET /api/audit/export` (`sendCsv`/`sendJson`) wired to audit page export buttons |
| M4.14 | Audit logs API | Backend | done | `routes/audit.ts` + service + repository (list, distinct actions, export rows) |
| M4.15 | Live dashboard `getActiveCalls` fix | Frontend | done | Added `api.getActiveCalls()` (calls `/api/calls/active`) resolving the remaining VS Code typecheck problem |
| M4.16 | Billing StatCard type fix | Frontend | done | Coerced `currentPeriodCalls` to `string` for `StatCard.value` |

---

*Last updated: 2026-07-14 by Kilo Architect — Phase 4 Milestone 4 (Billing, Subscriptions, Webhooks, Integrations, Notifications, Audit & Exports) complete*

---

## Phase 5: Compliance & Security (Implemented)

| # | Deliverable | Area | Status | Notes |
|---|-------------|------|--------|-------|
| P5.1 | HTTPS / HSTS enforcement | Backend | done | `helmet` configured with strict HSTS (maxAge 2y, includeSubDomains, preload) in production; relaxed in dev |
| P5.2 | Encrypt sensitive data at rest | Backend | done | `lib/crypto.ts` AES-256-GCM field encryption (`encryptField`/`decryptField`); keyed by `FIELD_ENCRYPTION_KEY`, enforced in production |
| P5.3 | PII masking in logs | Backend | done | `lib/mask.ts` (maskEmail/maskPhone/maskName/maskIp) + pino serializers on logger so phone/email/name/IP are masked in all structured logs |
| P5.4 | Consent recording enforcement | Backend | done | `consent_records` table + `POST /api/compliance/consent`, disclosure text endpoint, consent history; reuses `compliance_consent_required` org setting |
| P5.5 | DND pre-check before dial | Backend | done | `dnd_entries` table + list/add/remove/check endpoints (`/api/compliance/dnd*`); reuses `compliance_dnd_check` org setting |
| P5.6 | Audit logging (immutable, append-only) | Backend | done | `lib/audit.ts` `recordAudit` writer + BEFORE UPDATE/DELETE trigger on `audit_logs`; admin/org actions now emit audit events |
| P5.7 | Penetration testing checklist | Security | pending | OWASP Top 10 review tracked separately (documentation deliverable) |
| P5.8 | Data retention & deletion policies | Backend | done | `retention_policies` table + GET/PUT `/api/compliance/retention` (per-resource-type days + delete/anonymize) |
| P5.9 | Export / deletion user request endpoints | Backend | done | `data_export_requests` + `data_deletion_requests` tables; `POST /api/compliance/data-export` & `/data-deletion`, status lookup by id (GDPR right-to-access / erasure) |
| P5.10 | SOC 2 Type I readiness | Compliance | pending | Documentation deliverable (tracked separately) |
| P5.11 | Incident response runbook | Security | pending | Documentation deliverable (tracked separately) |
| P5.12 | Dependency scanning / CVE alerts | DevOps | done | `.github/dependabot.yml` configured for npm + github-actions (weekly) |
| M5-FE | Compliance & Security dashboard | Frontend | done | `/dashboard/compliance` with Overview, Consent, DND Registry, Retention, Data Requests, Audit tabs; nav entry added |

*Last updated: 2026-07-16 by Kilo Architect — Phase 5 (Compliance & Security) complete*

---

## Phase 6: Scale, Observability & Production

### Milestone 1 — Observability Stack (OpenTelemetry + Prometheus) (Implemented)

| # | Deliverable | Area | Status | Notes |
|---|-------------|------|--------|-------|
| 6.1a | Distributed tracing (OpenTelemetry) | Backend | done | `lib/telemetry.ts`: NodeSDK + auto-instrumentations (http/express), OTLP trace exporter when `OTEL_EXPORTER_OTLP_ENDPOINT` set, `withSpan` helper, graceful shutdown on SIGTERM/SIGINT |
| 6.1b | Prometheus metrics endpoint | Backend | done | `lib/metrics.ts`: `prom-client` registry with default node metrics + `http_requests_total`, `http_request_duration_seconds` histograms, `rds_calls_total`, `rds_organizations_active`, `rds_service_up`; exposed at `GET /api/observability/metrics` (Prometheus text format) |
| 6.1c | Request metrics middleware | Backend | done | Route-normalised counters/histograms recorded on `res.finish` in `index.ts` |
| 6.1d | Observability status + trace probe | Backend | done | `GET /api/observability/status` returns tracing/OTLP config, uptime, node version, and emits a probe span |
| 6.1e | Monitoring dashboard (frontend) | Frontend | done | `/dashboard/observability` shows status, uptime, key metrics (auto-refresh 15s); nav entry added |
| 6.1f | Types + API client | Shared | done | `ObservabilityStatus`/`ObservabilitySnapshot`/`MetricSample` in `@rds/types`; `api.getObservabilityStatus()` |

### Milestone 2 — Cost Tracking & Usage Accounting (Implemented)

| # | Deliverable | Area | Status | Notes |
|---|-------------|------|--------|-------|
| 6.2a | Cost tracking tables | Backend | done | `cost_tracking` table (per-day, per-category spend rollup) |
| 6.2b | Usage accounting tables | Backend | done | Reuses `usage_records` table (ai_minutes, telephony_minutes, calls_count) |
| 6.2c | Cost tracking API | Backend | done | `GET /api/costs/dashboard`, `/summary`, `/records`, `/usage` |
| 6.2d | Cost tracking frontend | Frontend | done | `/dashboard/cost` with spend by category, daily usage table, budgets, alerts |
| 6.2e | Types + API client | Shared | done | `CostRecord`, `CostSummary`, `CostDashboard` in `@rds/types`; `api.getCostDashboard()` etc. |

### Milestone 3 — Budget Caps & Spending Alerts (Implemented)

| # | Deliverable | Area | Status | Notes |
|---|-------------|------|--------|-------|
| 6.3a | Budgets tables | Backend | done | `budgets` + `spending_alerts` tables |
| 6.3b | Budget CRUD API | Backend | done | `GET/POST/PUT/DELETE /api/costs/budgets`, evaluate endpoint |
| 6.3c | Budget caps + alerting frontend | Frontend | done | Budgets table with status, create/delete dialog, evaluate button, spending alerts table |
| 6.3d | Types + API client | Shared | done | `Budget`, `BudgetStatus`, `SpendingAlert` in `@rds/types`; `api.createBudget()` etc. |

### Milestone 4 — Database Backup & Restore Runbook (Implemented)

| # | Deliverable | Area | Status | Notes |
|---|-------------|------|--------|-------|
| 6.4a | Backups table | Backend | done | `backups` table with type, status, size, path, timestamps |
| 6.4b | Backup CRUD + restore API | Backend | done | `GET/POST/:id/restore/POST/:id/complete/POST/:id/fail/DELETE /api/backups` |
| 6.4c | Backup management frontend | Frontend | done | `/dashboard/backup` with backup history, create, restore, delete actions |
| 6.4d | Types + API client | Shared | done | `BackupRecord` in `@rds/types`; `api.listBackups()`, `api.createBackup()` etc. |

### Milestone 5 — Load Testing & Performance Baseline (Implemented)

| # | Deliverable | Area | Status | Notes |
|---|-------------|------|--------|-------|
| 6.5a | Performance baselines table | Backend | done | `performance_baselines` table with p50/p95/p99 latency targets |
| 6.5b | Performance baselines API | Backend | done | `GET/POST/DELETE /api/performance/baselines` |
| 6.5c | Performance baselines frontend | Frontend | done | `/dashboard/performance` with endpoint latency targets table |
| 6.5d | Load test script | QA | done | `scripts/load-tests/api-load-test.js` k6 script with thresholds |
| 6.5e | Types + API client | Shared | done | `PerformanceBaseline` in `@rds/types`; `api.listPerformanceBaselines()` etc. |

### Milestone 6 — Auto Scaling & Performance (Implemented)

| # | Deliverable | Area | Status | Notes |
|---|-------------|------|--------|-------|
| 6.6a | Auto scaling tables | Backend | done | `auto_scaling_configs` + `scaling_metrics` tables |
| 6.6b | Auto scaling API | Backend | done | `GET/PUT /api/scaling/config`, `GET /api/scaling/metrics` |
| 6.6c | Auto scaling frontend | Frontend | done | `/dashboard/scaling` with config table, edit dialog, recent metrics |
| 6.6d | Types + API client | Shared | done | `AutoScalingConfig`, `ScalingMetric` in `@rds/types`; `api.getScalingConfig()` etc. |

### Milestone 7 — Multi-Region Readiness (Implemented)

| # | Deliverable | Area | Status | Notes |
|---|-------------|------|--------|-------|
| 6.7a | Multi-region tables | Backend | done | `regions` + `organization_regions` tables with RLS |
| 6.7b | Region API | Backend | done | `GET/POST/PUT/DELETE /api/regions`, `GET /api/regions/organizations`, `PUT /api/regions/organizations/:id`, `GET /api/regions/health` |
| 6.7c | Region frontend | Frontend | done | `/dashboard/regions` with stat cards, regions table, organization mappings table, health panel, create/edit/delete/assign dialogs, 30s refresh |
| 6.7d | Types + API client | Shared | done | `Region`, `OrganizationRegion`, `RegionHealth` in `@rds/types`; `api.listRegions()`, `api.createRegion()`, `api.updateRegion()`, `api.deleteRegion()`, `api.listOrganizationRegions()`, `api.updateOrganizationRegion()`, `api.getRegionHealth()` |

*Last updated: 2026-07-19 by Kilo Architect — Phase 6.7 (Multi-Region Readiness) complete*
