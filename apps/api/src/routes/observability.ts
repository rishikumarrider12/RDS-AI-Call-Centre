import { Router, Request, Response } from 'express'
import { getMetrics } from '../lib/metrics'
import { getTracer } from '../lib/telemetry'
import { logger } from '../lib/logger'

const router = Router()

const startTime = Date.now()
const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || null
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'rds-api'

// Prometheus-format metrics endpoint (6.1). Intentionally unauthenticated so
// scrapers can pull it; do not expose PII here (PII masking is enforced in logger).
router.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const body = await getMetrics()
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
    res.status(200).send(body)
  } catch (err) {
    logger.error(err, 'metrics scrape failed')
    res.status(500).json({ error: 'Failed to scrape metrics' })
  }
})

// Observability status + a quick trace smoke test (6.1).
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const tracer = getTracer()
    // Emit a short-lived span to prove the tracer pipeline is wired up.
    await tracer.startActiveSpan('observability.status', async (span) => {
      span.setAttribute('app.probe', 'true')
      span.end()
    })

    res.status(200).json({
      status: {
        tracingEnabled: !!OTLP_ENDPOINT,
        otlpEndpoint: OTLP_ENDPOINT,
        serviceName: SERVICE_NAME,
        metricsEndpoint: '/api/observability/metrics',
      },
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      nodeVersion: process.version,
    })
  } catch (err) {
    logger.error(err, 'observability status failed')
    res.status(500).json({ error: 'Failed to load observability status' })
  }
})

export default router
