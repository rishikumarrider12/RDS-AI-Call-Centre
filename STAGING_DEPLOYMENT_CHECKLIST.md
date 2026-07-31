# STAGING DEPLOYMENT CHECKLIST

**Repository:** rishikumarrider12/RDS-AI-Call-Centre  
**Phase:** 9.5 Twilio Integration Complete  
**Commit:** 2637643  
**Tag:** phase9.5-twilio-integration-complete  
**Date:** 2026-07-31  

---

## A. Server Requirements

| Requirement | Minimum | Recommended | Notes |
|-------------|---------|-------------|-------|
| CPU | 2 cores | 4 cores | For Docker containers |
| RAM | 4 GB | 8 GB | API + Web + Redis + Postgres |
| Disk | 20 GB | 50 GB SSD | For images, volumes, and logs |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS | Or any Linux with Docker support |
| Docker | 24+ | Latest stable | Required |
| Docker Compose | 2.20+ | Latest | Required |
| Git | 2.40+ | Latest | For deployment pulls |
| Node.js | 20+ | 24 LTS | Only needed for manual builds |

---

## B. Docker/Docker Compose Requirements

### Prerequisites
```bash
# Verify Docker installation
docker --version
docker compose version
```

### Image Architecture
- **API image:** Built from `docker/Dockerfile.api` (multi-stage: deps → builder → runner)
- **Web image:** Built from `docker/Dockerfile` (multi-stage: deps → builder → runner)
- **Nginx:** `nginx:1.27-alpine` (pulled from Docker Hub)
- **Redis:** `redis:7-alpine` (pulled from Docker Hub)
- **Postgres:** `postgres:16-alpine` (pulled from Docker Hub)

###Important Notes
- The Web Dockerfile runs `npm run build` which builds ALL workspaces (api, web, packages). This is correct.
- The API Dockerfile runs `npm run build:api` at root level, which delegates to `npm run build --workspace=apps/api`.
- Both Dockerfiles use non-root users (`expressjs` for API, `nextjs` for Web).

---

## C. Required Environment Variables

### MUST be set in `docker/.env` (created from `docker/.env.production.example`)

| Variable | Type | Required | Secret | Description |
|----------|------|----------|--------|-------------|
| `NODE_ENV` | PUBLIC | Yes | No | Must be `production` for staging |
| `APP_URL` | PUBLIC | Yes | No | Canonical API URL (e.g., `https://api.staging.example.com`) |
| `CORS_ORIGIN` | PUBLIC | Yes | No | Comma-separated allowed web origins (e.g., `https://staging.example.com`) |
| `NEXT_PUBLIC_API_URL` | PUBLIC | Yes | No | Public API URL for browser clients |
| `SUPABASE_URL` | PUBLIC | Yes | No | Supabase project URL |
| `SUPABASE_ANON_KEY` | PUBLIC | Yes | **YES** | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | SECRET | Yes | **YES** | Supabase service role key (server-side only) |
| `NEXT_PUBLIC_SUPABASE_URL` | PUBLIC | Yes | No | Public Supabase URL (browser-exposed) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | PUBLIC | Yes | **YES** | Public Supabase anon key (browser-exposed) |
| `COOKIE_SECURE` | PUBLIC | Yes | No | Must be `true` in staging |
| `COOKIE_SAMESITE` | PUBLIC | Yes | No | `lax` or `strict` |
| `REDIS_URL` | PUBLIC | Yes | No | Redis connection URL (use `redis://redis:6379` for Docker) |
| `LOG_LEVEL` | PUBLIC | No | No | Default: `warn` for staging |
| `JWT_SECRET` | SECRET | Yes (prod) | **YES** | Minimum 32 characters. Generate with `openssl rand -hex 32` |
| `TWILIO_ACCOUNT_SID` | PUBLIC | Yes* | No | Twilio Account SID (required for call execution) |
| `TWILIO_AUTH_TOKEN` | SECRET | Yes* | **YES** | Twilio Auth Token (server-side only) |
| `TWILIO_FROM_NUMBER` | PUBLIC | Yes* | No | Twilio outgoing phone number (E.164 format) |
| `POSTGRES_USER` | PUBLIC | If self-hosted | No | Database user |
| `POSTGRES_PASSWORD` | SECRET | If self-hosted | **YES** | Database password |
| `POSTGRES_DB` | PUBLIC | If self-hosted | No | Database name |
| `TRUST_PROXY` | PUBLIC | If behind proxy | No | Set `true` if behind nginx/load balancer |
| `OTEL_SERVICE_NAME` | PUBLIC | No | No | Default: `rds-api` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | PUBLIC | No | No | OpenTelemetry endpoint (optional) |

*Required only if staging requires call execution functionality.

### Variable Classification Key
- **PUBLIC:** Safe to expose to browser or logs (non-sensitive configuration)
- **SECRET:** Must never be logged, exposed to frontend, or committed to version control

---

## D. Supabase Configuration

### Required Setup
1. Create a Supabase project at https://supabase.com
2. Note the project URL (e.g., `https://xyz.supabase.co`)
3. Retrieve the following from Supabase Dashboard → Settings → API:
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_ANON_KEY` (anon/public key)
   - `SUPABASE_SERVICE_ROLE_KEY` (service_role key)

### Database Migrations
- The application expects the Supabase database to have all migrations applied.
- If using Supabase managed Postgres, apply migrations via Supabase SQL Editor or `psql`:
  ```bash
  # Example: Apply all migrations
  for f in database/migrations/*.sql; do
    cat "$f" | supabase db execute --project-ref YOUR_PROJECT_REF
  done
  ```

### Row Level Security (RLS)
- The codebase assumes Supabase RLS is configured.
- Ensure `users` table has `organization_id` populated for authenticated users.

---

## E. Twilio Configuration

### Required Setup
1. Create a Twilio account at https://www.twilio.com
2. Obtain:
   - Account SID (`TWILIO_ACCOUNT_SID`)
   - Auth Token (`TWILIO_AUTH_TOKEN`)
   - A phone number (`TWILIO_FROM_NUMBER`) in E.164 format (e.g., `+15551234567`)

### Security Notes
- `TWILIO_AUTH_TOKEN` is a **SECRET** — never log it, never expose it to the frontend.
- The `TwilioProvider` reads credentials from environment variables only.
- If Twilio credentials are missing, the API starts safely and logs a warning. Call execution features will return "No active telephony provider available" errors.

---

## F. Redis/Postgres Requirements

### Redis
- Version: 7+
- Configuration: The Docker Compose file starts Redis with:
  - `--maxmemory 256mb`
  - `--maxmemory-policy allkeys-lru`
  - RDB persistence: `--save 60 1`
- Connection: `redis://redis:6379` (internal Docker network)

### PostgreSQL
- Version: 16+
- If using Supabase (recommended): No self-hosted Postgres needed.
- If self-hosted:
  - Set `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` in `docker/.env`
  - Ensure `database/migrations/` is mounted to `/docker-entrypoint-initdb.d/migrations`
  - Credentials must match the application's `SUPABASE_URL` connection string

---

## G. Domain and DNS Requirements

### Required DNS Records
| Record | Type | Value | Purpose |
|--------|------|-------|---------|
| `api.staging.example.com` | A | `<server-ip>` | API endpoint |
| `staging.example.com` | A | `<server-ip>` | Web frontend |
| `www.staging.example.com` | CNAME | `staging.example.com` | Optional www redirect |

### Port Requirements
- **80/tcp** — HTTP (nginx)
- **443/tcp** — HTTPS (nginx)
- **Docker ports** — 3000 (web), 4000 (api) — internal only; nginx proxies these

### Important
- Update `CORS_ORIGIN` in `docker/.env` to match the staging web origin.
- Update `NEXT_PUBLIC_API_URL` to point to the staging API URL.
- Update `APP_URL` to the staging API canonical URL.

---

## H. HTTPS/TLS Requirements

### Current State
The `docker/nginx.conf` **includes** HTTPS/TLS configuration. The HTTP server block on port 80 redirects all traffic to HTTPS.

### Certificate Configuration
- Container-internal certificate path: `/etc/nginx/ssl/server.crt`
- Container-internal private key path: `/etc/nginx/ssl/server.key`
- Mounted from host via `docker-compose.production.yml` using:
  - `SSL_CERT_PATH` environment variable (default: `../nginx/ssl/server.crt`)
  - `SSL_KEY_PATH` environment variable (default: `../nginx/ssl/server.key`)
- The `nginx/ssl/` directory on the host must contain valid certificate and key files

### Required Action
1. Obtain TLS certificates (see Option A below)
2. Place certificate files at host paths matching `SSL_CERT_PATH` and `SSL_KEY_PATH`
3. Set `COOKIE_SECURE=true` in `docker/.env`
4. Ensure `NODE_ENV=production` so Helmet enables HSTS

#### Option 1: Let's Encrypt (Recommended)
```bash
sudo apt update && sudo apt install certbot
sudo certbot certonly --standalone -d staging.example.com -d api.staging.example.com
sudo cp /etc/letsencrypt/live/staging.example.com/fullchain.pem nginx/ssl/server.crt
sudo cp /etc/letsencrypt/live/staging.example.com/privkey.pem nginx/ssl/server.key
sudo chmod 600 nginx/ssl/server.key
sudo chmod 644 nginx/ssl/server.crt
```

#### Option 2: TLS termination at load balancer
If using AWS ALB, GCP LB, or similar, terminate TLS at the load balancer and forward HTTP to nginx port 80. No certificate files needed on the Docker host.

### Critical Notes
- `COOKIE_SECURE=true` must be set in `docker/.env` for HTTPS.
- If TLS is not configured, authentication cookies will not work correctly in browsers.
- The API's Helmet HSTS header is only enabled when `NODE_ENV=production`.
- Never commit certificate files or private keys to version control.

---

## I. CORS Configuration

### Current Default
```
CORS_ORIGIN=https://app.example.com
```
This is a **placeholder** and must be updated for staging.

### Required Value
```
CORS_ORIGIN=https://staging.example.com
```
For multiple origins, use comma-separated values:
```
CORS_ORIGIN=https://staging.example.com,https://www.staging.example.com
```

### Frontend Configuration
- `NEXT_PUBLIC_API_URL` must be set to the staging API URL:
  ```
  NEXT_PUBLIC_API_URL=https://api.staging.example.com
  ```
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must match Supabase project values.

---

## J. Database Migration Procedure

### If Using Supabase (Recommended)
1. Connect to Supabase Dashboard → SQL Editor
2. Apply migrations in order:
   ```bash
   # Execute each .sql file in database/migrations/ in numerical order
   # Example:
   ls -1 database/migrations/*.sql | sort
   ```
3. Verify with:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
   ```

### If Using Self-Hosted Postgres (Docker Compose)
1. Ensure `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` are set in `docker/.env`
2. Start Postgres container:
   ```bash
   docker compose -f docker/docker-compose.production.yml up -d postgres
   ```
3. Apply migrations:
   ```bash
   docker exec -i rds-postgres psql -U $POSTGRES_USER -d $POSTGRES_DB < database/migrations/001_initial_schema.sql
   # Repeat for each migration file in order
   ```
4. Or mount migrations and restart:
   ```yaml
   # Already configured in docker-compose.production.yml:
   volumes:
     - ../../database/migrations:/docker-entrypoint-initdb.d/migrations:ro
   ```

### Verification
```bash
# Check database connectivity
curl https://api.staging.example.com/health
# Should return {"status":"healthy","checks":{"database":{"status":"healthy"},...}}
```

---

## K. API Deployment Procedure

### Step 1: Clone Repository
```bash
git clone https://github.com/rishikumarrider12/RDS-AI-Call-Centre.git
cd RDS-AI-Call-Centre
git checkout phase9.5-twilio-integration-complete
```

### Step 2: Create Environment File
```bash
cp docker/.env.production.example docker/.env
# Edit docker/.env with staging values (see Section C)
```

### Step 3: Build and Start API
```bash
# Using Docker Compose (Recommended)
docker compose -f docker/docker-compose.production.yml up -d --build api

# Or manual build
npm run build:api
NODE_ENV=production node dist/index.js
```

### Step 4: Verify API
```bash
# Health check
curl http://localhost:4000/health

# Expected response:
# {"status":"healthy","timestamp":"...","checks":{"database":{...},"redis":{...}}}
```

### Important
- The API build requires Node.js 20+.
- The API listens on port 4000 (internal).
- In Docker, the API is accessible only via nginx proxy (port 80/443).
- Twilio provider registers automatically if `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER` are set.

---

## L. Web Deployment Procedure

### Step 1: Build Web App
```bash
# Using Docker Compose (Recommended)
docker compose -f docker/docker-compose.production.yml up -d --build web

# Or manual build
npm run build:web
NODE_ENV=production npm run start --workspace=apps/web
```

### Step 2: Verify Web
```bash
# Health check (via nginx)
curl http://localhost/

# Expected: HTML response from Next.js
```

### Important
- The Web Dockerfile uses `next build` with `output: 'standalone'`.
- The Web app listens on port 3000 (internal).
- In Docker, the Web app is accessible only via nginx proxy.
- Static pages are pre-rendered at build time (62 pages as of Phase 9.5).

---

## M. Nginx Configuration

### Current Configuration
- File: `docker/nginx.conf`
- Listens on port 80 (HTTP only)
- Proxies `/` to `web:3000`
- Proxies `/api` to `api:4000`
- Proxies `/healthz` and `/api/healthz` to API health endpoint
- Rate limiting: `10r/s` with burst of 20 for `/api`
- `server_tokens off` (security)
- Gzip compression enabled

### Required Changes for Staging
1. **Add HTTPS/TLS** — See Section H
2. **Update `server_name`** — Replace `_` with actual staging domain:
   ```nginx
   server_name staging.example.com;
   ```
3. **Ensure conf.d directory exists:**
   ```bash
   mkdir -p docker/nginx/conf.d
   ```
4. **Mount SSL certificates** if using Docker:
   ```yaml
   volumes:
     - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
     - ./nginx/conf.d:/etc/nginx/conf.d:ro
     - /etc/letsencrypt:/etc/letsencrypt:ro
   ```

---

## N. Health-Check URLs

| URL | Description | Expected Response | Auth Required |
|-----|-------------|-------------------|---------------|
| `GET /healthz` | Load balancer health (via nginx) | `200 OK` proxied to API `/health` | No |
| `GET /health` | Full API health with dependency checks | JSON with database, redis, status | No |
| `GET /api/health` | Alias for API health | Same as `/health` | No |
| `GET /api/health` | API health endpoint | `200` with `{"status":"healthy",...}` | No |
| `GET /api/system-health` | Detailed system health | JSON with component statuses | Yes (auth) |

### Health Response Format
```json
{
  "status": "healthy",
  "timestamp": "2026-07-31T13:00:00.000Z",
  "checks": {
    "database": { "status": "healthy" },
    "redis": { "status": "healthy" }
  }
}
```
A `503` response indicates a downstream dependency failure.

---

## O. Logging/Monitoring Verification

### Log Collection
```bash
# View all logs
docker compose -f docker/docker-compose.production.yml logs -f

# View specific service logs
docker compose -f docker/docker-compose.production.yml logs -f api
docker compose -f docker/docker-compose.production.yml logs -f web
```

### Log Characteristics
- **Production mode:** Structured JSON via `pino` (pretty-print disabled)
- **Development mode:** Pretty-printed with `pino-pretty`
- **PII masking:** Enabled in all outputs (email, phone, name, IP address)

### Metrics Endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /api/observability/metrics` | Prometheus metrics |
| `GET /api/observability/status` | Observability system status |

### Operations Dashboard
Access at: `https://staging.example.com/dashboard/operations` (requires authentication)
- System resource monitoring
- Log viewer with filtering
- Production configuration viewer
- Service controls (super_admin only)

---

## P. Rollback Procedure

### Docker Compose Deployment
```bash
# Stop current deployment
docker compose -f docker/docker-compose.production.yml down

# Pull previous image/version
git checkout <previous-commit>
git pull origin main

# Rebuild and restart
docker compose -f docker/docker-compose.production.yml up -d --build

# Verify health
curl http://localhost/healthz
```

### Database Rollback
```bash
# Restore from backup
docker exec -t rds-postgres psql -U postgres -d rds_call_centre < backup.sql
```

### Quick Restart
```bash
docker compose -f docker/docker-compose.production.yml restart
```

---

## Q. Security Checklist

| Control | Status | Verification |
|---------|--------|--------------|
| HTTPS enabled | Ready | Certificate files mounted at `/etc/nginx/ssl/server.crt` and `/etc/nginx/ssl/server.key` |
| HSTS | Yes | Enabled in production via `helmet` when `NODE_ENV=production` |
| CORS restricted | Yes | Validate `CORS_ORIGIN` matches staging domain |
| Secure cookies | Yes | `COOKIE_SECURE=true` required in staging |
| Rate limiting | Yes | 1000 req/15min global, 20 req/15min on `/api/auth` |
| Request size limits | Yes | 1mb JSON, 1mb URL-encoded |
| Request IDs | Yes | Unique ID per request, propagated in headers and logs |
| Compression | Yes | `compression` middleware enabled |
| PII masking | Yes | Automatic redaction in logs |
| Graceful shutdown | Yes | SIGTERM/SIGINT handlers present |
| Secret handling | Yes | Twilio auth token, JWT secret, Supabase keys from env vars only |
| Error handling | Yes | Production-safe error messages, request IDs included |

### Pre-Deployment Security Actions
1. Generate `JWT_SECRET` with `openssl rand -hex 32`
2. Set `COOKIE_SECURE=true` in `docker/.env`
3. Place TLS certificates at `nginx/ssl/server.crt` and `nginx/ssl/server.key`
4. Set `SSL_CERT_PATH` and `SSL_KEY_PATH` in `docker/.env` if using non-default paths
5. Ensure `CORS_ORIGIN` does not contain `*`
6. Verify `TRUST_PROXY=true` if behind a load balancer

---

## R. End-to-End Test Checklist

After deployment, verify the following:

### Infrastructure
- [ ] All Docker containers are running (`docker compose ps`)
- [ ] API container is healthy (`docker compose ps api` shows `healthy`)
- [ ] Web container is healthy (`docker compose ps web` shows `healthy`)
- [ ] Redis container is healthy (`docker compose ps redis` shows `healthy`)
- [ ] Postgres container is healthy (if self-hosted)

### API Endpoints
- [ ] `GET /health` returns `200` with healthy status
- [ ] `GET /healthz` returns `200` (via nginx)
- [ ] `POST /api/auth/login` accepts credentials
- [ ] `GET /api/auth/me` returns authenticated user
- [ ] `GET /api/organizations` returns organization data (authenticated)

### Web Application
- [ ] `GET /` returns 200 with HTML
- [ ] `/dashboard` loads after authentication
- [ ] Static assets load correctly (JS, CSS, images)

### Call Execution (if Twilio configured)
- [ ] `POST /api/calls/start` initiates a call
- [ ] `POST /api/calls/:id/answer` answers a call
- [ ] `POST /api/calls/:id/end` ends a call
- [ ] `POST /api/calls/:id/play-audio` plays audio
- [ ] `POST /api/calls/:id/record-start` starts recording
- [ ] `POST /api/calls/:id/record-stop` stops recording
- [ ] `GET /api/calls/:id/status` returns call status

### Database
- [ ] Organizations can be listed
- [ ] Users can authenticate
- [ ] RLS policies are enforced

### Monitoring
- [ ] Logs are visible via `docker compose logs`
- [ ] Operations dashboard loads at `/dashboard/operations`
- [ ] System health page loads at `/dashboard/system-health`
- [ ] Metrics endpoint responds at `/api/observability/metrics`

---

## Missing Prerequisites

Before deployment, ensure the following are ready:

1. **Supabase project created** with:
   - Project URL
   - Anon key
   - Service role key
   - Database migrations applied

2. **Twilio account created** (if call execution is needed):
   - Account SID
   - Auth token
   - Phone number

3. **Domain and DNS configured:**
   - `staging.example.com` pointing to server
   - `api.staging.example.com` pointing to server

4. **TLS certificates placed:**
   - Certificate file at `nginx/ssl/server.crt` (or path matching `SSL_CERT_PATH`)
   - Private key at `nginx/ssl/server.key` (or path matching `SSL_KEY_PATH`)
   - Or TLS termination configured at load balancer

5. **`docker/.env` file created** with all required variables populated

6. **Server prepared:**
   - Docker and Docker Compose installed
   - Firewall allows ports 80, 443
   - Sufficient disk space for Docker images and volumes

---

## Configuration Problems Discovered

1. **Placeholder CORS/URL values** — `docker/.env.production.example` contains `https://api.example.com` and `https://app.example.com`. These must be replaced with actual staging URLs.

2. **`docker/.env` is gitignored** — This is correct for security, but means it must be manually created on the staging server.

3. **Postgres service in docker-compose may be redundant** — The application uses Supabase by default. The Postgres service is only needed for self-hosted deployments. Ensure this is intentional for staging.

---

## Exact Deployment Commands

```bash
# 1. Clone and checkout
git clone https://github.com/rishikumarrider12/RDS-AI-Call-Centre.git
cd RDS-AI-Call-Centre
git checkout phase9.5-twilio-integration-complete

# 2. Create environment file
cp docker/.env.production.example docker/.env
# Edit docker/.env with staging values

# 3. Start services
docker compose -f docker/docker-compose.production.yml up -d --build

# 4. Verify health
curl http://localhost/healthz
docker compose -f docker/docker-compose.production.yml ps

# 5. View logs
docker compose -f docker/docker-compose.production.yml logs -f

# 6. Stop services
docker compose -f docker/docker-compose.production.yml down
```

---

## Staging Deployment Readiness Assessment

| Area | Status | Notes |
|------|--------|-------|
| Code quality | ✅ Ready | Build, lint, typecheck all pass |
| Docker configuration | ✅ Ready | Multi-stage builds, health checks, resource limits |
| Environment variables | ⚠️ Needs manual setup | `docker/.env` must be created and populated |
| Supabase | ⚠️ Needs manual setup | Project must be created, migrations applied |
| Twilio | ⚠️ Optional | Required only for call execution testing |
| Nginx/HTTPS | ✅ Ready | TLS configured in nginx.conf; certificates mounted via docker-compose volumes |
| DNS | ⚠️ Needs manual setup | Domains must point to server |
| Database | ⚠️ Needs verification | Migrations must be applied to Supabase/Postgres |
| Security headers | ✅ Ready | Helmet, CORS, rate limiting configured |
| Logging | ✅ Ready | Structured JSON, PII masking |
| Monitoring | ✅ Ready | Metrics, health checks, operations dashboard |
| Rollback | ✅ Ready | Docker Compose commands documented |

### READY FOR STAGING: CONDITIONAL

**The repository is staging-deployment ready from a code and infrastructure perspective, pending these manual steps:**

1. Create and populate `docker/.env` with staging values
2. Place TLS certificate files at `nginx/ssl/server.crt` and `nginx/ssl/server.key` (or configure load balancer TLS)
3. Set up Supabase project and apply database migrations
4. Configure DNS records for staging domains
5. (Optional) Configure Twilio credentials for call execution testing

**No code changes are required.** All necessary configurations can be done via environment variables and certificate file placement.
