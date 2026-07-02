# RDS AI Call Centre — Development Roadmap

**Version:** 1.0.0  
**Goal:** Production-ready, AI-powered call center SaaS for RDS

---

## Phase 1: Foundation & Core Backend (Week 1–4)

### Objectives
- Bootstrap the project in a clean, maintainable structure.
- Establish auth, tenancy, and database foundation.
- Deploy "hello-world" API to staging.

### Key Deliverables
1. Monorepo scaffold (backend, frontend, shared packages)
2. PostgreSQL schema v0.1 (users, orgs, roles)
3. Authentication & authorization module
4. Docker compose for local development
5. CI/CD pipeline skeleton
6. Staging environment deployed

### Exit Criteria
- `git push` triggers auto-deploy to staging
- Health check endpoint responds on staging
- Admin can create org and users via API or seed script

---

## Phase 2: AI Calling Core (Week 5–8)

### Objectives
- Integrate telephony provider (SIP or CPaaS such as Exotel, Twilio, Plivo).
- Build the call state machine.
- Implement basic outbound dialer with one TTS + one STT provider.

### Key Deliverables
1. SIP / CPaaS provider abstraction layer
2. Outbound dialer engine (campaign runner)
3. Inbound call webhook handler
4. TTS provider integration (primary)
5. STT provider integration (primary)
6. Call state machine and event bus
7. Recording ingestion pipeline

### Exit Criteria
- An org can upload contacts, create a campaign, and launch outbound calls
- Calls are recorded and transcribed automatically
- Call events are emitted to the frontend via WebSockets in real-time

---

## Phase 3: LLM Conversation Engine (Week 9–12)

### Objectives
- Add conversational AI between system and called party.
- Build intent classification, fallback, and transfer-to-human flow.

### Key Deliverables
1. LLM provider abstraction (OpenAI / Anthropic / Local)
2. Conversation state manager per call
3. Prompt template engine
4. Flow builder UI (nodes: greet → ask → qualify → transfer)
5. Fallback and escalation rules
6. Call summary generator

### Exit Criteria
- AI conducts a scripted, dynamic conversation
- Summaries appear in the dashboard within 60 seconds of call end
- Agents can intervene in live calls (barge-in / takeover)

---

## Phase 4: Frontend Application (Week 13–16)

### Objectives
- Ship the full React / Next.js frontend for all user personas.

### Key Deliverables
1. Auth & onboarding flows
2. Org admin dashboard
3. Agent dashboard (live calls, history)
4. Campaign builder UI
5. Contact upload & management
6. Live call monitor
7. Billing & subscription pages
8. Settings, API keys, and webhooks UI

### Exit Criteria
- Non-technical user can sign up, upgrade plan, create a campaign, and monitor live calls without touching the CLI
- Authentication supports email/password and OAuth (Google)

---

## Phase 5: Compliance & Security Hardening (Week 17–18)

### Objectives
- Bring the platform into compliance for target markets.

### Key Deliverables
1. Consent recording enforcement
2. DND list checks pre-dial
3. PII masking in logs and transcripts
4. Encryption at rest (database + storage)
5. Audit log query interface
6. Security review and pen-test remediation

### Exit Criteria
- SOC 2 Type I readiness checklist completed
- Legal review of call scripts and disclosures finished

---

## Phase 6: Scale, Observability & Production Hardening (Week 19–20)

### Objectives
- Ready the platform for production traffic and growth.

### Key Deliverables
1. Comprehensive observability (logs, metrics, traces)
2. Cost alerts and budget caps
3. Auto-scaling config
4. Load testing report
5. Disaster recovery runbook
6. Production launch checklist

### Exit Criteria
- System handles 1,000 concurrent outbound calls without degradation
- Per-org resource and cost limits enforced
- PagerDuty / alert integration active

---

## Release Strategy

| Release | Scope | Target Date |
|---------|-------|-------------|
| Alpha | Phase 1 + 2 core calling | Week 4 |
| Beta | Phase 3 + 4 frontend | Week 16 |
| RC | Phase 5 compliance | Week 18 |
| v1.0.0 | Phase 6 harden + launch | Week 20 |

---

## Guiding Principles

1. **Keep it buildable** — never break `docker compose up` or the test suite.
2. **Contracts over implementations** — define provider interfaces early; swap providers without rewrites.
3. **Queue everything** — calling is asynchronous; rely on durable queues, not synchronous calls.
4. **Obsess over cost visibility** — every AI and telephony minute must be tracked to an org.
5. **Ship secure** — auth, tenancy, and audit logs come before flashy features.

---

*Last updated: 2026-07-02 by Kilo Architect*
