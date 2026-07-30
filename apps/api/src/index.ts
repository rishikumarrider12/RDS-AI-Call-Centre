import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import { env } from './lib/env'
import { logger } from './lib/logger'
import healthRouter from './routes/health'
import authRouter from './routes/auth'
import organizationRouter from './routes/organization'
import usersRouter from './routes/users'
import apiKeyRouter from './routes/apikey'
import apiKeysRouter from './routes/apiKeys'
import campaignRouter from './routes/campaigns'
import contactListRouter from './routes/contactLists'
import contactRouter from './routes/contacts'
import contactManagementRouter from './routes/contactManagement'
import liveMonitoringRouter from './routes/liveMonitoring'
import callRouter from './routes/calls'
import billingRouter from './routes/billing'
import billingCenterRouter from './routes/billingCenter'
import subscriptionRouter from './routes/subscriptions'
import planRouter from './routes/plans'
import couponRouter from './routes/coupons'
import creditRouter from './routes/credits'
import billingSettingsRouter from './routes/billingSettings'
import transactionRouter from './routes/transactions'
import webhookRouter from './routes/webhooks'
import integrationRouter from './routes/integrations'
import notificationRouter from './routes/notifications'
import oauthRouter from './routes/oauth'
import notificationChannelRouter from './routes/notificationChannels'
import notificationTemplateRouter from './routes/notificationTemplates'
import notificationLogRouter from './routes/notificationLogs'
import auditRouter from './routes/audit'
import auditCategoryRouter from './routes/auditCategories'
import complianceRouter from './routes/compliance'
import compliancePolicyRouter from './routes/compliancePolicies'
import accessReviewRouter from './routes/accessReviews'
import securityIncidentRouter from './routes/securityIncidents'
import observabilityRouter from './routes/observability'
import systemHealthRouter from './routes/systemHealth'
import alertsRouter from './routes/alerts'
import deploymentsRouter from './routes/deployments'
import costRouter from './routes/cost'
import backupRouter from './routes/backup'
import performanceRouter from './routes/performance'
import scalingRouter from './routes/scaling'
import regionRouter from './routes/region'
import queueRouter from './routes/queues'
import featureFlagRouter from './routes/featureFlags'
import aiAgentRouter from './routes/aiAgents'
import conversationRouter from './routes/conversations'
import voiceProviderRouter from './routes/voiceProviders'
import callingEngineRouter from './routes/callingEngine'
import operationsRouter from './routes/operations'
import disasterRecoveryRouter from './routes/disasterRecovery'
import maintenanceRouter from './routes/maintenance'
import { ProviderDIContainer } from './lib/providers/ProviderDIContainer'
import { ElevenLabsProvider } from './lib/providers/adapters/ElevenLabsProvider'
import { OpenAIProvider } from './lib/providers/adapters/OpenAIProvider'
import { AzureSpeechProvider } from './lib/providers/adapters/AzureSpeechProvider'
import { GoogleCloudSpeechProvider } from './lib/providers/adapters/GoogleCloudSpeechProvider'
import { errorHandler } from './middleware/error'
import { initTelemetry, shutdownTelemetry } from './lib/telemetry'
import { httpRequestsTotal, httpRequestDurationSeconds, serviceUp } from './lib/metrics'

const app = express()

// Trust proxy only if explicitly configured. In production behind a reverse proxy,
// set TRUST_PROXY=true so req.ip and rate limiting work correctly.
if (env.NODE_ENV === 'production' && process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1)
}

// Security hardening: strict helmet configuration
const isProduction = env.NODE_ENV === 'production'
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: isProduction
      ? { maxAge: 63072000, includeSubDomains: true, preload: true }
      : false,
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        }
      : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true,
    hidePoweredBy: true,
  })
)

// CORS: validate exact origins rather than blindly trusting the header
const allowedOrigins = new Set(env.CORS_ORIGIN.split(',').map((s) => s.trim()))
app.use(
  cors({
    origin: (origin) => {
      if (!origin || allowedOrigins.has(origin)) {
        return true
      }
      return false
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-ID'],
    exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Request-ID'],
  })
)

// Compression: reduce payload sizes for all responses
app.use(compression())

// Body parsing with size limits to prevent memory exhaustion
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))
app.use(cookieParser())

// Assign a unique request ID to every incoming request for tracing
app.use((req, _res, next) => {
  req.id = req.headers['x-request-id'] as string | undefined || `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  next()
})

// Ensure every response carries the request ID
app.use((req, res, next) => {
  res.setHeader('X-Request-ID', req.id as string)
  next()
})

// Cache control: prevent caching of API responses by default
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  }
  next()
})

// Rate limiting: generous but prevents abuse
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  })
)

// Strict rate limiting for authentication endpoints
app.use(
  '/api/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
  })
)

app.use((req, _res, next) => {
  logger.info({ method: req.method, path: req.path, requestId: req.id }, 'incoming request')
  next()
})

app.use((req, res, next) => {
  const start = process.hrtime.bigint()
  const route = (req.route?.path as string) || req.baseUrl || req.path
  res.on('finish', () => {
    const seconds = Number(process.hrtime.bigint() - start) / 1e9
    const status = String(res.statusCode)
    httpRequestsTotal.inc({ method: req.method, route, status })
    httpRequestDurationSeconds.observe({ method: req.method, route, status }, seconds)
  })
  next()
})

app.use('/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/organizations', organizationRouter)
app.use('/api/organizations', usersRouter)
app.use('/api/organizations', apiKeyRouter)
app.use('/api/campaigns', campaignRouter)
app.use('/api/contact-lists', contactListRouter)
app.use('/api/contacts', contactRouter)
app.use('/api/contacts', contactManagementRouter)
app.use('/api/live-monitor', liveMonitoringRouter)
app.use('/api/calls', callRouter)
app.use('/api/billing', billingRouter)
app.use('/api/billing-center', billingCenterRouter)
app.use('/api/subscriptions', subscriptionRouter)
app.use('/api/plans', planRouter)
app.use('/api/coupons', couponRouter)
app.use('/api/credits', creditRouter)
app.use('/api/billing-settings', billingSettingsRouter)
app.use('/api/transactions', transactionRouter)
app.use('/api/webhooks', webhookRouter)
app.use('/api/integrations', integrationRouter)
app.use('/api/notifications', notificationRouter)
app.use('/api/notification-channels', notificationChannelRouter)
app.use('/api/notification-templates', notificationTemplateRouter)
app.use('/api/notification-logs', notificationLogRouter)
app.use('/api/api-keys', apiKeysRouter)
app.use('/api/oauth', oauthRouter)
app.use('/api/audit', auditRouter)
app.use('/api/audit-categories', auditCategoryRouter)
app.use('/api/compliance', complianceRouter)
app.use('/api/compliance-policies', compliancePolicyRouter)
app.use('/api/access-reviews', accessReviewRouter)
app.use('/api/security-incidents', securityIncidentRouter)
app.use('/api/observability', observabilityRouter)
app.use('/api/system-health', systemHealthRouter)
app.use('/api/alerts', alertsRouter)
app.use('/api/deployments', deploymentsRouter)
app.use('/api/costs', costRouter)
app.use('/api/backups', backupRouter)
app.use('/api/performance', performanceRouter)
app.use('/api/scaling', scalingRouter)
app.use('/api/regions', regionRouter)
app.use('/api/queues', queueRouter)
app.use('/api/feature-flags', featureFlagRouter)
app.use('/api/ai-agents', aiAgentRouter)
app.use('/api/conversations', conversationRouter)
app.use('/api/voice-providers', voiceProviderRouter)
app.use('/api/calling-engine', callingEngineRouter)
app.use('/api/operations', operationsRouter)
app.use('/api/disaster-recovery', disasterRecoveryRouter)
app.use('/api/maintenance', maintenanceRouter)
app.use('/api', healthRouter)

app.use(errorHandler)

// OpenTelemetry must be initialised before the server starts accepting traffic.
initTelemetry()

const di = ProviderDIContainer.getInstance()
di.registerProviderInstance(new ElevenLabsProvider())
di.registerProviderInstance(new OpenAIProvider())
di.registerProviderInstance(new AzureSpeechProvider())
di.registerProviderInstance(new GoogleCloudSpeechProvider())
logger.info('Voice providers registered', { count: 4 })

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'API server listening')
})

// Gracefully close connections and exit.
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'shutting down')

  serviceUp.set(0)

  // Stop accepting new connections and wait for existing ones to drain.
  await new Promise<void>((resolve) => server.close(() => resolve()))

  // Flush telemetry before exiting.
  try {
    await shutdownTelemetry()
  } catch {
    // Ignore telemetry shutdown errors.
  }

  logger.info('shutdown complete')
  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Production hardening: prevent silent crashes
process.on('uncaughtException', (err) => {
  logger.error({ message: err.message, stack: err.stack }, 'uncaught exception')
  gracefulShutdown('uncaughtException')
})

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'unhandled rejection')
  gracefulShutdown('unhandledRejection')
})

export default app
