import os from 'os'
import { logBuffer } from '../lib/logBuffer'
import type { SystemResource, LogEntry, ProductionConfigEntry, ServiceControlAction } from '@rds/types'

const REDACT_KEYS = new Set([
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'JWT_SECRET',
  'POSTGRES_PASSWORD',
  'COOKIE_SECRET',
  'REDIS_URL',
])

const CONFIG_DESCRIPTIONS: Record<string, string> = {
  NODE_ENV: 'Runtime environment',
  PORT: 'API server port',
  API_PORT: 'Legacy API port reference',
  APP_URL: 'Canonical application URL',
  NEXT_PUBLIC_API_URL: 'Public API URL for browser clients',
  CORS_ORIGIN: 'Allowed CORS origins (comma-separated)',
  SUPABASE_URL: 'Supabase project URL',
  SUPABASE_ANON_KEY: 'Supabase anon/public key (redacted)',
  SUPABASE_SERVICE_ROLE_KEY: 'Supabase service role key (redacted)',
  NEXT_PUBLIC_SUPABASE_URL: 'Public Supabase URL (redacted)',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'Public Supabase anon key (redacted)',
  COOKIE_SECURE: 'Require secure cookies',
  COOKIE_SAMESITE: 'Cookie SameSite policy',
  REDIS_URL: 'Redis connection URL',
  LOG_LEVEL: 'Logging verbosity',
  JWT_SECRET: 'JWT signing secret (redacted)',
  POSTGRES_USER: 'PostgreSQL user',
  POSTGRES_PASSWORD: 'PostgreSQL password (redacted)',
  POSTGRES_DB: 'PostgreSQL database name',
  OTEL_SERVICE_NAME: 'OpenTelemetry service name',
  OTEL_EXPORTER_OTLP_ENDPOINT: 'OpenTelemetry OTLP endpoint',
}

export class OperationsService {
  getSystemResources(): SystemResource {
    const cpus = os.cpus()
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem

    let cpuUsage = 0
    if (cpus.length > 0) {
      const _total = cpus.reduce((acc, c) => {
        const total = c.times.user + c.times.nice + c.times.sys + c.times.idle + c.times.irq
        const idle = c.times.idle
        return { total, idle }
      }, { total: 0, idle: 0 })

      const avgTotal = cpus.reduce((acc, c) => acc + (c.times.user + c.times.nice + c.times.sys + c.times.idle + c.times.irq), 0)
      const avgIdle = cpus.reduce((acc, c) => acc + c.times.idle, 0)
      cpuUsage = avgTotal > 0 ? Number(((avgTotal - avgIdle) / avgTotal).toFixed(4)) : 0
    }

    const diskUsage = this.getDiskUsage()

    return {
      cpuUsage,
      memoryUsage: Number((usedMem / totalMem).toFixed(4)),
      memoryTotal: totalMem,
      memoryFree: freeMem,
      diskUsage: diskUsage.usage,
      diskTotal: diskUsage.total,
      diskFree: diskUsage.free,
      uptimeSeconds: Math.floor(process.uptime()),
      loadAverage: os.loadavg(),
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
    }
  }

  getRecentLogs(options?: { level?: string; search?: string; limit?: number }): { logs: LogEntry[] } {
    return { logs: logBuffer.getEntries(options) }
  }

  clearLogs(): void {
    logBuffer.clear()
  }

  getProductionConfig(): ProductionConfigEntry[] {
    const entries: ProductionConfigEntry[] = []

    for (const [key, value] of Object.entries(process.env)) {
      if (value === undefined || value === '') continue

      const isRedacted = REDACT_KEYS.has(key)
      entries.push({
        key,
        value: isRedacted ? '***redacted***' : value,
        redacted: isRedacted,
        description: CONFIG_DESCRIPTIONS[key],
      })
    }

    entries.sort((a, b) => a.key.localeCompare(b.key))
    return entries
  }

  getServiceControlActions(): ServiceControlAction[] {
    return [
      {
        action: 'restart',
        description: 'Gracefully restart the API service. Docker Compose will restart the container automatically.',
      },
      {
        action: 'shutdown',
        description: 'Gracefully shut down the API service. Use only for maintenance.',
      },
    ]
  }

  restartService(): void {
    process.kill(process.pid, 'SIGTERM')
  }

  private getDiskUsage(): { usage: number; total: number; free: number } {
    try {
      const { execSync } = require('child_process')
      const output = execSync(`df -P / | tail -1`, { encoding: 'utf8' })
      const parts = output.trim().split(/\s+/)
      const total = parseInt(parts[1], 10) * 1024
      const free = parseInt(parts[3], 10) * 1024
      const used = parseInt(parts[2], 10) * 1024
      return {
        usage: total > 0 ? Number((used / total).toFixed(4)) : 0,
        total,
        free,
      }
    } catch {
      return { usage: 0, total: 0, free: 0 }
    }
  }
}
