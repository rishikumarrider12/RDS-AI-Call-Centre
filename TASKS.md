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
| 1.5 | Provision PostgreSQL and create base schema v0.1 | Backend | pending | users, orgs, roles, refresh_tokens, audit_logs |
| 1.6 | Implement authentication module (password + OAuth) | Backend | pending | JWT + refresh tokens |
| 1.7 | Implement authorization (RBAC: super_admin, org_admin, agent, viewer) | Backend | pending | Middleware + guards |
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
| 1.15 | Organization onboarding wizard API | Backend | pending | Org creation, plan selection |
| 1.16 | Initial test suite scaffold (backend unit + integration) | QA | pending | Vitest / Jest |
| 1.17 | Database migration tooling and seed scripts | Backend | pending | Prisma / Drizzle / Knex |
| 1.18 | Email service (password reset, invitations) | Backend | pending | Resend / Postmark / Nodemailer |

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
| 4.1 | Design system and component library | Frontend | pending | Tailwind / shadcn or similar |
| 4.2 | Login, forgot password, and 2FA pages | Frontend | pending | |
| 4.3 | Organization onboarding wizard | Frontend | pending | Name, subdomain, plan |
| 4.4 | Admin dashboard shell (nav, sidebar, layout) | Frontend | pending | |
| 4.5 | Org settings pages (general, users, API keys) | Frontend | pending | |

### P1 — Operational Pages

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 4.6 | Campaign builder UI | Frontend | pending | Script, flow, voice selection, schedule |
| 4.7 | Contact manager and CSV upload UI | Frontend | pending | Drag & drop, preview, dedup |
| 4.8 | Campaign list and status table | Frontend | pending | Filter by status, date |
| 4.9 | Call history and playback UI | Frontend | pending | Audio player, transcript, summary |
| 4.10 | Live call monitor UI | Frontend | pending | Real-time transcript, controls |
| 4.11 | Agent dashboard (active calls, waiting queue) | Frontend | pending | |
| 4.12 | Billing and subscription management UI | Frontend | pending | Plans, invoices, payment method |
| 4.13 | Settings: Webhooks, integrations, notifications | Frontend | pending | CRUD webhooks, retry config |
| 4.14 | Audit log viewer with filter / export | Frontend | pending | CSV / JSON export |

### P2 — Polish

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 4.15 | Onboarding tour and empty states | Frontend | pending | |
| 4.16 | Mobile-responsive navigation and tables | Frontend | pending | |
| 4.17 | Dark mode support | Frontend | pending | System preference + toggle |
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
| 6.1 | Observability stack (logs, metrics, traces) | DevOps | pending | OpenTelemetry |
| 6.2 | Cost tracking per organization | Backend | pending | Track telephony + AI minutes |
| 6.3 | Budget caps and alerting | Backend | pending | Email / Slack / SMS |
| 6.4 | Database backup and restore runbook | DevOps | pending | Automated daily backups |
| 6.5 | Load testing and performance baseline | QA | pending | k6 / Artillery |
| 6.6 | Auto-scaling configuration | DevOps | pending | HPA / target tracking |

### P1 — Scaling

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 6.7 | Multi-region readiness plan | DevOps | pending | Data residency and latency |
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

1. **Select and lock tech stack** with Architect and CTO (Owner: N. Rishi Kumar)
2. **Bootstrap repository** with agreed tooling (Owner: Backend Lead)
3. **Design and approve ERD** for users, orgs, campaigns, calls (Owner: Backend Lead + Architect)
4. **Select CPaaS provider** and obtain sandbox credentials (Owner: Architect)
5. **Set up shared project management** (GitHub Projects / Linear) with columns aligned to Phases

---

*Last updated: 2026-07-02 by Kilo Architect*
