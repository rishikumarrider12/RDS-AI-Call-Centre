export type UserRole = 'super_admin' | 'org_admin' | 'agent' | 'viewer'

export interface User {
  id: string
  email: string
  fullName: string
  role: UserRole
  organizationId: string
  createdAt: string
  updatedAt: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  plan: 'starter' | 'growth' | 'enterprise'
  createdAt: string
  updatedAt: string
}

export type CallStatus =
  | 'queued'
  | 'ringing'
  | 'connected'
  | 'ended'
  | 'failed'
  | 'no-answer'
  | 'busy'

export type CallOutcome =
  | 'completed'
  | 'human'
  | 'voicemail'
  | 'machine'
  | 'busy'
  | 'no-answer'
  | 'failed'

export interface CallTranscriptLine {
  sequence: number
  channel: 'customer' | 'agent' | 'system'
  text: string
  confidence: number | null
  isFinal: boolean
}

export interface Call {
  id: string
  organizationId: string
  campaignId: string | null
  contactId: string | null
  agentId: string | null
  callQueueId: string | null
  direction: 'outbound' | 'inbound'
  status: CallStatus
  outcome: CallOutcome | null
  provider: string | null
  providerCallSid: string | null
  toNumber: string
  fromNumber: string
  durationSeconds: number
  billSeconds: number
  recordingUrl: string | null
  recordingDuration: number | null
  cost: number | null
  currency: string | null
  dialAttempt: number
  startAt: string | null
  answerAt: string | null
  endAt: string | null
  hangupCause: string | null
  transcript: string | null
  summary: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
  // Joined display fields
  contactName?: string | null
  contactPhone?: string | null
  agentName?: string | null
  campaignName?: string | null
  transcriptLines?: CallTranscriptLine[]
}

export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'ended'

export interface Campaign {
  id: string
  organizationId: string
  name: string
  description: string | null
  type: 'outbound' | 'inbound'
  status: CampaignStatus
  direction: 'outbound' | 'inbound'
  aiAgentId: string | null
  aiScriptId: string | null
  voiceProfileId: string | null
  fromNumberId: string | null
  contactListId: string | null
  schedule: Record<string, unknown>
  retryPolicy: Record<string, unknown>
  dialingStrategy: 'progressive' | 'predictive' | 'power' | null
  maxConcurrent: number | null
  totalContacts: number
  completedContacts: number
  failedContacts: number
  script: string
  voice: string
  startedAt: string | null
  endedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CampaignSummary {
  id: string
  name: string
  organizationId: string
  organizationName: string
  status: CampaignStatus
  totalContacts: number
  completedContacts: number
  failedContacts: number
  completionRate: number
  totalCalls: number
  connectedCalls: number
  failedCalls: number
  totalMinutes: number
  totalCost: number
}

export interface ContactList {
  id: string
  organizationId: string
  name: string
  description: string | null
  totalContacts: number
  tags: string[]
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface Contact {
  id: string
  organizationId: string
  contactListId: string | null
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string
  country: string | null
  timezone: string | null
  tags: string[]
  dndStatus: boolean
  source: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CsvImportRowError {
  row: number
  message: string
  raw?: string
}

export interface CsvImportResult {
  totalRows: number
  validRows: number
  inserted: number
  duplicatesSkipped: number
  errors: number
  errorSamples: CsvImportRowError[]
  contactListId: string | null
  contactListName: string | null
}

export type UserStatus = 'active' | 'invited' | 'suspended'

export interface OrganizationUser {
  id: string
  email: string
  fullName: string
  avatarUrl: string | null
  role: UserRole
  status: UserStatus
  lastLoginAt: string | null
  createdAt: string
}

export type ApiKeyStatus = 'active' | 'revoked'

export interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  status: ApiKeyStatus
  permissions: string
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface OrganizationSettings {
  id: string
  organizationId: string
  maxConcurrentCalls: number
  maxAgents: number
  callRecordingEnabled: boolean
  aiTtsVoiceId: string | null
  aiSttProvider: string | null
  defaultCallerId: string | null
  aiGreeting: string | null
  aiFallbackMessage: string | null
  complianceDndCheck: boolean
  complianceConsentRequired: boolean
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

// =============================================
// Billing & Subscription
// =============================================

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled'
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'

export interface Subscription {
  id: string
  organizationId: string
  plan: string
  status: SubscriptionStatus
  currentPeriodStart: string
  currentPeriodEnd: string
  trialEndsAt: string | null
  cancelAtPeriodEnd: boolean
  canceledAt: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface Invoice {
  id: string
  organizationId: string
  subscriptionId: string | null
  amount: number
  currency: string
  status: InvoiceStatus
  dueAt: string | null
  paidAt: string | null
  lineItems: Array<Record<string, unknown>>
  createdAt: string
  updatedAt: string
}

export interface Wallet {
  id: string
  organizationId: string
  balance: number
  currency: string
  createdAt: string
  updatedAt: string
}

export interface UsageRecord {
  id: string
  organizationId: string
  recordDate: string
  aiMinutes: number
  telephonyMinutes: number
  callsCount: number
  storageBytes: number
  sttMinutes: number
  ttsCharacters: number
  createdAt: string
  updatedAt: string
}

export interface BillingDashboard {
  subscription: Subscription | null
  invoices: Invoice[]
  usage: UsageRecord[]
  wallet: Wallet | null
  summary: {
    totalSpent: number
    outstanding: number
    currency: string
    currentPeriodCalls: number
    currentPeriodMinutes: number
  }
}

// =============================================
// Webhooks
// =============================================

export type WebhookDeliveryStatus = 'pending' | 'success' | 'failed' | 'retrying'

export interface Webhook {
  id: string
  organizationId: string
  url: string
  secret: string
  events: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface WebhookDelivery {
  id: string
  webhookId: string
  organizationId: string
  event: string
  payload: Record<string, unknown>
  status: WebhookDeliveryStatus
  httpStatus: number | null
  responseBody: string | null
  attempt: number
  nextAttemptAt: string | null
  createdAt: string
  updatedAt: string
}

// =============================================
// Integrations
// =============================================

export type IntegrationStatus = 'active' | 'inactive' | 'error'

export interface Integration {
  id: string
  organizationId: string
  provider: string
  name: string
  status: IntegrationStatus
  config: Record<string, unknown>
  webhookUrl: string | null
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface IntegrationProviderField {
  key: string
  label: string
  type: 'text' | 'password' | 'url' | 'select'
  options?: string[]
  required?: boolean
}

export interface IntegrationProvider {
  key: string
  name: string
  description: string
  category: 'crm' | 'messaging' | 'storage' | 'analytics' | 'other'
  fields: IntegrationProviderField[]
}

// =============================================
// Notifications
// =============================================

export type NotificationType = 'email' | 'sms' | 'push' | 'in-app'
export type NotificationChannel = 'billing' | 'usage' | 'security' | 'support'

export interface Notification {
  id: string
  organizationId: string
  userId: string | null
  type: NotificationType
  channel: NotificationChannel
  title: string
  body: string | null
  data: Record<string, unknown>
  readAt: string | null
  createdAt: string
}

export interface NotificationCategoryPref {
  email: boolean
  sms: boolean
  push: boolean
  in_app: boolean
}

export interface NotificationPreferences {
  billing: NotificationCategoryPref
  usage: NotificationCategoryPref
  security: NotificationCategoryPref
  support: NotificationCategoryPref
}

// =============================================
// Audit Logs
// =============================================

export type AuditActorType = 'user' | 'system' | 'api'

export interface AuditLog {
  id: string
  organizationId: string
  actorId: string | null
  actorName: string | null
  actorEmail: string | null
  action: string
  actorType: AuditActorType
  resourceType: string | null
  resourceId: string | null
  ipAddress: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  createdAt: string
}

// =============================================
// Compliance & Security (Phase 5)
// =============================================

export type ConsentMethod = 'verbal' | 'ivr' | 'keypress' | 'written' | 'automated_disclosure'

export interface ConsentRecord {
  id: string
  organizationId: string
  contactId: string | null
  campaignId: string | null
  callId: string | null
  consented: boolean
  method: ConsentMethod
  disclosedAt: string | null
  disclosureText: string | null
  ipAddress: string | null
  createdAt: string
}

export interface DndEntry {
  id: string
  organizationId: string
  phone: string
  source: string | null
  reason: string | null
  createdAt: string
  expiresAt: string | null
}

export type RetentionAction = 'anonymize' | 'delete'

export interface RetentionPolicy {
  id: string
  organizationId: string
  resourceType: string
  retentionDays: number
  action: RetentionAction
  createdAt: string
  updatedAt: string
}

export type DataRequestStatus = 'requested' | 'processing' | 'completed' | 'failed'

export interface DataExportRequest {
  id: string
  organizationId: string
  requestedBy: string
  status: DataRequestStatus
  requestedAt: string
  completedAt: string | null
  downloadUrl: string | null
}

export interface DataDeletionRequest {
  id: string
  organizationId: string
  requestedBy: string
  status: DataRequestStatus
  requestedAt: string
  completedAt: string | null
  scope: string | null
}

export interface ComplianceStatus {
  dndCheckEnabled: boolean
  consentRequired: boolean
  auditImmutable: boolean
  piiMaskingEnabled: boolean
  hstsEnforced: boolean
  encryptionAtRest: boolean
}

export interface AuditSummary {
  total: number
  byAction: Array<{ action: string; count: number }>
  oldestAt: string | null
  newestAt: string | null
}

// =============================================
// Observability (Phase 6.1)
// =============================================

export interface MetricSample {
  name: string
  type: 'counter' | 'gauge' | 'histogram' | 'summary' | 'untyped'
  help: string
  value: number
}

export interface ObservabilityStatus {
  tracingEnabled: boolean
  otlpEndpoint: string | null
  serviceName: string
  metricsEndpoint: string
}

export interface ObservabilitySnapshot {
  status: ObservabilityStatus
  uptimeSeconds: number
  nodeVersion: string
  metrics: MetricSample[]
}

// =============================================
// Cost Tracking, Usage Accounting, Budgets (Phase 6.2 / 6.3)
// =============================================

export type CostCategory = 'telephony' | 'ai' | 'stt' | 'tts' | 'storage' | 'other'
export type BudgetPeriod = 'monthly' | 'daily'
export type AlertLevel = 'warning' | 'limit'

export interface CostRecord {
  id: string
  organizationId: string
  recordDate: string
  category: CostCategory
  quantity: number
  unit: string
  unitCost: number
  cost: number
  currency: string
  createdAt: string
}

export interface Budget {
  id: string
  organizationId: string
  category: CostCategory | 'total'
  period: BudgetPeriod
  limitAmount: number
  currency: string
  warnThreshold: number
  alertThreshold: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface SpendingAlert {
  id: string
  organizationId: string
  budgetId: string | null
  category: CostCategory | 'total'
  level: AlertLevel
  threshold: number
  spent: number
  limitAmount: number
  currency: string
  notified: boolean
  createdAt: string
}

export interface CostSummaryCategory {
  category: CostCategory | 'total'
  cost: number
}

export interface CostSummary {
  currency: string
  totalCost: number
  periodStart: string | null
  periodEnd: string | null
  byCategory: CostSummaryCategory[]
}

export interface BudgetStatus {
  budget: Budget
  spent: number
  remaining: number
  utilization: number
  status: 'ok' | 'warning' | 'exceeded'
  periodStart: string
  periodEnd: string
}

export interface CostDashboard {
  currency: string
  summary: CostSummary
  budgets: BudgetStatus[]
  recentAlerts: SpendingAlert[]
  usage: Array<{
    recordDate: string
    aiMinutes: number
    telephonyMinutes: number
    callsCount: number
    cost: number
  }>
}

// =============================================
// Database Backup & Restore (Phase 6.4)
// =============================================

export type BackupType = 'full' | 'schema' | 'data' | 'incremental'
export type BackupStatus = 'pending' | 'running' | 'completed' | 'failed' | 'restoring'

export interface BackupRecord {
  id: string
  organizationId: string
  type: BackupType
  status: BackupStatus
  sizeBytes: number | null
  path: string | null
  startedAt: string | null
  completedAt: string | null
  error: string | null
  createdAt: string
  updatedAt: string
}

// =============================================
// Load Testing & Performance Baseline (Phase 6.5)
// =============================================

export interface PerformanceBaseline {
  id: string
  organizationId: string
  name: string
  endpoint: string
  method: string
  p50Ms: number
  p95Ms: number
  p99Ms: number
  maxConcurrent: number | null
  createdAt: string
  updatedAt: string
}

// =============================================
// Auto Scaling & Performance (Phase 6.6)
// =============================================

export interface AutoScalingConfig {
  id: string
  organizationId: string
  minReplicas: number
  maxReplicas: number
  targetCpuPercent: number
  targetMemoryPercent: number
  scaleUpCooldownSeconds: number
  scaleDownCooldownSeconds: number
  createdAt: string
  updatedAt: string
}

export interface ScalingMetric {
  id: string
  organizationId: string
  replicas: number
  cpuPercent: number
  memoryPercent: number
  requestsPerSecond: number
  recordedAt: string
}

export interface Region {
  id: string
  code: string
  name: string
  location: string
  provider: string
  status: string
  isPrimary: boolean
  createdAt: string
  updatedAt: string
}

export interface OrganizationRegion {
  id: string
  organizationId: string
  primaryRegionId: string
  secondaryRegionId: string | null
  failoverEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface RegionHealth {
  region: string
  latency: number
  replicationDelay: number
  status: string
  failoverReady: boolean
}

export interface QueueStats {
  name: string
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
}

export interface FeatureFlag {
  id: string
  name: string
  description: string
  environment: 'development' | 'staging' | 'production'
  organizationId: string | null
  rolloutPercentage: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface FeatureFlagFilter {
  environment?: string
  status?: 'enabled' | 'disabled'
  organizationId?: string
  search?: string
}

export interface AIAgent {
  id: string
  organizationId: string
  name: string
  description: string | null
  systemPrompt: string
  llmProvider: 'openai' | 'anthropic' | 'local'
  llmModel: string
  ttsProvider: string
  ttsVoiceId: string
  sttProvider: string
  sttModel: string
  temperature: number
  maxTokens: number
  stopSequences: string[]
  metadata: Record<string, unknown>
  status: 'active' | 'inactive' | 'testing'
  lastTestedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AIAgentInput {
  name: string
  description?: string | null
  systemPrompt: string
  llmProvider: 'openai' | 'anthropic' | 'local'
  llmModel: string
  ttsProvider: string
  ttsVoiceId: string
  sttProvider: string
  sttModel: string
  temperature?: number
  maxTokens?: number
  stopSequences?: string[]
  metadata?: Record<string, unknown>
  status?: 'active' | 'inactive' | 'testing'
}

export interface AIAgentFilter {
  search?: string
  status?: string
}

export * from './zod'

