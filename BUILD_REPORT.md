# RDS AI Call Centre — Build Report

**Date:** 2026-07-03  
**Phase:** 1 — Foundation (Complete)  
**Built by:** Kilo Architect

---

## Folder Structure

```
rdscallcenter/
├── .env.example
├── .github/workflows/ci.yml
├── .gitignore
├── .prettierignore
├── .prettierrc
├── apps/
│   ├── api/
│   │   ├── eslint.config.mjs
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── lib/
│   │   │   │   ├── env.ts
│   │   │   │   ├── logger.ts
│   │   │   │   └── supabase.ts
│   │   │   ├── middleware/
│   │   │   │   └── error.ts
│   │   │   └── routes/
│   │   │       └── health.ts
│   │   └── ...
│   └── web/
│       ├── components.json
│       ├── eslint.config.mjs
│       ├── next.config.ts
│       ├── package.json
│       ├── postcss.config.js
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       ├── public/
│       ├── src/
│       │   ├── app/
│       │   │   ├── globals.css
│       │   │   ├── layout.tsx
│       │   │   └── page.tsx
│       │   ├── components/
│       │   │   └── providers.tsx
│       │   ├── hooks/
│       │   ├── lib/
│       │   │   └── utils.ts
│       │   └── ...
│       └── ...
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── package.json
├── docker/
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── Dockerfile.api
│   ├── docker-compose.yml
│   └── nginx.conf
├── docs/
├── packages/
│   ├── config/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       └── eslint/index.ts
│   ├── types/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       └── zod.ts
│   ├── ui/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── button.tsx
│   │       ├── index.ts
│   │       └── utils.ts
│   └── utils/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── cn.ts
│           └── index.ts
├── scripts/
│   ├── setup.ps1
│   └── setup.sh
├── DEVELOPMENT_ROADMAP.md
├── package.json
├── PROJECT_STATUS.md
├── README.md
├── TASKS.md
└── tsconfig.base.json
```

---

## Installed Dependencies

### Root (`rds-ai-call-centre`)
- concurrently
- rimraf
- typescript

### Frontend (`apps/web`)
- next@15.3.2
- react@19.0.0
- react-dom@19.0.0
- @tanstack/react-query@5.79.0
- react-hook-form@7.57.0
- @hookform/resolvers@5.0.1
- zod@3.24.3
- framer-motion@12.9.0
- class-variance-authority@0.7.1
- clsx@2.1.0
- tailwind-merge@2.5.0
- lucide-react@0.511.0
- tailwindcss@4.1.4
- @tailwindcss/postcss@4.1.4
- postcss@8.5.3
- eslint@9.22.0
- eslint-config-next@15.3.2
- @types/react@19.1.2
- @types/react-dom@19.1.2
- @types/node@22.14.0

### Backend (`apps/api`)
- express@4.21.0
- cors@2.8.5
- dotenv@16.4.0
- @supabase/supabase-js@2.45.0
- helmet@7.0.0
- express-rate-limit@7.4.0
- zod@3.24.3
- pino@9.0.0
- pino-pretty@13.0.0
- tsx@4.7.0
- @types/express@4.17.0
- @types/cors@2.8.0
- @types/node@22.14.0
- typescript@5.7.2
- eslint@9.22.0
- @eslint/js@9.22.0
- @typescript-eslint/parser@8.19.0
- globals@15.0.0

### Shared Packages
- `@rds/ui`: React peer dependencies only
- `@rds/types`: typescript, zod
- `@rds/utils`: typescript
- `@rds/config`: typescript, eslint

**Total installed:** 551+ packages (hoisted via npm workspaces)

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Run both frontend and backend concurrently |
| `npm run dev:web` | Run Next.js frontend only |
| `npm run dev:api` | Run Express API only (tsx watch) |
| `npm run build` | Build all workspaces |
| `npm run build:web` | Build frontend (`next build`) |
| `npm run build:api` | Build API (`tsc`) |
| `npm run lint` | Lint all workspaces |
| `npm run typecheck` | Typecheck all workspaces (`tsc --noEmit`) |
| `npm run clean` | Remove build artifacts and node_modules |
| `docker compose -f docker/docker-compose.yml up -d` | Start local infra (Postgres, Redis, MinIO) |

---

## Build Status

| Workspace | Command | Status |
|-----------|---------|--------|
| `apps/web` | `npm run build --workspace=apps/web` | ✅ PASS |
| `apps/api` | `npm run build --workspace=apps/api` | ✅ PASS |
| `@rds/ui` | `npm run build --workspace=@rds/ui` | ✅ PASS |
| `@rds/types` | `npm run build --workspace=@rds/types` | ✅ PASS |
| `@rds/utils` | `npm run build --workspace=@rds/utils` | ✅ PASS |
| `@rds/config` | `npm run build --workspace=@rds/config` | ✅ PASS |
| **Lint** | `npm run lint --workspaces --if-present` | ✅ PASS |
| **Typecheck** | `npm run typecheck --workspaces --if-present` | ✅ PASS |

### Web Build Output (Next.js)
- Compiled successfully in ~10–15s
- 4 static pages generated (`/`, `/_not-found`, etc.)
- First Load JS: 101 kB shared
- Build output: `.next/` directory

### API Build Output (TypeScript)
- Emitted to `apps/api/dist/`
- No TypeScript errors

---

## Known Issues

1. **Next.js ESLint plugin not detected** — The web workspace lints successfully (`✔ No ESLint warnings or errors`) but Next.js emits a warning: `The Next.js plugin was not detected in your ESLint configuration.` This is non-blocking. To resolve, install `@next/eslint-plugin-next` and add `nextjs` configs to `apps/web/eslint.config.mjs`.

2. **Node.js module type parsing overhead** — ESLint flat config files (`eslint.config.mjs`) trigger a minor Node.js performance warning when parsed from `.js` extension. Resolved by renaming to `.mjs`.

3. **No package-lock.json in version control** — `package-lock.json` exists and is tracked. Ensure it is committed before deployment so CI can use `npm ci`.

4. **Postgres/Supabase not provisioned** — The API compiles and health check runs, but `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env.example` are placeholders. Replace with real credentials before running the API against a real database.

5. **Windows line endings / shell quirks** — Development commands are tested via PowerShell/cmd. `.env.local` must be created manually from `.env.example`.

---

## Next Recommended Step

**Lock the database schema (PostgreSQL).**

Before writing application features, define and review the ERD for:
- `users` (auth, profiles)
- `organizations` (multi-tenancy)
- `roles` / `memberships`
- `campaigns`
- `contacts`
- `calls`
- `recordings`
- `audit_logs`

This de-risks the largest architectural decision blockers for Phase 2 (AI Calling Core) and Phase 3 (LLM Engine).

---

*Report generated: 2026-07-03*
