# RDS AI Call Centre — Deployment Guide

## Overview

This document covers deploying the RDS AI Call Centre to production. The platform consists of three main components:

- **Web** — Next.js frontend (served via Node.js)
- **API** — Express backend
- **Nginx** — Reverse proxy (terminates TLS, routes traffic)

Supporting services:
- **PostgreSQL** — Primary database (Supabase or self-hosted)
- **Redis** — Queue backend and caching

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 20+ | Required for build and runtime |
| Docker | 24+ | Required for containerised deployment |
| Docker Compose | 2.20+ | Required for multi-service orchestration |
| PostgreSQL | 16+ | Required; Supabase managed DB recommended |
| Redis | 7+ | Required for BullMQ queues |

---

## Environment Configuration

### 1. Copy production environment file

```bash
cp docker/.env.production.example docker/.env
```

### 2. Required variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Must be `production` | `production` |
| `SUPABASE_URL` | Supabase project URL | `https://xyz.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon/public key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJ...` |
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase URL (browser) | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase anon key (browser) | `eyJ...` |
| `CORS_ORIGIN` | Allowed web origins (comma-separated) | `https://app.example.com` |
| `NEXT_PUBLIC_API_URL` | Public API URL (browser) | `https://api.example.com` |
| `COOKIE_SECURE` | Must be `true` in production | `true` |
| `JWT_SECRET` | Minimum 32 characters | `openssl rand -hex 32` |

### 3. PostgreSQL configuration (self-hosted)

If using self-hosted PostgreSQL instead of Supabase, set:

| Variable | Description |
|----------|-------------|
| `POSTGRES_USER` | Database user |
| `POSTGRES_PASSWORD` | Database password (use strong random value) |
| `POSTGRES_DB` | Database name |

---

## Deployment Methods

### Method A: Docker Compose (Recommended)

```bash
# Build and start all services
docker compose -f docker/docker-compose.production.yml up -d --build

# Verify health
curl http://localhost/healthz

# View logs
docker compose -f docker/docker-compose.production.yml logs -f
```

### Method B: Manual Deployment

#### 1. Build the API

```bash
npm run build:api
```

#### 2. Build the Web app

```bash
npm run build:web
```

#### 3. Start the API

```bash
NODE_ENV=production node dist/index.js
```

#### 4. Start the Web app

```bash
NODE_ENV=production npm run start --workspace=apps/web
```

#### 5. Configure Nginx

Copy `docker/nginx.conf` to your Nginx configuration directory and reload:

```bash
sudo cp docker/nginx.conf /etc/nginx/nginx.conf
sudo nginx -t && sudo systemctl reload nginx
```

---

## Health Checks

| Endpoint | Description | Expected Response |
|----------|-------------|-------------------|
| `GET /healthz` | Load balancer health (via nginx) | `200 OK` proxied to API `/health` |
| `GET /health` | Full API health with dependency checks | `200` with `database` and `redis` status |
| `GET /api/health` | Alias for API health | Same as `/health` |

### Health response format

```json
{
  "status": "healthy",
  "timestamp": "2026-07-29T16:00:00.000Z",
  "checks": {
    "database": { "status": "healthy" },
    "redis": { "status": "healthy" }
  }
}
```

A `503` response indicates a downstream dependency failure.

---

## Logging

### Production mode

Logs are output as structured JSON to stdout/stderr. Collect them with:

```bash
docker compose -f docker/docker-compose.production.yml logs -f
```

### Development mode

Logs are pretty-printed with timestamps and color via `pino-pretty`.

### PII masking

All known PII fields (email, phone, name, IP address) are automatically redacted in logs per the Phase 5 compliance requirements.

---

## Graceful Shutdown

The API handles `SIGTERM` and `SIGINT` signals:

1. Sets Prometheus `service_up` metric to `0`
2. Stops accepting new connections (`server.close()`)
3. Flushes OpenTelemetry traces and metrics
4. Exits with code `0`

Docker Compose sends `SIGTERM` on `docker compose down` or service restart.

---

## Security

| Feature | Status |
|---------|--------|
| HTTPS enforcement | Via Nginx reverse proxy (configure TLS certificates) |
| HSTS | Enabled in production via `helmet` |
| Rate limiting | 100 requests / 15 min per IP |
| CORS | Restricted to `CORS_ORIGIN` |
| Secure cookies | `COOKIE_SECURE=true` in production |
| PII masking | Enabled in all log outputs |

### TLS/SSL with Nginx

The `docker/nginx.conf` is configured for HTTPS. The HTTP server block on port 80 redirects all traffic to HTTPS.

#### Certificate requirements

Nginx expects certificate files at these container-internal paths:
- Certificate: `/etc/nginx/ssl/server.crt`
- Private key: `/etc/nginx/ssl/server.key`

These paths are mounted from the host via `docker-compose.production.yml` using:
- `SSL_CERT_PATH` environment variable (default: `../nginx/ssl/server.crt`)
- `SSL_KEY_PATH` environment variable (default: `../nginx/ssl/server.key`)

#### Obtain staging TLS certificates

**Option A: Let's Encrypt (recommended for staging)**

```bash
# Install certbot if needed
sudo apt update && sudo apt install certbot

# Obtain certificate (standalone mode, stop nginx container first if needed)
sudo certbot certonly --standalone -d staging.example.com -d api.staging.example.com

# Certificates will be placed at:
# /etc/letsencrypt/live/staging.example.com/fullchain.pem
# /etc/letsencrypt/live/staging.example.com/privkey.pem
```

**Option B: Load balancer TLS termination**

If using AWS ALB, GCP LB, Cloudflare, or similar:
- Terminate TLS at the load balancer
- Forward HTTP traffic to nginx port 80
- No certificate files needed on the Docker host

#### Place certificates for Docker

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Copy certificates (Option A)
sudo cp /etc/letsencrypt/live/staging.example.com/fullchain.pem nginx/ssl/server.crt
sudo cp /etc/letsencrypt/live/staging.example.com/privkey.pem nginx/ssl/server.key

# Set restrictive permissions
sudo chmod 600 nginx/ssl/server.key
sudo chmod 644 nginx/ssl/server.crt
```

#### Configure nginx and start

```bash
# Verify nginx configuration syntax (requires nginx installed locally or in container)
docker run --rm -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro nginx:1.27-alpine nginx -t

# Start the stack
docker compose -f docker/docker-compose.production.yml up -d --build

# Verify HTTPS
curl -I https://staging.example.com/healthz
curl -I http://staging.example.com/healthz
# The HTTP request should return 301/308 redirect to HTTPS
```

#### Certificate renewal (Let's Encrypt)

```bash
# Test renewal process
sudo certbot renew --dry-run

# Renew certificates
sudo certbot renew

# Copy renewed certificates to nginx ssl directory
sudo cp /etc/letsencrypt/live/staging.example.com/fullchain.pem nginx/ssl/server.crt
sudo cp /etc/letsencrypt/live/staging.example.com/privkey.pem nginx/ssl/server.key

# Reload nginx
docker compose -f docker/docker-compose.production.yml exec nginx nginx -s reload
```

#### Safely replace certificates

```bash
# 1. Copy new certificate and key to host paths
cp new-cert.crt nginx/ssl/server.crt
cp new-key.key nginx/ssl/server.key

# 2. Verify nginx config
docker run --rm -v $(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro nginx:1.27-alpine nginx -t

# 3. Reload nginx (zero downtime)
docker compose -f docker/docker-compose.production.yml exec nginx nginx -s reload

# 4. Verify
curl -I https://staging.example.com/
```

#### Security notes
- Never commit certificate files or private keys to version control
- `nginx/ssl/` directory should be added to `.gitignore` if not already present
- Certificate private keys must have `600` permissions
- Use automated renewal with cron or systemd timer for Let's Encrypt

---

## Monitoring

### Prometheus metrics

```
GET /api/observability/metrics
```

### Observability status

```
GET /api/observability/status
```

### OpenTelemetry traces

Configure with:

```
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.example.com/v1/traces
```

---

## Backup & Restore

### Database backups

```bash
# Create a backup
docker exec -t rds-postgres pg_dump -U postgres rds_call_centre > backup.sql

# Restore
docker exec -t rds-postgres psql -U postgres -d rds_call_centre < backup.sql
```

Or use the API-managed backup endpoints:

```
POST /api/backups
POST /api/backups/:id/restore
POST /api/backups/:id/complete
```

---

## Troubleshooting

| Issue | Resolution |
|-------|-----------|
| API won't start | Check `docker logs rds-api`; verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` |
| Web app 502 | Check `docker logs rds-web`; verify `NEXT_PUBLIC_API_URL` |
| Redis connection failed | Verify `REDIS_URL` points to correct Redis host |
| Database migration errors | Run `docker exec rds-postgres psql -U postgres -f /docker-entrypoint-initdb.d/migrations/001_initial_schema.sql` |
| Health check failing | Check `docker logs` for API/Web containers; verify network connectivity |

---

## Scaling

### Horizontal scaling

Scale API and Web instances:

```bash
docker compose -f docker/docker-compose.production.yml up -d --scale api=3 --scale web=2
```

### Resource limits

Each service has CPU and memory limits defined in `docker-compose.production.yml` under `deploy.resources`.

### Queue scaling

BullMQ queues are partitioned by organization (`org:{id}:jobs`). Increase worker concurrency via environment variables or deploy multiple API replicas.

---

## CI/CD Integration

Example GitHub Actions step:

```yaml
- name: Deploy to production
  run: |
    docker compose -f docker/docker-compose.production.yml down
    docker compose -f docker/docker-compose.production.yml up -d --build
    docker compose -f docker/docker-compose.production.yml ps
```

---

## Rollback

```bash
# Rollback to previous image
docker compose -f docker/docker-compose.production.yml up -d --force-recreate
```
