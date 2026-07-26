import {
  Registry,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
} from 'prom-client'

// Single registry that backs the /metrics endpoint (Phase 6.1).
export const metricsRegistry = new Registry()

collectDefaultMetrics({ register: metricsRegistry })

// ---- Request metrics ----
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [metricsRegistry],
})

export const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
})

// ---- Business metrics ----
export const callsTotal = new Counter({
  name: 'rds_calls_total',
  help: 'Total calls processed',
  labelNames: ['direction', 'outcome'],
  registers: [metricsRegistry],
})

export const organizationCount = new Gauge({
  name: 'rds_organizations_active',
  help: 'Number of active organizations',
  registers: [metricsRegistry],
})

// ---- Runtime status ----
export const serviceUp = new Gauge({
  name: 'rds_service_up',
  help: '1 if the service is up',
  registers: [metricsRegistry],
})
serviceUp.set(1)

export async function getMetrics(): Promise<string> {
  return metricsRegistry.metrics()
}

export function incrementCall(direction: string, outcome: string): void {
  callsTotal.inc({ direction, outcome })
}

export function setOrganizationCount(value: number): void {
  organizationCount.set(value)
}
