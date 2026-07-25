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
  | 'paused'
  | 'transferred'

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

export interface CallSession {
  id: string
  callId: string
  organizationId: string
  agentId: string | null
  contactId: string | null
  status: 'active' | 'held' | 'transferred' | 'ended'
  holdReason: string | null
  transferredToAgentId: string | null
  startedAt: string
  endedAt: string | null
  createdAt: string
  updatedAt: string
}

export type CallEventType =
  | 'start'
  | 'end'
  | 'pause'
  | 'resume'
  | 'transfer'
  | 'mute'
  | 'unmute'
  | 'hold'
  | 'unhold'
  | 'dial'
  | 'ring'
  | 'answer'
  | 'hangup'
  | 'failed'
  | 'no_answer'
  | 'busy'

export interface CallEvent {
  id: string
  callId: string
  organizationId: string
  eventType: CallEventType
  payload: Record<string, unknown>
  createdBy: string | null
  createdAt: string
}

export interface CallMetric {
  id: string
  callId: string
  organizationId: string
  latencyMs: number | null
  jitterMs: number | null
  packetLoss: number | null
  audioQualityScore: number | null
  sttConfidenceAvg: number | null
  ttsLatencyMs: number | null
  aiResponseTimeMs: number | null
  talkRatioCustomer: number | null
  talkRatioAgent: number | null
  silenceSeconds: number | null
  recordedAt: string
  createdAt: string
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

export interface ContactSegment {
  id: string
  organizationId: string
  name: string
  description: string | null
  contactCount: number
  filters: Record<string, unknown>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CsvImportJob {
  id: string
  organizationId: string
  contactListId: string | null
  contactListName: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  totalRows: number
  validRows: number
  inserted: number
  duplicatesSkipped: number
  errors: number
  errorSamples: Array<{ row: number; message: string }>
  progressPercent: number
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface DuplicateContactRecord {
  id: string
  organizationId: string
  importJobId: string | null
  contactId: string
  duplicateOfPhone: string
  duplicateContactId: string | null
  status: 'detected' | 'reviewed' | 'merged' | 'ignored'
  resolvedAt: string | null
  createdAt: string
}

export interface ContactManagementDashboardStats {
  totalContacts: number
  activeLists: number
  importedToday: number
  duplicateContacts: number
  importSuccessRate: number
  activeSegments: number
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
  organizationId: string
  name: string
  keyPrefix: string
  status: ApiKeyStatus
  permissions: string
  scopes: string[]
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

export interface Plan {
  id: string
  organizationId: string
  name: string
  slug: string
  description: string | null
  priceMonthly: number
  priceYearly: number
  currency: string
  limits: Record<string, unknown>
  features: Array<Record<string, unknown>>
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface Coupon {
  id: string
  organizationId: string
  code: string
  description: string | null
  discountType: 'percentage' | 'fixed' | 'free_trial'
  discountValue: number
  currency: string
  maxRedemptions: number | null
  redeemedCount: number
  validFrom: string | null
  validUntil: string | null
  appliesToPlan: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Credit {
  id: string
  organizationId: string
  amount: number
  currency: string
  reason: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  organizationId: string
  type: 'payment' | 'refund' | 'credit' | 'debit' | 'adjustment'
  amount: number
  currency: string
  invoiceId: string | null
  paymentId: string | null
  creditId: string | null
  description: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface BillingSettings {
  id: string
  organizationId: string
  autoRecharge: boolean
  autoRechargeThreshold: number | null
  autoRechargeAmount: number | null
  currency: string
  billingEmail: string | null
  companyName: string | null
  taxId: string | null
  address: Record<string, unknown>
  notificationPreferences: Record<string, unknown>
  createdAt: string
  updatedAt: string
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

export type NotificationType = 'email' | 'sms' | 'push' | 'in-app' | 'slack' | 'discord' | 'teams'
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

export interface NotificationChannelConfig {
  id: string
  organizationId: string
  name: string
  type: NotificationType
  config: Record<string, unknown>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface NotificationTemplate {
  id: string
  organizationId: string
  channelId: string
  name: string
  subject: string | null
  body: string
  variables: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface NotificationLog {
  id: string
  organizationId: string
  channelId: string
  templateId: string | null
  recipient: string
  subject: string | null
  body: string
  status: 'pending' | 'sent' | 'failed' | 'delivered' | 'bounced'
  providerMessageId: string | null
  errorMessage: string | null
  sentAt: string | null
  deliveredAt: string | null
  openedAt: string | null
  clickedAt: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// =============================================
// OAuth
// =============================================

export interface OAuthConnection {
  id: string
  organizationId: string
  userId: string | null
  provider: string
  providerUserId: string
  accessToken: string | null
  refreshToken: string | null
  expiresAt: string | null
  scope: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
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

export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'openrouter' | 'ollama'

export interface LLMProviderConfig {
  id: string
  organizationId: string
  name: string
  provider: LLMProvider
  apiKeyEncrypted?: string | null
  apiBaseUrl?: string | null
  defaultModel: string
  temperature: number
  maxTokens: number
  topP?: number | null
  frequencyPenalty?: number | null
  presencePenalty?: number | null
  stopSequences: string[]
  metadata: Record<string, unknown>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface LLMProviderInput {
  name: string
  provider: LLMProvider
  apiKey?: string | null
  apiBaseUrl?: string | null
  defaultModel: string
  temperature?: number
  maxTokens?: number
  topP?: number | null
  frequencyPenalty?: number | null
  presencePenalty?: number | null
  stopSequences?: string[]
  metadata?: Record<string, unknown>
}

export interface PromptTemplate {
  id: string
  organizationId: string
  name: string
  description: string | null
  systemPrompt: string
  userPromptTemplate: string | null
  variables: string[]
  tags: string[]
  version: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PromptTemplateInput {
  name: string
  description?: string | null
  systemPrompt: string
  userPromptTemplate?: string | null
  variables?: string[]
  tags?: string[]
}

export type ConversationStatus = 'active' | 'ended' | 'failed' | 'transferred'

export interface ConversationIntent {
  name: string
  confidence: number
}

export interface AIConversation {
  id: string
  organizationId: string
  agentId: string | null
  campaignId: string | null
  callId: string | null
  contactId: string | null
  provider: LLMProvider
  model: string
  intent: string | null
  sentiment: 'positive' | 'neutral' | 'negative' | null
  status: ConversationStatus
  startedAt: string
  endedAt: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ConversationMessage {
  id: string
  conversationId: string
  organizationId: string
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  intent: string | null
  sentiment: 'positive' | 'neutral' | 'negative' | null
  confidence: number | null
  tokensUsed: number | null
  latencyMs: number | null
  provider: string | null
  model: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface AIMemory {
  id: string
  organizationId: string
  contactId: string | null
  agentId: string | null
  conversationId: string | null
  memoryType: 'summary' | 'fact' | 'preference' | 'intent' | 'sentiment_history'
  content: string
  importanceScore: number
  expiresAt: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface LLMUsage {
  id: string
  organizationId: string
  conversationId: string | null
  messageId: string | null
  provider: string
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  latencyMs: number | null
  cost: number | null
  currency: string
  recordedAt: string
  createdAt: string
}

export interface ConversationSummary {
  active: number
  avgResponseTime: number
  tokenUsage: number
  dailyCost: number
  successRate: number
  aiSatisfaction: number
}

export interface ConversationDashboard {
  summary: ConversationSummary
  conversations: AIConversation[]
  total: number
}

// =============================================
// Live Call Monitoring (Phase 7.6)
// =============================================

export interface LiveDashboardStats {
  activeCalls: number
  waitingCalls: number
  connectedAgents: number
  avgCallDuration: number
  callsToday: number
  queueHealth: number
  successRate: number
  totalAgents: number
}

export interface ActiveCall {
  id: string
  organizationId: string
  callId: string
  agentId: string | null
  contactId: string | null
  campaignId: string | null
  callQueueId: string | null
  direction: 'outbound' | 'inbound'
  status: CallStatus
  toNumber: string
  fromNumber: string
  durationSeconds: number
  startedAt: string | null
  answeredAt: string | null
  createdAt: string
  updatedAt: string
}

export interface LiveEvent {
  id: string
  organizationId: string
  callId: string | null
  agentId: string | null
  eventType: string
  payload: Record<string, unknown>
  severity: string
  createdAt: string
}

export interface AgentSession {
  id: string
  organizationId: string
  agentId: string
  status: string
  currentCallId: string | null
  activeCallsCount: number
  completedCallsCount: number
  failedCallsCount: number
  totalTalkSeconds: number
  lastActivityAt: string | null
  createdAt: string
  updatedAt: string
}

export interface LiveMetric {
  id: string
  organizationId: string
  metricType: string
  value: number
  metadata: Record<string, unknown>
  recordedAt: string
  createdAt: string
}

export interface QueueMetric {
  id: string
  organizationId: string
  callQueueId: string | null
  queueName: string
  waitingCount: number
  activeCount: number
  completedCount: number
  abandonedCount: number
  avgWaitSeconds: number
  maxWaitSeconds: number
  recordedAt: string
  createdAt: string
}

export interface QueueOverview {
  queues: Array<{
    id: string | null
    name: string
    waiting: number
    active: number
    completed: number
    abandoned: number
    avgWaitSeconds: number
    maxWaitSeconds: number
    updatedAt: string
  }>
  summary: {
    totalQueues: number
    totalWaiting: number
    totalActive: number
    totalAbandoned: number
    avgWaitSeconds: number
  }
}

export interface AgentOverview {
  agents: Array<{
    id: string
    status: string
    activeCalls: number
    completedCalls: number
    failedCalls: number
    totalTalkSeconds: number
    utilization: number
    lastActivityAt: string | null
    currentCallId: string | null
  }>
  summary: {
    total: number
    busy: number
    idle: number
    offline: number
    avgUtilization: number
  }
}

export * from './zod'

