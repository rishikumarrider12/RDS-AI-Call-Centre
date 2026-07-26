import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import {
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
} from '@opentelemetry/sdk-metrics'
import { resourceFromAttributes } from '@opentelemetry/resources'
import {
  SemanticResourceAttributes,
} from '@opentelemetry/semantic-conventions'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { trace, context, SpanStatusCode, Span, Tracer } from '@opentelemetry/api'

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'rds-api'
const SERVICE_VERSION = process.env.npm_package_version || '0.1.0'
const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || ''

let sdk: NodeSDK | undefined

// Lazily initialise the OpenTelemetry SDK. When no OTLP endpoint is configured
// (local/dev) we still record traces and expose them via metrics, but skip the
// network exporter so nothing fails offline.
export function initTelemetry(): void {
  if (sdk) return

  const resource = resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
    [SemanticResourceAttributes.SERVICE_VERSION]: SERVICE_VERSION,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  })

  const metricReaders = []
  if (OTLP_ENDPOINT) {
    metricReaders.push(
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: `${OTLP_ENDPOINT}/v1/metrics` }),
      })
    )
  } else {
    metricReaders.push(new PeriodicExportingMetricReader({ exporter: new ConsoleMetricExporter() }))
  }

  const traceExporter = OTLP_ENDPOINT
    ? new OTLPTraceExporter({ url: `${OTLP_ENDPOINT}/v1/traces` })
    : undefined

  sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader: metricReaders.length ? metricReaders[0] : undefined,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-express': { enabled: true },
        '@opentelemetry/instrumentation-http': { enabled: true },
      }),
    ],
  })

  try {
    sdk.start()
  } catch (err) {
    // Telemetry must never break the app on startup.
    console.error('[telemetry] failed to start', err)
  }
}

export async function shutdownTelemetry(): Promise<void> {
  if (sdk) {
    try {
      await sdk.shutdown()
    } catch {
      /* ignore */
    }
    sdk = undefined
  }
}

export function getTracer(): Tracer {
  return trace.getTracer(SERVICE_NAME, SERVICE_VERSION)
}

/**
 * Wrap an async function in a span. The returned function propagates the
 * active context and records errors with the OpenTelemetry status code.
 */
export function withSpan<T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T,
  attributes?: Record<string, string | number | boolean>
): T {
  return (async (...args: any[]) => {
    const tracer = getTracer()
    return tracer.startActiveSpan(name, { attributes }, async (span: Span) => {
      try {
        const result = await fn(...args)
        span.setStatus({ code: SpanStatusCode.OK })
        return result
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: err instanceof Error ? err.message : 'error' })
        span.recordException(err as Error)
        throw err
      } finally {
        span.end()
      }
    })
  }) as T
}

export const otel = { trace, context }
