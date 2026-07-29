import {
  Organization,
  OrganizationSettings,
  OrganizationUser,
  ApiKey,
  Paginated,
  Campaign,
  CampaignSummary,
  ContactList,
  Contact,
  ContactSegment,
  DuplicateContactRecord,
  ContactManagementDashboardStats,
  Call,
  CsvImportResult,
  BillingDashboard,
  Invoice,
  UsageRecord,
  Subscription,
  Plan,
  Coupon,
  Credit,
  Transaction,
  BillingSettings,
  Webhook,
  WebhookDelivery,
  Integration,
  IntegrationProvider,
  Notification,
  NotificationPreferences,
  AuditLog,
  ConsentRecord,
  DndEntry,
  RetentionPolicy,
  DataExportRequest,
  DataDeletionRequest,
  ComplianceStatus,
  AuditSummary,
  ObservabilitySnapshot,
  CostDashboard,
  CostSummary,
  CostRecord,
  Budget,
  BudgetStatus,
  SpendingAlert,
  BackupRecord,
  PerformanceBaseline,
  AutoScalingConfig,
  ScalingMetric,
  Region,
  OrganizationRegion,
  RegionHealth,
  QueueStats,
  FeatureFlag,
  AIAgent,
  AIAgentInput,
  AIConversation,
  ConversationMessage,
  ConversationSummary,
  LLMProviderConfig,
  LLMProviderInput,
  PromptTemplate,
  AIMemory,
  LLMUsage,
  AICallSummary,
  AgentAssistSuggestion,
  CallSentiment,
  CallIntent,
  AICallMetrics,
  LiveDashboardStats,
  ActiveCall,
  LiveEvent,
  QueueOverview,
  AgentOverview,
  NotificationChannelConfig,
  NotificationTemplate,
  NotificationLog,
  OAuthConnection,
  AuditCategory,
  CompliancePolicy,
  AccessReview,
  SecurityIncident,
  SystemHealthCheck,
  AlertRule,
  AlertHistory,
  Deployment,
  VoiceProvider,
  VoiceProviderInput,
  ProviderCredential,
  VoiceModel,
} from '@rds/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

class ApiClient {
  private async fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_URL}${path}`
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    }

    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    })

    if (!res.ok) {
      let message = 'An error occurred'
      try {
        const errorData = await res.json()
        message = errorData.error || message
        if (Array.isArray(errorData.error)) {
          message = errorData.error.map((e: any) => e.message || JSON.stringify(e)).join(', ')
        }
      } catch {
        // Fallback to text status
      }
      throw new Error(message)
    }

    if (res.status === 204) {
      return {} as T
    }

    return res.json()
  }

  // Organization calls
  async getOrganizations(): Promise<Organization[]> {
    return this.fetchJson<Organization[]>('/api/organizations')
  }

  async getOrganization(id: string): Promise<Organization> {
    return this.fetchJson<Organization>(`/api/organizations/${id}`)
  }

  async createOrganization(org: {
    name: string
    slug: string
    plan?: 'starter' | 'growth' | 'enterprise'
    timezone?: string
    locale?: string
  }): Promise<{ organization: Organization; settings: OrganizationSettings }> {
    return this.fetchJson<{ organization: Organization; settings: OrganizationSettings }>('/api/organizations', {
      method: 'POST',
      body: JSON.stringify(org),
    })
  }

  async updateOrganization(
    id: string,
    org: {
      name?: string
      slug?: string
      plan?: 'starter' | 'growth' | 'enterprise'
      status?: 'active' | 'suspended' | 'trial'
      timezone?: string
      locale?: string
      branding?: Record<string, unknown>
      metadata?: Record<string, unknown>
    }
  ): Promise<Organization> {
    return this.fetchJson<Organization>(`/api/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(org),
    })
  }

  async softDeleteOrganization(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/organizations/${id}`, {
      method: 'DELETE',
    })
  }

  async getOrganizationSettings(id: string): Promise<OrganizationSettings> {
    return this.fetchJson<OrganizationSettings>(`/api/organizations/${id}/settings`)
  }

  async updateOrganizationSettings(id: string, settings: Partial<OrganizationSettings>): Promise<OrganizationSettings> {
    // Map settings object camelCase fields to backend snake_case format
    const payload = {
      max_concurrent_calls: settings.maxConcurrentCalls,
      max_agents: settings.maxAgents,
      call_recording_enabled: settings.callRecordingEnabled,
      ai_tts_voice_id: settings.aiTtsVoiceId,
      ai_stt_provider: settings.aiSttProvider,
      default_caller_id: settings.defaultCallerId,
      ai_greeting: settings.aiGreeting,
      ai_fallback_message: settings.aiFallbackMessage,
      compliance_dnd_check: settings.complianceDndCheck,
      compliance_consent_required: settings.complianceConsentRequired,
    }

    // Filter out undefined values
    const cleanedPayload = Object.fromEntries(
      Object.entries(payload).filter(([_, v]) => v !== undefined)
    )

    return this.fetchJson<OrganizationSettings>(`/api/organizations/${id}/settings`, {
      method: 'PUT',
      body: JSON.stringify(cleanedPayload),
    })
  }

  async uploadOrganizationLogo(id: string, base64Logo: string): Promise<Organization> {
    return this.fetchJson<Organization>(`/api/organizations/${id}/logo`, {
      method: 'POST',
      body: JSON.stringify({ logo: base64Logo }),
    })
  }

  // Onboarding
  async onboardOrganization(input: {
    name: string
    slug: string
    plan?: 'starter' | 'growth' | 'enterprise'
    timezone?: string
    locale?: string
    description?: string
  }): Promise<{ organization: Organization; settings: OrganizationSettings }> {
    return this.fetchJson<{ organization: Organization; settings: OrganizationSettings }>('/api/organizations/onboard', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  // Users
  async listUsers(
    orgId: string,
    options: { search?: string; page?: number; pageSize?: number } = {}
  ): Promise<Paginated<OrganizationUser>> {
    const params = new URLSearchParams()
    if (options.search) params.set('search', options.search)
    if (options.page) params.set('page', String(options.page))
    if (options.pageSize) params.set('pageSize', String(options.pageSize))
    const qs = params.toString()
    return this.fetchJson<Paginated<OrganizationUser>>(
      `/api/organizations/${orgId}/users${qs ? `?${qs}` : ''}`
    )
  }

  async inviteUser(
    orgId: string,
    user: { email: string; fullName: string; role: 'super_admin' | 'org_admin' | 'agent' | 'viewer' }
  ): Promise<{ user: OrganizationUser }> {
    return this.fetchJson<{ user: OrganizationUser }>(`/api/organizations/${orgId}/users`, {
      method: 'POST',
      body: JSON.stringify(user),
    })
  }

  async updateUser(
    orgId: string,
    userId: string,
    user: {
      fullName?: string
      status?: 'active' | 'invited' | 'suspended'
      role?: 'super_admin' | 'org_admin' | 'agent' | 'viewer'
    }
  ): Promise<{ user: OrganizationUser }> {
    return this.fetchJson<{ user: OrganizationUser }>(`/api/organizations/${orgId}/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    })
  }

  async deleteUser(orgId: string, userId: string): Promise<void> {
    await this.fetchJson<void>(`/api/organizations/${orgId}/users/${userId}`, {
      method: 'DELETE',
    })
  }

  // API Keys
  async listApiKeys(orgId: string): Promise<{ keys: ApiKey[] }> {
    return this.fetchJson<{ keys: ApiKey[] }>(`/api/organizations/${orgId}/api-keys`)
  }

  async createApiKey(
    orgId: string,
    name: string
  ): Promise<{ id: string; name: string; key: string; keyPrefix: string; createdAt: string }> {
    return this.fetchJson<{ id: string; name: string; key: string; keyPrefix: string; createdAt: string }>(
      `/api/organizations/${orgId}/api-keys`,
      {
        method: 'POST',
        body: JSON.stringify({ name }),
      }
    )
  }

  async revokeApiKey(orgId: string, keyId: string): Promise<void> {
    await this.fetchJson<void>(`/api/organizations/${orgId}/api-keys/${keyId}`, {
      method: 'DELETE',
    })
  }

  // ============================================
  // Campaigns
  // ============================================
  async listCampaigns(
    options: { search?: string; status?: string; page?: number; pageSize?: number } = {}
  ): Promise<Paginated<CampaignSummary>> {
    const params = new URLSearchParams()
    if (options.search) params.set('search', options.search)
    if (options.status) params.set('status', options.status)
    if (options.page) params.set('page', String(options.page))
    if (options.pageSize) params.set('pageSize', String(options.pageSize))
    const qs = params.toString()
    return this.fetchJson<Paginated<CampaignSummary>>(`/api/campaigns${qs ? `?${qs}` : ''}`)
  }

  async getCampaign(id: string): Promise<{ campaign: Campaign }> {
    return this.fetchJson<{ campaign: Campaign }>(`/api/campaigns/${id}`)
  }

  async createCampaign(input: {
    name: string
    description?: string | null
    type?: 'outbound' | 'inbound'
    direction?: 'outbound' | 'inbound'
    aiAgentId?: string | null
    aiScriptId?: string | null
    voiceProfileId?: string | null
    fromNumberId?: string | null
    contactListId?: string | null
    schedule?: Record<string, unknown>
    retryPolicy?: Record<string, unknown>
    dialingStrategy?: 'progressive' | 'predictive' | 'power' | null
    maxConcurrent?: number | null
    script?: string
    voice?: string
  }): Promise<{ campaign: Campaign }> {
    return this.fetchJson<{ campaign: Campaign }>('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updateCampaign(
    id: string,
    input: Partial<{
      name: string
      description: string | null
      type: 'outbound' | 'inbound'
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
      script: string
      voice: string
      status: 'draft' | 'scheduled' | 'running' | 'paused' | 'ended'
    }>
  ): Promise<{ campaign: Campaign }> {
    return this.fetchJson<{ campaign: Campaign }>(`/api/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async setCampaignStatus(
    id: string,
    status: 'draft' | 'scheduled' | 'running' | 'paused' | 'ended'
  ): Promise<{ campaign: Campaign }> {
    return this.fetchJson<{ campaign: Campaign }>(`/api/campaigns/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  }

  async deleteCampaign(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/campaigns/${id}`, { method: 'DELETE' })
  }

  async startCampaign(id: string): Promise<{ campaign: Campaign }> {
    return this.fetchJson<{ campaign: Campaign }>(`/api/campaigns/${id}/start`, { method: 'POST' })
  }

  async pauseCampaign(id: string): Promise<{ campaign: Campaign }> {
    return this.fetchJson<{ campaign: Campaign }>(`/api/campaigns/${id}/pause`, { method: 'POST' })
  }

  async resumeCampaign(id: string): Promise<{ campaign: Campaign }> {
    return this.fetchJson<{ campaign: Campaign }>(`/api/campaigns/${id}/resume`, { method: 'POST' })
  }

  async stopCampaign(id: string): Promise<{ campaign: Campaign }> {
    return this.fetchJson<{ campaign: Campaign }>(`/api/campaigns/${id}/stop`, { method: 'POST' })
  }

  async duplicateCampaign(id: string): Promise<{ campaign: Campaign }> {
    return this.fetchJson<{ campaign: Campaign }>(`/api/campaigns/${id}/duplicate`, { method: 'POST' })
  }

  // ============================================
  // Contact Lists
  // ============================================
  async listContactLists(): Promise<{ lists: ContactList[] }> {
    return this.fetchJson<{ lists: ContactList[] }>('/api/contact-lists')
  }

  async getContactList(id: string): Promise<{ list: ContactList }> {
    return this.fetchJson<{ list: ContactList }>(`/api/contact-lists/${id}`)
  }

  async createContactList(input: {
    name: string
    description?: string | null
    tags?: string[]
  }): Promise<{ list: ContactList }> {
    return this.fetchJson<{ list: ContactList }>('/api/contact-lists', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updateContactList(
    id: string,
    input: { name?: string; description?: string | null; tags?: string[] }
  ): Promise<{ list: ContactList }> {
    return this.fetchJson<{ list: ContactList }>(`/api/contact-lists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async deleteContactList(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/contact-lists/${id}`, { method: 'DELETE' })
  }

  // ============================================
  // Contacts
  // ============================================
  async listContacts(
    options: { search?: string; contactListId?: string; page?: number; pageSize?: number } = {}
  ): Promise<Paginated<Contact>> {
    const params = new URLSearchParams()
    if (options.search) params.set('search', options.search)
    if (options.contactListId) params.set('contactListId', options.contactListId)
    if (options.page) params.set('page', String(options.page))
    if (options.pageSize) params.set('pageSize', String(options.pageSize))
    const qs = params.toString()
    return this.fetchJson<Paginated<Contact>>(`/api/contacts${qs ? `?${qs}` : ''}`)
  }

  async getContact(id: string): Promise<{ contact: Contact }> {
    return this.fetchJson<{ contact: Contact }>(`/api/contacts/${id}`)
  }

  async createContact(input: {
    contactListId?: string | null
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    phone: string
    country?: string | null
    timezone?: string | null
    tags?: string[]
    dndStatus?: boolean
    source?: string | null
  }): Promise<{ contact: Contact }> {
    return this.fetchJson<{ contact: Contact }>('/api/contacts', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updateContact(
    id: string,
    input: Partial<{
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
    }>
  ): Promise<{ contact: Contact }> {
    return this.fetchJson<{ contact: Contact }>(`/api/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async deleteContact(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/contacts/${id}`, { method: 'DELETE' })
  }

  async bulkDeleteContacts(ids: string[]): Promise<{ deleted: number }> {
    return this.fetchJson<{ deleted: number }>('/api/contacts/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
  }

  async bulkUpdateContacts(
    ids: string[],
    data: { contactListId?: string | null; tags?: string[]; dndStatus?: boolean }
  ): Promise<{ updated: number }> {
    return this.fetchJson<{ updated: number }>('/api/contacts/bulk-update', {
      method: 'POST',
      body: JSON.stringify({ ids, data }),
    })
  }

  async importContactsCsv(input: {
    csv: string
    contactListId?: string | null
    skipDuplicates?: boolean
  }): Promise<CsvImportResult> {
    return this.fetchJson<CsvImportResult>('/api/contacts/import', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  // ============================================
  // Calls
  // ============================================
  async listCalls(
    options: {
      search?: string
      status?: string
      campaignId?: string
      direction?: 'outbound' | 'inbound'
      contactId?: string
      dateFrom?: string
      dateTo?: string
      page?: number
      pageSize?: number
    } = {}
  ): Promise<Paginated<Call>> {
    const params = new URLSearchParams()
    if (options.search) params.set('search', options.search)
    if (options.status) params.set('status', options.status)
    if (options.campaignId) params.set('campaignId', options.campaignId)
    if (options.direction) params.set('direction', options.direction)
    if (options.contactId) params.set('contactId', options.contactId)
    if (options.dateFrom) params.set('dateFrom', options.dateFrom)
    if (options.dateTo) params.set('dateTo', options.dateTo)
    if (options.page) params.set('page', String(options.page))
    if (options.pageSize) params.set('pageSize', String(options.pageSize))
    const qs = params.toString()
    return this.fetchJson<Paginated<Call>>(`/api/calls${qs ? `?${qs}` : ''}`)
  }

  async getCall(id: string): Promise<{ call: Call }> {
    return this.fetchJson<{ call: Call }>(`/api/calls/${id}`)
  }

  async getActiveCalls(): Promise<{ calls: Call[] }> {
    return this.fetchJson<{ calls: Call[] }>('/api/calls/active')
  }

  async startCall(input: {
    campaignId?: string | null
    contactId?: string | null
    agentId?: string | null
    toNumber: string
    fromNumber: string
    direction?: 'outbound' | 'inbound'
    fromNumberId?: string | null
    callQueueId?: string | null
    metadata?: Record<string, unknown>
  }): Promise<{ call: Call }> {
    return this.fetchJson<{ call: Call }>('/api/calls/start', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async endCall(id: string): Promise<{ call: Call }> {
    return this.fetchJson<{ call: Call }>(`/api/calls/${id}/end`, { method: 'POST' })
  }

  async pauseCall(id: string): Promise<{ call: Call }> {
    return this.fetchJson<{ call: Call }>(`/api/calls/${id}/pause`, { method: 'POST' })
  }

  async resumeCall(id: string): Promise<{ call: Call }> {
    return this.fetchJson<{ call: Call }>(`/api/calls/${id}/resume`, { method: 'POST' })
  }

  async transferCall(id: string, toAgentId: string): Promise<{ call: Call }> {
    return this.fetchJson<{ call: Call }>(`/api/calls/${id}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ toAgentId }),
    })
  }

  async getCallTranscript(id: string): Promise<{ transcript: Array<{ sequence: number; channel: string; text: string; confidence: number | null; isFinal: boolean }> }> {
    return this.fetchJson(`/api/calls/${id}/transcript`)
  }

  async getCallEvents(id: string): Promise<{ events: Array<{ id: string; callId: string; organizationId: string; eventType: string; payload: Record<string, unknown>; createdBy: string | null; createdAt: string }> }> {
    return this.fetchJson(`/api/calls/${id}/events`)
  }

  // ============================================
  // Billing
  // ============================================
  async getBillingDashboard(): Promise<BillingDashboard> {
    return this.fetchJson<BillingDashboard>('/api/billing')
  }

  async listInvoices(
    options: { status?: string; page?: number; pageSize?: number } = {}
  ): Promise<Paginated<Invoice>> {
    const params = new URLSearchParams()
    if (options.status) params.set('status', options.status)
    if (options.page) params.set('page', String(options.page))
    if (options.pageSize) params.set('pageSize', String(options.pageSize))
    const qs = params.toString()
    return this.fetchJson<Paginated<Invoice>>(`/api/billing/invoices${qs ? `?${qs}` : ''}`)
  }

  async getInvoice(id: string): Promise<{ invoice: Invoice }> {
    return this.fetchJson<{ invoice: Invoice }>(`/api/billing/invoices/${id}`)
  }

  async listUsage(
    options: { dateFrom?: string; dateTo?: string; page?: number; pageSize?: number } = {}
  ): Promise<Paginated<UsageRecord>> {
    const params = new URLSearchParams()
    if (options.dateFrom) params.set('dateFrom', options.dateFrom)
    if (options.dateTo) params.set('dateTo', options.dateTo)
    if (options.page) params.set('page', String(options.page))
    if (options.pageSize) params.set('pageSize', String(options.pageSize))
    const qs = params.toString()
    return this.fetchJson<Paginated<UsageRecord>>(`/api/billing/usage${qs ? `?${qs}` : ''}`)
  }

  // ============================================
  // Subscriptions
  // ============================================
  async listSubscriptions(): Promise<{ subscriptions: Subscription[]; current: Subscription | null }> {
    return this.fetchJson<{ subscriptions: Subscription[]; current: Subscription | null }>('/api/subscriptions')
  }

  async getCurrentSubscription(): Promise<{ subscription: Subscription | null }> {
    return this.fetchJson<{ subscription: Subscription | null }>('/api/subscriptions/current')
  }

  async createSubscription(input: {
    plan: 'starter' | 'growth' | 'enterprise'
    status?: 'active' | 'trialing' | 'past_due' | 'canceled'
    currentPeriodStart?: string
    currentPeriodEnd?: string
    trialEndsAt?: string | null
    metadata?: Record<string, unknown>
  }): Promise<{ subscription: Subscription }> {
    return this.fetchJson<{ subscription: Subscription }>('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updateSubscription(
    id: string,
    input: Partial<{
      plan: 'starter' | 'growth' | 'enterprise'
      status: 'active' | 'trialing' | 'past_due' | 'canceled'
      currentPeriodStart: string
      currentPeriodEnd: string
      trialEndsAt: string | null
      metadata: Record<string, unknown>
    }>
  ): Promise<{ subscription: Subscription }> {
    return this.fetchJson<{ subscription: Subscription }>(`/api/subscriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async cancelSubscription(id: string): Promise<{ subscription: Subscription }> {
    return this.fetchJson<{ subscription: Subscription }>(`/api/subscriptions/${id}/cancel`, {
      method: 'POST',
    })
  }

  async reactivateSubscription(id: string): Promise<{ subscription: Subscription }> {
    return this.fetchJson<{ subscription: Subscription }>(`/api/subscriptions/${id}/reactivate`, {
      method: 'POST',
    })
  }

  async deleteSubscription(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/subscriptions/${id}`, { method: 'DELETE' })
  }

  // ============================================
  // Billing Center
  // ============================================
  async getBillingCenterDashboard(): Promise<BillingDashboard> {
    return this.fetchJson<BillingDashboard>('/api/billing-center')
  }

  async listBillingCenterInvoices(options: { status?: string; page?: number; pageSize?: number } = {}): Promise<Paginated<Invoice>> {
    const params = new URLSearchParams()
    if (options.status) params.set('status', options.status)
    if (options.page) params.set('page', String(options.page))
    if (options.pageSize) params.set('pageSize', String(options.pageSize))
    const qs = params.toString()
    return this.fetchJson<Paginated<Invoice>>(`/api/billing-center/invoices${qs ? `?${qs}` : ''}`)
  }

  async getBillingCenterInvoice(id: string): Promise<{ invoice: Invoice }> {
    return this.fetchJson<{ invoice: Invoice }>(`/api/billing-center/invoices/${id}`)
  }

  async markBillingInvoicePaid(id: string): Promise<{ invoice: Invoice }> {
    return this.fetchJson<{ invoice: Invoice }>(`/api/billing-center/invoices/${id}/mark-paid`, { method: 'POST' })
  }

  async markBillingInvoiceVoid(id: string): Promise<{ invoice: Invoice }> {
    return this.fetchJson<{ invoice: Invoice }>(`/api/billing-center/invoices/${id}/void`, { method: 'POST' })
  }

  async listBillingCenterUsage(options: { dateFrom?: string; dateTo?: string; page?: number; pageSize?: number } = {}): Promise<Paginated<UsageRecord>> {
    const params = new URLSearchParams()
    if (options.dateFrom) params.set('dateFrom', options.dateFrom)
    if (options.dateTo) params.set('dateTo', options.dateTo)
    if (options.page) params.set('page', String(options.page))
    if (options.pageSize) params.set('pageSize', String(options.pageSize))
    const qs = params.toString()
    return this.fetchJson<Paginated<UsageRecord>>(`/api/billing-center/usage${qs ? `?${qs}` : ''}`)
  }

  async meterUsage(input: { aiMinutes?: number; telephonyMinutes?: number; callsCount?: number; storageBytes?: number; sttMinutes?: number; ttsCharacters?: number }): Promise<void> {
    await this.fetchJson<void>('/api/billing-center/meter', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async listBillingCenterSubscriptions(): Promise<{ subscriptions: Subscription[]; current: Subscription | null }> {
    return this.fetchJson<{ subscriptions: Subscription[]; current: Subscription | null }>('/api/billing-center/subscriptions')
  }

  async getBillingCenterCurrentSubscription(): Promise<{ subscription: Subscription | null }> {
    return this.fetchJson<{ subscription: Subscription | null }>('/api/billing-center/subscriptions/current')
  }

  async createBillingCenterSubscription(input: { plan: string; status?: string; currentPeriodStart?: string; currentPeriodEnd?: string; trialEndsAt?: string | null; metadata?: Record<string, unknown> }): Promise<{ subscription: Subscription }> {
    return this.fetchJson<{ subscription: Subscription }>('/api/billing-center/subscriptions', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updateBillingCenterSubscription(id: string, input: Record<string, unknown>): Promise<{ subscription: Subscription }> {
    return this.fetchJson<{ subscription: Subscription }>(`/api/billing-center/subscriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async cancelBillingCenterSubscription(id: string): Promise<{ subscription: Subscription }> {
    return this.fetchJson<{ subscription: Subscription }>(`/api/billing-center/subscriptions/${id}/cancel`, { method: 'POST' })
  }

  async reactivateBillingCenterSubscription(id: string): Promise<{ subscription: Subscription }> {
    return this.fetchJson<{ subscription: Subscription }>(`/api/billing-center/subscriptions/${id}/reactivate`, { method: 'POST' })
  }

  async deleteBillingCenterSubscription(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/billing-center/subscriptions/${id}`, { method: 'DELETE' })
  }

  // ============================================
  // Webhooks
  // ============================================
  async listWebhooks(): Promise<{ webhooks: Webhook[] }> {
    return this.fetchJson<{ webhooks: Webhook[] }>('/api/webhooks')
  }

  async getWebhookEvents(): Promise<{ events: string[] }> {
    return this.fetchJson<{ events: string[] }>('/api/webhooks/events')
  }

  async createWebhook(input: {
    url: string
    events: string[]
    isActive?: boolean
  }): Promise<{ webhook: Webhook }> {
    return this.fetchJson<{ webhook: Webhook }>('/api/webhooks', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updateWebhook(
    id: string,
    input: { url?: string; events?: string[]; isActive?: boolean }
  ): Promise<{ webhook: Webhook }> {
    return this.fetchJson<{ webhook: Webhook }>(`/api/webhooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async deleteWebhook(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/webhooks/${id}`, { method: 'DELETE' })
  }

  async listWebhookDeliveries(
    id: string,
    options: { page?: number; pageSize?: number } = {}
  ): Promise<Paginated<WebhookDelivery>> {
    const params = new URLSearchParams()
    if (options.page) params.set('page', String(options.page))
    if (options.pageSize) params.set('pageSize', String(options.pageSize))
    const qs = params.toString()
    return this.fetchJson<Paginated<WebhookDelivery>>(`/api/webhooks/${id}/deliveries${qs ? `?${qs}` : ''}`)
  }

  async retryWebhookDelivery(id: string, deliveryId: string): Promise<{ delivery: WebhookDelivery }> {
    return this.fetchJson<{ delivery: WebhookDelivery }>(
      `/api/webhooks/${id}/deliveries/${deliveryId}/retry`,
      { method: 'POST' }
    )
  }

  // ============================================
  // Integrations
  // ============================================
  async listIntegrations(): Promise<{ integrations: Integration[] }> {
    return this.fetchJson<{ integrations: Integration[] }>('/api/integrations')
  }

  async listIntegrationProviders(): Promise<{ providers: IntegrationProvider[] }> {
    return this.fetchJson<{ providers: IntegrationProvider[] }>('/api/integrations/providers')
  }

  async createIntegration(input: {
    provider: string
    name?: string
    config?: Record<string, unknown>
    webhookUrl?: string | null
    status?: 'active' | 'inactive' | 'error'
  }): Promise<{ integration: Integration }> {
    return this.fetchJson<{ integration: Integration }>('/api/integrations', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updateIntegration(
    id: string,
    input: {
      name?: string
      config?: Record<string, unknown>
      webhookUrl?: string | null
      status?: 'active' | 'inactive' | 'error'
    }
  ): Promise<{ integration: Integration }> {
    return this.fetchJson<{ integration: Integration }>(`/api/integrations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async deleteIntegration(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/integrations/${id}`, { method: 'DELETE' })
  }

  // ============================================
  // Notifications
  // ============================================
  async listNotifications(
    options: { channel?: string; unreadOnly?: boolean; page?: number; pageSize?: number } = {}
  ): Promise<Paginated<Notification>> {
    const params = new URLSearchParams()
    if (options.channel) params.set('channel', options.channel)
    if (options.unreadOnly) params.set('unreadOnly', 'true')
    if (options.page) params.set('page', String(options.page))
    if (options.pageSize) params.set('pageSize', String(options.pageSize))
    const qs = params.toString()
    return this.fetchJson<Paginated<Notification>>(`/api/notifications${qs ? `?${qs}` : ''}`)
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/notifications/${id}/read`, { method: 'PATCH' })
  }

  async markAllNotificationsRead(): Promise<void> {
    await this.fetchJson<void>('/api/notifications/read-all', { method: 'POST' })
  }

  async deleteNotification(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/notifications/${id}`, { method: 'DELETE' })
  }

  async getNotificationPreferences(): Promise<{ preferences: NotificationPreferences }> {
    return this.fetchJson<{ preferences: NotificationPreferences }>('/api/notifications/preferences')
  }

  async updateNotificationPreferences(
    preferences: NotificationPreferences
  ): Promise<{ preferences: NotificationPreferences }> {
    return this.fetchJson<{ preferences: NotificationPreferences }>('/api/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    })
  }

  // ============================================
  // Audit Logs
  // ============================================
  async listAuditLogs(
    options: {
      action?: string
      actorType?: string
      resourceType?: string
      search?: string
      dateFrom?: string
      dateTo?: string
      page?: number
      pageSize?: number
    } = {}
  ): Promise<Paginated<AuditLog>> {
    const params = new URLSearchParams()
    if (options.action) params.set('action', options.action)
    if (options.actorType) params.set('actorType', options.actorType)
    if (options.resourceType) params.set('resourceType', options.resourceType)
    if (options.search) params.set('search', options.search)
    if (options.dateFrom) params.set('dateFrom', options.dateFrom)
    if (options.dateTo) params.set('dateTo', options.dateTo)
    if (options.page) params.set('page', String(options.page))
    if (options.pageSize) params.set('pageSize', String(options.pageSize))
    const qs = params.toString()
    return this.fetchJson<Paginated<AuditLog>>(`/api/audit${qs ? `?${qs}` : ''}`)
  }

  async listAuditActions(): Promise<{ actions: string[] }> {
    return this.fetchJson<{ actions: string[] }>('/api/audit/actions')
  }

  // ============================================
  // Compliance & Security (Phase 5)
  // ============================================
  async getComplianceStatus(): Promise<{ status: ComplianceStatus }> {
    return this.fetchJson<{ status: ComplianceStatus }>('/api/compliance/status')
  }

  async getDisclosureText(): Promise<{ text: string }> {
    return this.fetchJson<{ text: string }>('/api/compliance/disclosure-text')
  }

  async recordConsent(input: {
    contactId?: string | null
    campaignId?: string | null
    callId?: string | null
    consented?: boolean
    method?: 'verbal' | 'ivr' | 'keypress' | 'written' | 'automated_disclosure'
    disclosureText?: string | null
  }): Promise<{ record: ConsentRecord }> {
    return this.fetchJson<{ record: ConsentRecord }>('/api/compliance/consent', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async listConsent(contactId: string): Promise<{ records: ConsentRecord[] }> {
    return this.fetchJson<{ records: ConsentRecord[] }>(
      `/api/compliance/consent?contactId=${encodeURIComponent(contactId)}`
    )
  }

  async listDnd(
    options: { search?: string; page?: number; pageSize?: number } = {}
  ): Promise<{ entries: DndEntry[]; total: number; page: number; pageSize: number }> {
    const params = new URLSearchParams()
    if (options.search) params.set('search', options.search)
    if (options.page) params.set('page', String(options.page))
    if (options.pageSize) params.set('pageSize', String(options.pageSize))
    const qs = params.toString()
    return this.fetchJson<{ entries: DndEntry[]; total: number; page: number; pageSize: number }>(
      `/api/compliance/dnd${qs ? `?${qs}` : ''}`
    )
  }

  async checkDnd(phone: string): Promise<{ blocked: boolean }> {
    return this.fetchJson<{ blocked: boolean }>(
      `/api/compliance/dnd/check?phone=${encodeURIComponent(phone)}`
    )
  }

  async addDnd(input: { phone: string; source?: string | null; reason?: string | null }): Promise<{ entry: DndEntry }> {
    return this.fetchJson<{ entry: DndEntry }>('/api/compliance/dnd', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async removeDnd(phone: string): Promise<void> {
    await this.fetchJson<void>(`/api/compliance/dnd/${encodeURIComponent(phone)}`, { method: 'DELETE' })
  }

  async listRetentionPolicies(): Promise<{ policies: RetentionPolicy[] }> {
    return this.fetchJson<{ policies: RetentionPolicy[] }>('/api/compliance/retention')
  }

  async upsertRetentionPolicy(input: {
    resourceType: string
    retentionDays: number
    action?: 'anonymize' | 'delete'
  }): Promise<{ policy: RetentionPolicy }> {
    return this.fetchJson<{ policy: RetentionPolicy }>('/api/compliance/retention', {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async requestDataExport(): Promise<{ request: DataExportRequest }> {
    return this.fetchJson<{ request: DataExportRequest }>('/api/compliance/data-export', { method: 'POST' })
  }

  async getDataExport(id: string): Promise<{ request: DataExportRequest }> {
    return this.fetchJson<{ request: DataExportRequest }>(`/api/compliance/data-export/${id}`)
  }

  async requestDataDeletion(scope?: string | null): Promise<{ request: DataDeletionRequest }> {
    return this.fetchJson<{ request: DataDeletionRequest }>('/api/compliance/data-deletion', {
      method: 'POST',
      body: JSON.stringify({ scope }),
    })
  }

  async getDataDeletion(id: string): Promise<{ request: DataDeletionRequest }> {
    return this.fetchJson<{ request: DataDeletionRequest }>(`/api/compliance/data-deletion/${id}`)
  }

  async getAuditSummary(): Promise<{ summary: AuditSummary }> {
    return this.fetchJson<{ summary: AuditSummary }>('/api/compliance/audit-summary')
  }

  // ============================================
  // Enterprise Audit & Compliance (Phase 7.9)
  // ============================================
  async listAuditCategories(): Promise<{ categories: AuditCategory[] }> {
    return this.fetchJson<{ categories: AuditCategory[] }>('/api/audit-categories')
  }

  async getAuditCategory(id: string): Promise<{ category: AuditCategory }> {
    return this.fetchJson<{ category: AuditCategory }>(`/api/audit-categories/${id}`)
  }

  async createAuditCategory(input: { name: string; slug: string; description?: string | null; color?: string; isActive?: boolean }): Promise<{ category: AuditCategory }> {
    return this.fetchJson<{ category: AuditCategory }>('/api/audit-categories', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updateAuditCategory(id: string, input: { name?: string; slug?: string; description?: string | null; color?: string; isActive?: boolean }): Promise<{ category: AuditCategory }> {
    return this.fetchJson<{ category: AuditCategory }>(`/api/audit-categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async deleteAuditCategory(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/audit-categories/${id}`, { method: 'DELETE' })
  }

  async listCompliancePolicies(): Promise<{ policies: CompliancePolicy[] }> {
    return this.fetchJson<{ policies: CompliancePolicy[] }>('/api/compliance-policies')
  }

  async getCompliancePolicy(id: string): Promise<{ policy: CompliancePolicy }> {
    return this.fetchJson<{ policy: CompliancePolicy }>(`/api/compliance-policies/${id}`)
  }

  async createCompliancePolicy(input: { name: string; framework: string; description?: string | null; requirements?: Record<string, unknown>[]; controls?: Record<string, unknown>[]; status?: string; effectiveAt?: string | null; reviewedAt?: string | null }): Promise<{ policy: CompliancePolicy }> {
    return this.fetchJson<{ policy: CompliancePolicy }>('/api/compliance-policies', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updateCompliancePolicy(id: string, input: { name?: string; framework?: string; description?: string | null; requirements?: Record<string, unknown>[]; controls?: Record<string, unknown>[]; status?: string; effectiveAt?: string | null; reviewedAt?: string | null }): Promise<{ policy: CompliancePolicy }> {
    return this.fetchJson<{ policy: CompliancePolicy }>(`/api/compliance-policies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async deleteCompliancePolicy(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/compliance-policies/${id}`, { method: 'DELETE' })
  }

  async listAccessReviews(): Promise<{ reviews: AccessReview[] }> {
    return this.fetchJson<{ reviews: AccessReview[] }>('/api/access-reviews')
  }

  async getAccessReview(id: string): Promise<{ review: AccessReview }> {
    return this.fetchJson<{ review: AccessReview }>(`/api/access-reviews/${id}`)
  }

  async createAccessReview(input: { title: string; description?: string | null; reviewerId?: string | null; status?: string; dueAt?: string | null }): Promise<{ review: AccessReview }> {
    return this.fetchJson<{ review: AccessReview }>('/api/access-reviews', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updateAccessReview(id: string, input: { title?: string; description?: string | null; reviewerId?: string | null; status?: string; dueAt?: string | null; completedAt?: string | null }): Promise<{ review: AccessReview }> {
    return this.fetchJson<{ review: AccessReview }>(`/api/access-reviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async completeAccessReview(id: string): Promise<{ review: AccessReview }> {
    return this.fetchJson<{ review: AccessReview }>(`/api/access-reviews/${id}/complete`, { method: 'POST' })
  }

  async deleteAccessReview(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/access-reviews/${id}`, { method: 'DELETE' })
  }

  async listSecurityIncidents(): Promise<{ incidents: SecurityIncident[] }> {
    return this.fetchJson<{ incidents: SecurityIncident[] }>('/api/security-incidents')
  }

  async getSecurityIncident(id: string): Promise<{ incident: SecurityIncident }> {
    return this.fetchJson<{ incident: SecurityIncident }>(`/api/security-incidents/${id}`)
  }

  async createSecurityIncident(input: { title: string; description?: string | null; severity?: string; reportedBy?: string | null; assignedTo?: string | null; occurredAt?: string | null; metadata?: Record<string, unknown> }): Promise<{ incident: SecurityIncident }> {
    return this.fetchJson<{ incident: SecurityIncident }>('/api/security-incidents', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updateSecurityIncident(id: string, input: { title?: string; description?: string | null; severity?: string; status?: string; assignedTo?: string | null; occurredAt?: string | null; resolvedAt?: string | null; metadata?: Record<string, unknown> }): Promise<{ incident: SecurityIncident }> {
    return this.fetchJson<{ incident: SecurityIncident }>(`/api/security-incidents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async resolveSecurityIncident(id: string): Promise<{ incident: SecurityIncident }> {
    return this.fetchJson<{ incident: SecurityIncident }>(`/api/security-incidents/${id}/resolve`, { method: 'POST' })
  }

  async deleteSecurityIncident(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/security-incidents/${id}`, { method: 'DELETE' })
  }

  // ============================================
  // Observability (Phase 6.1)
  // ============================================
  async getObservabilityStatus(): Promise<ObservabilitySnapshot> {
    return this.fetchJson<ObservabilitySnapshot>('/api/observability/status')
  }

  // ============================================
  // Enterprise Observability & Production Readiness (Phase 7.10)
  // ============================================
  async getSystemHealth(): Promise<{ status: string; components: Record<string, SystemHealthCheck | null> }> {
    return this.fetchJson<{ status: string; components: Record<string, SystemHealthCheck | null> }>('/api/system-health')
  }

  async getSystemHealthHistory(component?: string): Promise<{ checks: SystemHealthCheck[] }> {
    const qs = component ? `?component=${encodeURIComponent(component)}` : ''
    return this.fetchJson<{ checks: SystemHealthCheck[] }>(`/api/system-health/history${qs}`)
  }

  async listAlertRules(): Promise<{ rules: AlertRule[] }> {
    return this.fetchJson<{ rules: AlertRule[] }>('/api/alerts/rules')
  }

  async getAlertRule(id: string): Promise<{ rule: AlertRule }> {
    return this.fetchJson<{ rule: AlertRule }>(`/api/alerts/rules/${id}`)
  }

  async createAlertRule(input: { name: string; description?: string | null; metric: string; condition: string; threshold: number; windowSeconds?: number; severity?: string; channels?: Record<string, unknown>[] }): Promise<{ rule: AlertRule }> {
    return this.fetchJson<{ rule: AlertRule }>('/api/alerts/rules', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updateAlertRule(id: string, input: { name?: string; description?: string | null; metric?: string; condition?: string; threshold?: number; windowSeconds?: number; severity?: string; isActive?: boolean; channels?: Record<string, unknown>[] }): Promise<{ rule: AlertRule }> {
    return this.fetchJson<{ rule: AlertRule }>(`/api/alerts/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async deleteAlertRule(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/alerts/rules/${id}`, { method: 'DELETE' })
  }

  async listAlertHistory(options: { status?: string; ruleId?: string; page?: number; pageSize?: number } = {}): Promise<{ alerts: AlertHistory[]; total: number; page: number; pageSize: number }> {
    const params = new URLSearchParams()
    if (options.status) params.set('status', options.status)
    if (options.ruleId) params.set('ruleId', options.ruleId)
    if (options.page) params.set('page', String(options.page))
    if (options.pageSize) params.set('pageSize', String(options.pageSize))
    const qs = params.toString()
    return this.fetchJson<{ alerts: AlertHistory[]; total: number; page: number; pageSize: number }>(`/api/alerts/history${qs ? `?${qs}` : ''}`)
  }

  async resolveAlert(id: string): Promise<{ alert: AlertHistory }> {
    return this.fetchJson<{ alert: AlertHistory }>(`/api/alerts/history/${id}/resolve`, { method: 'POST' })
  }

  async listDeployments(environment?: string): Promise<{ deployments: Deployment[] }> {
    const qs = environment ? `?environment=${encodeURIComponent(environment)}` : ''
    return this.fetchJson<{ deployments: Deployment[] }>(`/api/deployments${qs}`)
  }

  async getDeployment(id: string): Promise<{ deployment: Deployment }> {
    return this.fetchJson<{ deployment: Deployment }>(`/api/deployments/${id}`)
  }

  async createDeployment(input: { environment: string; version: string; commitSha?: string | null; rollbackOfId?: string | null; metadata?: Record<string, unknown> }): Promise<{ deployment: Deployment }> {
    return this.fetchJson<{ deployment: Deployment }>('/api/deployments', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updateDeployment(id: string, input: { status?: string; startedAt?: string | null; completedAt?: string | null; metadata?: Record<string, unknown> }): Promise<{ deployment: Deployment }> {
    return this.fetchJson<{ deployment: Deployment }>(`/api/deployments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  }

  // ============================================
  // Cost Center (Phase 6.2 / 6.3)
  // ============================================
  async getCostDashboard(): Promise<CostDashboard> {
    return this.fetchJson<CostDashboard>('/api/costs/dashboard')
  }

  async getCostSummary(
    options: { dateFrom?: string; dateTo?: string } = {}
  ): Promise<{ summary: CostSummary }> {
    const params = new URLSearchParams()
    if (options.dateFrom) params.set('dateFrom', options.dateFrom)
    if (options.dateTo) params.set('dateTo', options.dateTo)
    const qs = params.toString()
    return this.fetchJson<{ summary: CostSummary }>(`/api/costs/summary${qs ? `?${qs}` : ''}`)
  }

  async listCostRecords(
    options: {
      dateFrom?: string
      dateTo?: string
      category?: string
      page?: number
      pageSize?: number
    } = {}
  ): Promise<{ costs: CostRecord[]; total: number; page: number; pageSize: number }> {
    const params = new URLSearchParams()
    if (options.dateFrom) params.set('dateFrom', options.dateFrom)
    if (options.dateTo) params.set('dateTo', options.dateTo)
    if (options.category) params.set('category', options.category)
    if (options.page) params.set('page', String(options.page))
    if (options.pageSize) params.set('pageSize', String(options.pageSize))
    const qs = params.toString()
    return this.fetchJson<{ costs: CostRecord[]; total: number; page: number; pageSize: number }>(
      `/api/costs/records${qs ? `?${qs}` : ''}`
    )
  }

  async listCostUsage(
    options: { dateFrom?: string; dateTo?: string; page?: number; pageSize?: number } = {}
  ): Promise<{ usage: Array<any>; total: number; page: number; pageSize: number }> {
    const params = new URLSearchParams()
    if (options.dateFrom) params.set('dateFrom', options.dateFrom)
    if (options.dateTo) params.set('dateTo', options.dateTo)
    if (options.page) params.set('page', String(options.page))
    if (options.pageSize) params.set('pageSize', String(options.pageSize))
    const qs = params.toString()
    return this.fetchJson<{ usage: Array<any>; total: number; page: number; pageSize: number }>(
      `/api/costs/usage${qs ? `?${qs}` : ''}`
    )
  }

  async listBudgets(): Promise<{ budgets: Budget[]; statuses: BudgetStatus[] }> {
    return this.fetchJson<{ budgets: Budget[]; statuses: BudgetStatus[] }>('/api/costs/budgets')
  }

  async createBudget(input: {
    category: 'total' | 'telephony' | 'ai' | 'stt' | 'tts' | 'storage' | 'other'
    period?: 'monthly' | 'daily'
    limitAmount: number
    currency?: string
    warnThreshold?: number
    alertThreshold?: number
    enabled?: boolean
  }): Promise<{ budget: Budget }> {
    return this.fetchJson<{ budget: Budget }>('/api/costs/budgets', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updateBudget(
    id: string,
    input: Partial<{
      limitAmount: number
      currency: string
      warnThreshold: number
      alertThreshold: number
      enabled: boolean
    }>
  ): Promise<{ budget: Budget }> {
    return this.fetchJson<{ budget: Budget }>(`/api/costs/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async deleteBudget(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/costs/budgets/${id}`, { method: 'DELETE' })
  }

  async evaluateBudgets(): Promise<{ alerts: SpendingAlert[] }> {
    return this.fetchJson<{ alerts: SpendingAlert[] }>('/api/costs/budgets/evaluate', {
      method: 'POST',
    })
  }

  async listCostAlerts(
    options: { page?: number; pageSize?: number } = {}
  ): Promise<{ alerts: SpendingAlert[]; total: number; page: number; pageSize: number }> {
    const params = new URLSearchParams()
    if (options.page) params.set('page', String(options.page))
    if (options.pageSize) params.set('pageSize', String(options.pageSize))
    const qs = params.toString()
    return this.fetchJson<{ alerts: SpendingAlert[]; total: number; page: number; pageSize: number }>(
      `/api/costs/alerts${qs ? `?${qs}` : ''}`
    )
  }

  // ============================================
  // Backup & Restore (Phase 6.4)
  // ============================================
  async listBackups(
    options: { page?: number; pageSize?: number } = {}
  ): Promise<{ backups: BackupRecord[]; total: number; page: number; pageSize: number }> {
    const params = new URLSearchParams()
    if (options.page) params.set('page', String(options.page))
    if (options.pageSize) params.set('pageSize', String(options.pageSize))
    const qs = params.toString()
    return this.fetchJson<{ backups: BackupRecord[]; total: number; page: number; pageSize: number }>(
      `/api/backups${qs ? `?${qs}` : ''}`
    )
  }

  async createBackup(type: 'full' | 'schema' | 'data' | 'incremental'): Promise<{ backup: BackupRecord }> {
    return this.fetchJson<{ backup: BackupRecord }>('/api/backups', {
      method: 'POST',
      body: JSON.stringify({ type }),
    })
  }

  async getBackup(id: string): Promise<{ backup: BackupRecord }> {
    return this.fetchJson<{ backup: BackupRecord }>(`/api/backups/${id}`)
  }

  async restoreBackup(id: string): Promise<{ backup: BackupRecord }> {
    return this.fetchJson<{ backup: BackupRecord }>(`/api/backups/${id}/restore`, { method: 'POST' })
  }

  async completeBackup(id: string, sizeBytes: number, path: string): Promise<{ backup: BackupRecord }> {
    return this.fetchJson<{ backup: BackupRecord }>(`/api/backups/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ sizeBytes, path }),
    })
  }

  async deleteBackup(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/backups/${id}`, { method: 'DELETE' })
  }

  // ============================================
  // Performance Baselines (Phase 6.5)
  // ============================================
  async listPerformanceBaselines(): Promise<{ baselines: PerformanceBaseline[] }> {
    return this.fetchJson<{ baselines: PerformanceBaseline[] }>('/api/performance/baselines')
  }

  async createPerformanceBaseline(input: {
    name: string
    endpoint: string
    method?: string
    p50Ms: number
    p95Ms: number
    p99Ms: number
    maxConcurrent?: number | null
  }): Promise<{ baseline: PerformanceBaseline }> {
    return this.fetchJson<{ baseline: PerformanceBaseline }>('/api/performance/baselines', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async deletePerformanceBaseline(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/performance/baselines/${id}`, { method: 'DELETE' })
  }

  // ============================================
  // Auto Scaling (Phase 6.6)
  // ============================================
  async getScalingConfig(): Promise<{ config: AutoScalingConfig }> {
    return this.fetchJson<{ config: AutoScalingConfig }>('/api/scaling/config')
  }

  async updateScalingConfig(input: {
    minReplicas: number
    maxReplicas: number
    targetCpuPercent: number
    targetMemoryPercent: number
    scaleUpCooldownSeconds: number
    scaleDownCooldownSeconds: number
  }): Promise<{ config: AutoScalingConfig }> {
    return this.fetchJson<{ config: AutoScalingConfig }>('/api/scaling/config', {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async getScalingMetrics(): Promise<{ metrics: ScalingMetric[] }> {
    return this.fetchJson<{ metrics: ScalingMetric[] }>('/api/scaling/metrics')
  }

  // ============================================
  // Multi-Region Readiness (Phase 6.7)
  // ============================================
  async listRegions(): Promise<{ regions: Region[] }> {
    return this.fetchJson<{ regions: Region[] }>('/api/regions')
  }

  async getRegion(id: string): Promise<{ region: Region }> {
    return this.fetchJson<{ region: Region }>(`/api/regions/${id}`)
  }

  async createRegion(input: {
    code: string
    name: string
    location: string
    provider: string
    status?: string
    isPrimary?: boolean
  }): Promise<{ region: Region }> {
    return this.fetchJson<{ region: Region }>('/api/regions', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updateRegion(id: string, input: {
    code?: string
    name?: string
    location?: string
    provider?: string
    status?: string
    isPrimary?: boolean
  }): Promise<{ region: Region }> {
    return this.fetchJson<{ region: Region }>(`/api/regions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async deleteRegion(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/regions/${id}`, { method: 'DELETE' })
  }

  async listOrganizationRegions(): Promise<{ mappings: OrganizationRegion[] }> {
    return this.fetchJson<{ mappings: OrganizationRegion[] }>('/api/regions/organizations')
  }

  async updateOrganizationRegion(
    id: string,
    input: {
      primaryRegionId: string
      secondaryRegionId?: string | null
      failoverEnabled?: boolean
    }
  ): Promise<{ mapping: OrganizationRegion }> {
    return this.fetchJson<{ mapping: OrganizationRegion }>(`/api/regions/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async getRegionHealth(regionCode?: string): Promise<{ health: RegionHealth }> {
    const path = regionCode ? `/api/regions/health/${regionCode}` : '/api/regions/health'
    return this.fetchJson<{ health: RegionHealth }>(path)
  }

  async listQueues(): Promise<{ queues: QueueStats[] }> {
    return this.fetchJson<{ queues: QueueStats[] }>('/api/queues')
  }

  async getQueueStats(organizationId: string): Promise<{ stats: QueueStats }> {
    return this.fetchJson<{ stats: QueueStats }>(`/api/queues/${organizationId}`)
  }

  async enqueueJob(organizationId: string, name: string, data: Record<string, unknown>): Promise<{ message: string }> {
    return this.fetchJson<{ message: string }>(`/api/queues/${organizationId}/enqueue`, {
      method: 'POST',
      body: JSON.stringify({ name, data }),
    })
  }

  async listFeatureFlags(filters?: {
    environment?: string
    status?: string
    organizationId?: string
    search?: string
  }): Promise<{ flags: FeatureFlag[] }> {
    const params = new URLSearchParams()
    if (filters?.environment) params.set('environment', filters.environment)
    if (filters?.status) params.set('status', filters.status)
    if (filters?.organizationId) params.set('organizationId', filters.organizationId)
    if (filters?.search) params.set('search', filters.search)
    const query = params.toString()
    return this.fetchJson<{ flags: FeatureFlag[] }>(`/api/feature-flags${query ? `?${query}` : ''}`)
  }

  async getFeatureFlag(id: string): Promise<{ flag: FeatureFlag }> {
    return this.fetchJson<{ flag: FeatureFlag }>(`/api/feature-flags/${id}`)
  }

  async createFeatureFlag(input: {
    name: string
    description: string
    environment: string
    organizationId?: string | null
    rolloutPercentage?: number
    enabled?: boolean
  }): Promise<{ flag: FeatureFlag }> {
    return this.fetchJson<{ flag: FeatureFlag }>('/api/feature-flags', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updateFeatureFlag(id: string, input: {
    name?: string
    description?: string
    environment?: string
    organizationId?: string | null
    rolloutPercentage?: number
    enabled?: boolean
  }): Promise<{ flag: FeatureFlag }> {
    return this.fetchJson<{ flag: FeatureFlag }>(`/api/feature-flags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async toggleFeatureFlag(id: string): Promise<{ flag: FeatureFlag }> {
    return this.fetchJson<{ flag: FeatureFlag }>(`/api/feature-flags/${id}/toggle`, {
      method: 'PATCH',
    })
  }

  async deleteFeatureFlag(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/feature-flags/${id}`, { method: 'DELETE' })
  }

  async listAIAgents(filters?: { search?: string; status?: string }): Promise<{ agents: AIAgent[] }> {
    const params = new URLSearchParams()
    if (filters?.search) params.set('search', filters.search)
    if (filters?.status) params.set('status', filters.status)
    const query = params.toString()
    return this.fetchJson<{ agents: AIAgent[] }>(`/api/ai-agents${query ? `?${query}` : ''}`)
  }

  async getAIAgent(id: string): Promise<{ agent: AIAgent }> {
    return this.fetchJson<{ agent: AIAgent }>(`/api/ai-agents/${id}`)
  }

  async createAIAgent(input: AIAgentInput): Promise<{ agent: AIAgent }> {
    return this.fetchJson<{ agent: AIAgent }>('/api/ai-agents', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updateAIAgent(id: string, input: Partial<AIAgentInput> & { status?: string }): Promise<{ agent: AIAgent }> {
    return this.fetchJson<{ agent: AIAgent }>(`/api/ai-agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async deleteAIAgent(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/ai-agents/${id}`, { method: 'DELETE' })
  }

  async duplicateAIAgent(id: string): Promise<{ agent: AIAgent }> {
    return this.fetchJson<{ agent: AIAgent }>(`/api/ai-agents/${id}/duplicate`, { method: 'POST' })
  }

  async testAIAgent(id: string): Promise<{ agent: AIAgent }> {
    return this.fetchJson<{ agent: AIAgent }>(`/api/ai-agents/${id}/test`, { method: 'POST' })
  }

  // ============================================
  // LLM Conversation Engine (Phase 7.4)
  // ============================================
  async getConversationDashboard(): Promise<{ summary: ConversationSummary }> {
    return this.fetchJson<{ summary: ConversationSummary }>('/api/conversations/dashboard')
  }

  async listConversations(options: {
    status?: string
    agentId?: string
    campaignId?: string
    contactId?: string
    search?: string
    dateFrom?: string
    dateTo?: string
    page?: number
    pageSize?: number
  } = {}): Promise<{ conversations: AIConversation[]; total: number; page: number; pageSize: number }> {
    const params = new URLSearchParams()
    if (options.status) params.set('status', options.status)
    if (options.agentId) params.set('agentId', options.agentId)
    if (options.campaignId) params.set('campaignId', options.campaignId)
    if (options.contactId) params.set('contactId', options.contactId)
    if (options.search) params.set('search', options.search)
    if (options.dateFrom) params.set('dateFrom', options.dateFrom)
    if (options.dateTo) params.set('dateTo', options.dateTo)
    if (options.page) params.set('page', String(options.page))
    if (options.pageSize) params.set('pageSize', String(options.pageSize))
    const qs = params.toString()
    return this.fetchJson<{ conversations: AIConversation[]; total: number; page: number; pageSize: number }>(`/api/conversations${qs ? `?${qs}` : ''}`)
  }

  async getConversation(id: string): Promise<{ conversation: AIConversation }> {
    return this.fetchJson<{ conversation: AIConversation }>(`/api/conversations/${id}`)
  }

  async startConversation(input: {
    agentId?: string | null
    campaignId?: string | null
    callId?: string | null
    contactId?: string | null
    provider?: string
    model?: string
    systemPrompt?: string
    metadata?: Record<string, unknown>
  }): Promise<{ conversation: AIConversation }> {
    return this.fetchJson<{ conversation: AIConversation }>('/api/conversations/start', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async endConversation(id: string): Promise<{ conversation: AIConversation }> {
    return this.fetchJson<{ conversation: AIConversation }>(`/api/conversations/${id}/end`, { method: 'POST' })
  }

  async transferConversation(id: string, agentId: string): Promise<{ conversation: AIConversation }> {
    return this.fetchJson<{ conversation: AIConversation }>(`/api/conversations/${id}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ agentId }),
    })
  }

  async getConversationMessages(id: string, options: { page?: number; pageSize?: number } = {}): Promise<{ messages: ConversationMessage[]; total: number; page: number; pageSize: number }> {
    const params = new URLSearchParams()
    if (options.page) params.set('page', String(options.page))
    if (options.pageSize) params.set('pageSize', String(options.pageSize))
    const qs = params.toString()
    return this.fetchJson<{ messages: ConversationMessage[]; total: number; page: number; pageSize: number }>(`/api/conversations/${id}/messages${qs ? `?${qs}` : ''}`)
  }

  async addConversationMessage(id: string, input: {
    role: 'system' | 'user' | 'assistant' | 'tool'
    content: string
    intent?: string | null
    sentiment?: 'positive' | 'neutral' | 'negative' | null
    confidence?: number | null
    tokensUsed?: number | null
    latencyMs?: number | null
    provider?: string | null
    model?: string | null
    metadata?: Record<string, unknown>
  }): Promise<{ message: ConversationMessage }> {
    return this.fetchJson<{ message: ConversationMessage }>(`/api/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async listLLMProviders(): Promise<{ providers: LLMProviderConfig[] }> {
    return this.fetchJson<{ providers: LLMProviderConfig[] }>('/api/conversations/providers')
  }

  async getLLMProvider(id: string): Promise<{ provider: LLMProviderConfig }> {
    return this.fetchJson<{ provider: LLMProviderConfig }>(`/api/conversations/providers/${id}`)
  }

  async createLLMProvider(input: LLMProviderInput): Promise<{ provider: LLMProviderConfig }> {
    return this.fetchJson<{ provider: LLMProviderConfig }>('/api/conversations/providers', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updateLLMProvider(id: string, input: Record<string, unknown>): Promise<{ provider: LLMProviderConfig }> {
    return this.fetchJson<{ provider: LLMProviderConfig }>(`/api/conversations/providers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async deleteLLMProvider(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/conversations/providers/${id}`, { method: 'DELETE' })
  }

  async listPromptTemplates(options?: { search?: string }): Promise<{ templates: PromptTemplate[] }> {
    const params = new URLSearchParams()
    if (options?.search) params.set('search', options.search)
    const qs = params.toString()
    return this.fetchJson<{ templates: PromptTemplate[] }>(`/api/conversations/prompt-templates${qs ? `?${qs}` : ''}`)
  }

  async getPromptTemplate(id: string): Promise<{ template: PromptTemplate }> {
    return this.fetchJson<{ template: PromptTemplate }>(`/api/conversations/prompt-templates/${id}`)
  }

  async createPromptTemplate(input: {
    name: string
    description?: string | null
    systemPrompt: string
    userPromptTemplate?: string | null
    variables?: string[]
    tags?: string[]
  }): Promise<{ template: PromptTemplate }> {
    return this.fetchJson<{ template: PromptTemplate }>('/api/conversations/prompt-templates', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updatePromptTemplate(id: string, input: Record<string, unknown>): Promise<{ template: PromptTemplate }> {
    return this.fetchJson<{ template: PromptTemplate }>(`/api/conversations/prompt-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async deletePromptTemplate(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/conversations/prompt-templates/${id}`, { method: 'DELETE' })
  }

  async listMemory(options?: { contactId?: string; agentId?: string }): Promise<{ memory: AIMemory[] }> {
    const params = new URLSearchParams()
    if (options?.contactId) params.set('contactId', options.contactId)
    if (options?.agentId) params.set('agentId', options.agentId)
    const qs = params.toString()
    return this.fetchJson<{ memory: AIMemory[] }>(`/api/conversations/memory${qs ? `?${qs}` : ''}`)
  }

  async createMemory(input: {
    contactId?: string | null
    agentId?: string | null
    conversationId?: string | null
    memoryType: 'summary' | 'fact' | 'preference' | 'intent' | 'sentiment_history'
    content: string
    importanceScore?: number
    expiresAt?: string | null
    metadata?: Record<string, unknown>
  }): Promise<{ memory: AIMemory }> {
    return this.fetchJson<{ memory: AIMemory }>('/api/conversations/memory', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async getLLMUsage(options?: { dateFrom?: string; dateTo?: string }): Promise<{ usage: LLMUsage[] }> {
    const params = new URLSearchParams()
    if (options?.dateFrom) params.set('dateFrom', options.dateFrom)
    if (options?.dateTo) params.set('dateTo', options.dateTo)
    const qs = params.toString()
    return this.fetchJson<{ usage: LLMUsage[] }>(`/api/conversations/usage${qs ? `?${qs}` : ''}`)
  }

  async recordLLMUsage(input: {
    conversationId?: string | null
    messageId?: string | null
    provider: string
    model: string
    promptTokens: number
    completionTokens: number
    totalTokens: number
    latencyMs?: number | null
    cost?: number | null
    currency?: string
  }): Promise<{ usage: LLMUsage }> {
    return this.fetchJson<{ usage: LLMUsage }>('/api/conversations/usage', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  // ============================================
  // Contact Management Dashboard & Segments (Phase 7.5)
  // ============================================
  async getContactDashboardStats(): Promise<{ stats: ContactManagementDashboardStats }> {
    return this.fetchJson<{ stats: ContactManagementDashboardStats }>('/api/contact-management/dashboard')
  }

  async getContactImportHistory(options: {
    page?: number
    pageSize?: number
    contactListId?: string
  }): Promise<{ jobs: any[]; total: number; page: number; pageSize: number }> {
    const params = new URLSearchParams()
    if (options.page) params.set('page', String(options.page))
    if (options.pageSize) params.set('pageSize', String(options.pageSize))
    if (options.contactListId) params.set('contactListId', options.contactListId)
    const qs = params.toString()
    return this.fetchJson<{ jobs: any[]; total: number; page: number; pageSize: number }>(
      `/api/contact-management/import-history${qs ? `?${qs}` : ''}`
    )
  }

  async listContactSegments(): Promise<{ segments: ContactSegment[] }> {
    return this.fetchJson<{ segments: ContactSegment[] }>('/api/contact-management/segments')
  }

  async createContactSegment(input: {
    name: string
    description?: string | null
    filters?: Record<string, unknown>
  }): Promise<{ segment: ContactSegment }> {
    return this.fetchJson<{ segment: ContactSegment }>('/api/contact-management/segments', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async getContactSegment(id: string): Promise<{ segment: ContactSegment }> {
    return this.fetchJson<{ segment: ContactSegment }>(`/api/contact-management/segments/${id}`)
  }

  async getContactSegmentContacts(segmentId: string, options: { page?: number; pageSize?: number; search?: string }): Promise<{ contacts: any[]; total: number; page: number; pageSize: number }> {
    const params = new URLSearchParams()
    if (options.page) params.set('page', String(options.page))
    if (options.pageSize) params.set('pageSize', String(options.pageSize))
    if (options.search) params.set('search', options.search)
    const qs = params.toString()
    return this.fetchJson<{ contacts: any[]; total: number; page: number; pageSize: number }>(
      `/api/contact-management/segments/${segmentId}/contacts${qs ? `?${qs}` : ''}`
    )
  }

  async updateContactSegment(id: string, input: {
    name?: string
    description?: string | null
    isActive?: boolean
  }): Promise<{ segment: ContactSegment }> {
    return this.fetchJson<{ segment: ContactSegment }>(`/api/contact-management/segments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async deleteContactSegment(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/contact-management/segments/${id}`, { method: 'DELETE' })
  }

  async refreshContactSegment(id: string): Promise<{ message: string }> {
    return this.fetchJson<{ message: string }>(`/api/contact-management/segments/${id}/refresh`, {
      method: 'POST',
    })
  }

  async listDuplicateContacts(
    options?: { status?: string; limit?: number }
  ): Promise<{ duplicates: DuplicateContactRecord[] }> {
    const params = new URLSearchParams()
    if (options?.status) params.set('status', options.status)
    if (options?.limit) params.set('limit', String(options.limit))
    const qs = params.toString()
    return this.fetchJson<{ duplicates: DuplicateContactRecord[] }>(
      `/api/contact-management/duplicates${qs ? `?${qs}` : ''}`
    )
  }

  async resolveDuplicateContact(duplicateId: string, status: 'reviewed' | 'merged' | 'ignored'): Promise<{ message: string }> {
    return this.fetchJson<{ message: string }>(`/api/contact-management/duplicates/${duplicateId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    })
  }

  async exportContacts(options: {
    contactListId?: string | null
    search?: string
  }): Promise<void> {
    const params = new URLSearchParams()
    if (options.contactListId) params.set('contactListId', options.contactListId)
    if (options.search) params.set('search', options.search)
    const qs = params.toString()
    const path = `/api/contact-management/export${qs ? `?${qs}` : ''}`
    await this.downloadFile(path, `contacts-export-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  async downloadFile(path: string, filename: string) {
    const res = await fetch(`${API_URL}${path}`, { credentials: 'include' })
    if (!res.ok) {
      throw new Error('Export failed')
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  // ============================================
  // Live Monitoring (Phase 7.6)
  // ============================================
  async getLiveDashboardStats(): Promise<{ stats: LiveDashboardStats }> {
    return this.fetchJson<{ stats: LiveDashboardStats }>('/api/live-monitor/dashboard')
  }

  async getLiveActiveCalls(options?: { status?: string }): Promise<{ calls: ActiveCall[] }> {
    const params = new URLSearchParams()
    if (options?.status) params.set('status', options.status)
    const qs = params.toString()
    return this.fetchJson<{ calls: ActiveCall[] }>(`/api/live-monitor/active-calls${qs ? `?${qs}` : ''}`)
  }

  async getLiveQueueStatus(): Promise<{ queues: any[] }> {
    return this.fetchJson<{ queues: any[] }>('/api/live-monitor/queue-status')
  }

  async getLiveAgentStatus(): Promise<{ agents: any[] }> {
    return this.fetchJson<{ agents: any[] }>('/api/live-monitor/agents')
  }

  async getLiveCallVolume(options?: { hours?: number }): Promise<{ volume: Array<{ timestamp: string; value: number }> }> {
    const params = new URLSearchParams()
    if (options?.hours) params.set('hours', String(options.hours))
    const qs = params.toString()
    return this.fetchJson<{ volume: Array<{ timestamp: string; value: number }> }>(`/api/live-monitor/call-volume${qs ? `?${qs}` : ''}`)
  }

  async getLiveEvents(options?: { limit?: number }): Promise<{ events: LiveEvent[] }> {
    const params = new URLSearchParams()
    if (options?.limit) params.set('limit', String(options.limit))
    const qs = params.toString()
    return this.fetchJson<{ events: LiveEvent[] }>(`/api/live-monitor/events${qs ? `?${qs}` : ''}`)
  }

  async getLiveQueueOverview(): Promise<QueueOverview> {
    return this.fetchJson<QueueOverview>('/api/live-monitor/queues/overview')
  }

  async getLiveAgentOverview(): Promise<AgentOverview> {
    return this.fetchJson<AgentOverview>('/api/live-monitor/agents/overview')
  }

  // ============================================
  // Plans (Phase 7.7)
  // ============================================
  async listPlans(): Promise<{ plans: Plan[] }> {
    return this.fetchJson<{ plans: Plan[] }>('/api/plans')
  }

  async getPlan(id: string): Promise<{ plan: Plan }> {
    return this.fetchJson<{ plan: Plan }>(`/api/plans/${id}`)
  }

  async createPlan(input: {
    name: string
    slug: string
    description?: string | null
    priceMonthly: number
    priceYearly: number
    currency?: string
    limits?: Record<string, unknown>
    features?: Array<Record<string, unknown>>
    sortOrder?: number
  }): Promise<{ plan: Plan }> {
    return this.fetchJson<{ plan: Plan }>('/api/plans', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updatePlan(id: string, input: {
    name?: string
    slug?: string
    description?: string | null
    priceMonthly?: number
    priceYearly?: number
    currency?: string
    limits?: Record<string, unknown>
    features?: Array<Record<string, unknown>>
    isActive?: boolean
    sortOrder?: number
  }): Promise<{ plan: Plan }> {
    return this.fetchJson<{ plan: Plan }>(`/api/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async deletePlan(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/plans/${id}`, { method: 'DELETE' })
  }

  // ============================================
  // Coupons (Phase 7.7)
  // ============================================
  async listCoupons(): Promise<{ coupons: Coupon[] }> {
    return this.fetchJson<{ coupons: Coupon[] }>('/api/coupons')
  }

  async getCoupon(id: string): Promise<{ coupon: Coupon }> {
    return this.fetchJson<{ coupon: Coupon }>(`/api/coupons/${id}`)
  }

  async createCoupon(input: {
    code: string
    description?: string | null
    discountType: 'percentage' | 'fixed' | 'free_trial'
    discountValue: number
    currency?: string
    maxRedemptions?: number | null
    validFrom?: string | null
    validUntil?: string | null
    appliesToPlan?: string | null
  }): Promise<{ coupon: Coupon }> {
    return this.fetchJson<{ coupon: Coupon }>('/api/coupons', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updateCoupon(id: string, input: {
    code?: string
    description?: string | null
    discountType?: 'percentage' | 'fixed' | 'free_trial'
    discountValue?: number
    currency?: string
    maxRedemptions?: number | null
    validFrom?: string | null
    validUntil?: string | null
    appliesToPlan?: string | null
    isActive?: boolean
  }): Promise<{ coupon: Coupon }> {
    return this.fetchJson<{ coupon: Coupon }>(`/api/coupons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async validateCoupon(id: string, planSlug?: string): Promise<{ valid: boolean; coupon: Coupon | null; reason?: string }> {
    return this.fetchJson<{ valid: boolean; coupon: Coupon | null; reason?: string }>(`/api/coupons/${id}/validate`, {
      method: 'POST',
      body: JSON.stringify({ planSlug }),
    })
  }

  async redeemCoupon(id: string): Promise<{ coupon: Coupon }> {
    return this.fetchJson<{ coupon: Coupon }>(`/api/coupons/${id}/redeem`, { method: 'POST' })
  }

  async deleteCoupon(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/coupons/${id}`, { method: 'DELETE' })
  }

  // ============================================
  // Credits (Phase 7.7)
  // ============================================
  async listCredits(): Promise<{ credits: Credit[]; balance: number }> {
    return this.fetchJson<{ credits: Credit[]; balance: number }>('/api/credits')
  }

  async getCredit(id: string): Promise<{ credit: Credit }> {
    return this.fetchJson<{ credit: Credit }>(`/api/credits/${id}`)
  }

  async createCredit(input: {
    amount: number
    currency?: string
    reason?: string | null
    expiresAt?: string | null
  }): Promise<{ credit: Credit }> {
    return this.fetchJson<{ credit: Credit }>('/api/credits', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async applyCredit(creditId: string, invoiceId: string, amount: number): Promise<{ credit: Credit; transactionId: string }> {
    return this.fetchJson<{ credit: Credit; transactionId: string }>(`/api/credits/${creditId}/apply`, {
      method: 'POST',
      body: JSON.stringify({ invoiceId, amount }),
    })
  }

  async deleteCredit(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/credits/${id}`, { method: 'DELETE' })
  }

  // ============================================
  // Billing Settings (Phase 7.7)
  // ============================================
  async getBillingSettings(): Promise<{ settings: BillingSettings | null }> {
    return this.fetchJson<{ settings: BillingSettings | null }>('/api/billing-settings')
  }

  async updateBillingSettings(input: {
    autoRecharge?: boolean
    autoRechargeThreshold?: number | null
    autoRechargeAmount?: number | null
    currency?: string
    billingEmail?: string | null
    companyName?: string | null
    taxId?: string | null
    address?: Record<string, unknown>
    notificationPreferences?: Record<string, unknown>
  }): Promise<{ settings: BillingSettings }> {
    return this.fetchJson<{ settings: BillingSettings }>('/api/billing-settings', {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  // ============================================
  // Transactions (Phase 7.7)
  // ============================================
  async listTransactions(options: { type?: string; page?: number; pageSize?: number } = {}): Promise<{ transactions: Transaction[]; total: number; page: number; pageSize: number }> {
    const params = new URLSearchParams()
    if (options.type) params.set('type', options.type)
    if (options.page) params.set('page', String(options.page))
    if (options.pageSize) params.set('pageSize', String(options.pageSize))
    const qs = params.toString()
    return this.fetchJson<{ transactions: Transaction[]; total: number; page: number; pageSize: number }>(
      `/api/transactions${qs ? `?${qs}` : ''}`
    )
  }

  async getTransaction(id: string): Promise<{ transaction: Transaction }> {
    return this.fetchJson<{ transaction: Transaction }>(`/api/transactions/${id}`)
  }

  // ============================================
  // API Keys (Phase 7.8)
  // ============================================
  async listApiKeysFlat(): Promise<{ keys: ApiKey[] }> {
    return this.fetchJson<{ keys: ApiKey[] }>('/api/api-keys')
  }

  async createApiKeyFlat(input: { name: string; scopes?: string[]; expiresAt?: string | null }): Promise<{ id: string; name: string; key: string; keyPrefix: string; scopes: string[]; expiresAt: string | null; createdAt: string }> {
    return this.fetchJson<{ id: string; name: string; key: string; keyPrefix: string; scopes: string[]; expiresAt: string | null; createdAt: string }>('/api/api-keys', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async rotateApiKeyFlat(id: string, input: { name?: string; scopes?: string[]; expiresAt?: string | null }): Promise<{ id: string; name: string; key: string; keyPrefix: string; scopes: string[]; expiresAt: string | null; createdAt: string }> {
    return this.fetchJson<{ id: string; name: string; key: string; keyPrefix: string; scopes: string[]; expiresAt: string | null; createdAt: string }>(`/api/api-keys/${id}/rotate`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async deleteApiKeyFlat(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/api-keys/${id}`, { method: 'DELETE' })
  }

  // ============================================
  // OAuth (Phase 7.8)
  // ============================================
  async listOAuthProviders(): Promise<{ providers: Array<{ key: string; name: string; scopes: string[] }> }> {
    return this.fetchJson<{ providers: Array<{ key: string; name: string; scopes: string[] }> }>('/api/oauth/providers')
  }

  async listOAuthConnections(): Promise<{ connections: OAuthConnection[] }> {
    return this.fetchJson<{ connections: OAuthConnection[] }>('/api/oauth')
  }

  async getOAuthConnection(id: string): Promise<{ connection: OAuthConnection }> {
    return this.fetchJson<{ connection: OAuthConnection }>(`/api/oauth/${id}`)
  }

  async connectOAuth(input: { provider: string; providerUserId: string; accessToken?: string | null; refreshToken?: string | null; expiresAt?: string | null; scope?: string | null; metadata?: Record<string, unknown> }): Promise<{ connection: OAuthConnection }> {
    return this.fetchJson<{ connection: OAuthConnection }>('/api/oauth', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updateOAuth(id: string, input: { accessToken?: string | null; refreshToken?: string | null; expiresAt?: string | null; scope?: string | null; metadata?: Record<string, unknown> }): Promise<{ connection: OAuthConnection }> {
    return this.fetchJson<{ connection: OAuthConnection }>(`/api/oauth/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async disconnectOAuth(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/oauth/${id}`, { method: 'DELETE' })
  }

  // ============================================
  // Notification Channels (Phase 7.8)
  // ============================================
  async listNotificationChannels(): Promise<{ channels: NotificationChannelConfig[] }> {
    return this.fetchJson<{ channels: NotificationChannelConfig[] }>('/api/notification-channels')
  }

  async getNotificationChannel(id: string): Promise<{ channel: NotificationChannelConfig }> {
    return this.fetchJson<{ channel: NotificationChannelConfig }>(`/api/notification-channels/${id}`)
  }

  async createNotificationChannel(input: { name: string; type: string; config?: Record<string, unknown>; isActive?: boolean }): Promise<{ channel: NotificationChannelConfig }> {
    return this.fetchJson<{ channel: NotificationChannelConfig }>('/api/notification-channels', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updateNotificationChannel(id: string, input: { name?: string; type?: string; config?: Record<string, unknown>; isActive?: boolean }): Promise<{ channel: NotificationChannelConfig }> {
    return this.fetchJson<{ channel: NotificationChannelConfig }>(`/api/notification-channels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async deleteNotificationChannel(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/notification-channels/${id}`, { method: 'DELETE' })
  }

  // ============================================
  // Notification Templates (Phase 7.8)
  // ============================================
  async listNotificationTemplates(channelId?: string): Promise<{ templates: NotificationTemplate[] }> {
    const qs = channelId ? `?channelId=${encodeURIComponent(channelId)}` : ''
    return this.fetchJson<{ templates: NotificationTemplate[] }>(`/api/notification-templates${qs}`)
  }

  async getNotificationTemplate(id: string): Promise<{ template: NotificationTemplate }> {
    return this.fetchJson<{ template: NotificationTemplate }>(`/api/notification-templates/${id}`)
  }

  async createNotificationTemplate(input: { channelId: string; name: string; subject?: string | null; body: string; variables?: string[]; isActive?: boolean }): Promise<{ template: NotificationTemplate }> {
    return this.fetchJson<{ template: NotificationTemplate }>('/api/notification-templates', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updateNotificationTemplate(id: string, input: { channelId?: string; name?: string; subject?: string | null; body?: string; variables?: string[]; isActive?: boolean }): Promise<{ template: NotificationTemplate }> {
    return this.fetchJson<{ template: NotificationTemplate }>(`/api/notification-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async deleteNotificationTemplate(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/notification-templates/${id}`, { method: 'DELETE' })
  }

  // ============================================
  // Notification Logs (Phase 7.8)
  // ============================================
  async listNotificationLogs(options: { channelId?: string; status?: string; page?: number; pageSize?: number } = {}): Promise<{ logs: NotificationLog[]; total: number; page: number; pageSize: number }> {
    const params = new URLSearchParams()
    if (options.channelId) params.set('channelId', options.channelId)
    if (options.status) params.set('status', options.status)
    if (options.page) params.set('page', String(options.page))
    if (options.pageSize) params.set('pageSize', String(options.pageSize))
    const qs = params.toString()
    return this.fetchJson<{ logs: NotificationLog[]; total: number; page: number; pageSize: number }>(
      `/api/notification-logs${qs ? `?${qs}` : ''}`
    )
  }

  async getNotificationLog(id: string): Promise<{ log: NotificationLog }> {
    return this.fetchJson<{ log: NotificationLog }>(`/api/notification-logs/${id}`)
  }

  // ============================================
  // Voice Providers (Phase 8.1)
  // ============================================
  async listVoiceProviders(): Promise<{ providers: VoiceProvider[] }> {
    return this.fetchJson<{ providers: VoiceProvider[] }>('/api/voice-providers')
  }

  async getVoiceProvider(key: string): Promise<{ provider: VoiceProvider }> {
    return this.fetchJson<{ provider: VoiceProvider }>(`/api/voice-providers/${key}`)
  }

  async createVoiceProvider(input: VoiceProviderInput): Promise<{ provider: VoiceProvider }> {
    return this.fetchJson<{ provider: VoiceProvider }>('/api/voice-providers', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async updateVoiceProvider(id: string, input: Partial<VoiceProviderInput> & { isActive?: boolean }): Promise<{ provider: VoiceProvider }> {
    return this.fetchJson<{ provider: VoiceProvider }>(`/api/voice-providers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async deleteVoiceProvider(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/voice-providers/${id}`, { method: 'DELETE' })
  }

  async checkProviderHealth(providerKey: string): Promise<any> {
    return this.fetchJson<any>(`/api/voice-providers/${providerKey}/health`)
  }

  async checkAllProviderHealth(): Promise<any> {
    return this.fetchJson<any>('/api/voice-providers/health/all')
  }

  async listProviderCredentials(): Promise<{ credentials: ProviderCredential[] }> {
    return this.fetchJson<{ credentials: ProviderCredential[] }>('/api/voice-providers/credentials')
  }

  async getProviderCredential(providerKey: string): Promise<{ credential: ProviderCredential }> {
    return this.fetchJson<{ credential: ProviderCredential }>(`/api/voice-providers/credentials/${providerKey}`)
  }

  async saveProviderCredential(input: { providerKey: string; credentials: Record<string, unknown> }): Promise<{ credential: ProviderCredential }> {
    return this.fetchJson<{ credential: ProviderCredential }>('/api/voice-providers/credentials', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async verifyProviderCredential(providerKey: string): Promise<{ result: { valid: boolean; error?: string } }> {
    return this.fetchJson<{ result: { valid: boolean; error?: string } }>(`/api/voice-providers/credentials/${providerKey}/verify`, {
      method: 'POST',
    })
  }

  async deleteProviderCredential(providerKey: string): Promise<void> {
    await this.fetchJson<void>(`/api/voice-providers/credentials/${providerKey}`, { method: 'DELETE' })
  }

  async streamAudio(providerKey: string, text: string, voiceId: string, options?: Record<string, unknown>): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch('/api/voice-providers/' + providerKey + '/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId, options }),
    })

    if (!response.ok) {
      throw new Error('Streaming audio failed: ' + response.status)
    }

    if (!response.body) {
      throw new Error('Streaming audio: response body is null')
    }

    return response.body
  }

  async streamTranscription(providerKey: string, audioBlob: Blob, language?: string, _options?: Record<string, unknown>): Promise<{ text: string; confidence: number }> {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'audio.webm')
    if (language) formData.append('language', language)

    const response = await fetch('/api/voice-providers/' + providerKey + '/stream-stt', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Streaming transcription failed: ' + response.status)
    }

    return response.json()
  }

  // ============================================
  // Voice Providers - Failover & Health (Phase 8.2)
  // ============================================
  async getFailoverStatus(): Promise<{ failover: Array<{ key: string; name: string; category: string; isActive: boolean; circuitOpen: boolean; failureCount: number; lastFailureAt: string | null; priority: number }> }> {
    return this.fetchJson<{ failover: Array<{ key: string; name: string; category: string; isActive: boolean; circuitOpen: boolean; failureCount: number; lastFailureAt: string | null; priority: number }> }>('/api/voice-providers/failover/status')
  }

  async getFailoverStatusForKey(providerKey: string): Promise<{ key: string; name: string; category: string; isActive: boolean; circuitOpen: boolean; failureCount: number; lastFailureAt: string | null; priority: number }> {
    return this.fetchJson<{ key: string; name: string; category: string; isActive: boolean; circuitOpen: boolean; failureCount: number; lastFailureAt: string | null; priority: number }>(`/api/voice-providers/failover/status/${providerKey}`)
  }

  async testFailover(providerKey: string): Promise<{ key: string; name: string; health: { status: string; latencyMs: number | null; details: Record<string, unknown> }; failover: { failureCount: number; circuitOpen: boolean; lastFailureAt: string | null; priority: number } }> {
    return this.fetchJson<{ key: string; name: string; health: { status: string; latencyMs: number | null; details: Record<string, unknown> }; failover: { failureCount: number; circuitOpen: boolean; lastFailureAt: string | null; priority: number } }>(`/api/voice-providers/failover/test/${providerKey}`, { method: 'POST' })
  }

  async getProviderHealthDetailed(providerKey: string): Promise<{ health: { status: string; latencyMs: number | null; details: Record<string, unknown> } }> {
    return this.fetchJson<{ health: { status: string; latencyMs: number | null; details: Record<string, unknown> } }>(`/api/voice-providers/${providerKey}/health-detailed`)
  }

  // ============================================
  // Voice Provider Selection (Phase 8.5)
  // ============================================
  async getSelectionTtsProvider(preferredProvider?: string): Promise<{ provider: VoiceProvider | null }> {
    const params = preferredProvider ? '?preferredProvider=' + encodeURIComponent(preferredProvider) : ''
    return this.fetchJson<{ provider: VoiceProvider | null }>(`/api/voice-providers/selection/tts${params}`)
  }

  async getSelectionSttProvider(preferredProvider?: string): Promise<{ provider: VoiceProvider | null }> {
    const params = preferredProvider ? '?preferredProvider=' + encodeURIComponent(preferredProvider) : ''
    return this.fetchJson<{ provider: VoiceProvider | null }>(`/api/voice-providers/selection/stt${params}`)
  }

  async getAvailableVoices(providerKey: string, language?: string): Promise<{ voices: VoiceModel[] }> {
    const params = new URLSearchParams()
    if (language) params.set('language', language)
    const qs = params.toString()
    return this.fetchJson<{ voices: VoiceModel[] }>(`/api/voice-providers/selection/voices?providerKey=${encodeURIComponent(providerKey)}${qs ? '&' + qs : ''}`)
  }

  async getSupportedLanguages(providerKey?: string): Promise<{ languages: Array<{ code: string; name: string }> }> {
    const params = new URLSearchParams()
    if (providerKey) params.set('providerKey', providerKey)
    const qs = params.toString()
    return this.fetchJson<{ languages: Array<{ code: string; name: string }> }>(`/api/voice-providers/selection/languages${qs ? '?' + qs : ''}`)
  }

  async getAllRegisteredProviders(): Promise<{ providers: Array<{ key: string; name: string; category: string; isActive: boolean; capabilities: Record<string, unknown> }> }> {
    return this.fetchJson<{ providers: Array<{ key: string; name: string; category: string; isActive: boolean; capabilities: Record<string, unknown> }> }>('/api/voice-providers/selection/providers')
  }

  // ============================================
  // Voice Library (Phase 8.4)
  // ============================================
  async listVoices(options?: {
    providerKey?: string
    type?: string
    language?: string
    gender?: string
    page?: number
    pageSize?: number
  }): Promise<{ voices: VoiceModel[]; total: number }> {
    const params = new URLSearchParams()
    if (options?.providerKey) params.set('providerKey', options.providerKey)
    if (options?.type) params.set('type', options.type)
    if (options?.language) params.set('language', options.language)
    if (options?.gender) params.set('gender', options.gender)
    if (options?.page) params.set('page', String(options.page))
    if (options?.pageSize) params.set('pageSize', String(options.pageSize))
    const qs = params.toString()
    return this.fetchJson<{ voices: VoiceModel[]; total: number }>(`/api/voice-providers/voices${qs ? `?${qs}` : ''}`)
  }

  async discoverVoices(): Promise<{ results: Array<{ providerKey: string; providerName: string; discovered: number; error?: string }> }> {
    return this.fetchJson<{ results: Array<{ providerKey: string; providerName: string; discovered: number; error?: string }> }>('/api/voice-providers/voices/discover', { method: 'POST' })
  }

  async getProviderVoices(providerKey: string): Promise<{ provider: string; name: string; voices: VoiceModel[] }> {
    return this.fetchJson<{ provider: string; name: string; voices: VoiceModel[] }>(`/api/voice-providers/voices/${providerKey}`)
  }

  async refreshProviderVoices(providerKey: string): Promise<{ providerKey: string; refreshed: number; discovered: number }> {
    return this.fetchJson<{ providerKey: string; refreshed: number; discovered: number }>(`/api/voice-providers/voices/${providerKey}/refresh`, { method: 'POST' })
  }

  async updateVoice(id: string, input: { name?: string; isActive?: boolean; metadata?: Record<string, unknown> }): Promise<{ voice: VoiceModel }> {
    return this.fetchJson<{ voice: VoiceModel }>(`/api/voice-providers/voices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  }

  async deleteVoice(id: string): Promise<void> {
    await this.fetchJson<void>(`/api/voice-providers/voices/${id}`, { method: 'DELETE' })
  }

  // ============================================
  // Call Execution (Phase 8.6)
  // ============================================
  async initiateCall(input: {
    to: string
    from: string
    callerId?: string
    campaignId?: string
    contactId?: string
    agentId?: string
    preferredTtsProvider?: string
    preferredSttProvider?: string
    ttsVoiceId?: string
    metadata?: Record<string, unknown>
  }): Promise<{ call: { id: string; status: string; providerCallSid: string }; callSid: string }> {
    return this.fetchJson<{ call: { id: string; status: string; providerCallSid: string }; callSid: string }>(
      '/api/voice-providers/execute/start',
      { method: 'POST', body: JSON.stringify(input) }
    )
  }

  async answerCall(callSid: string): Promise<{ callSid: string; status: string }> {
    return this.fetchJson<{ callSid: string; status: string }>(
      `/api/voice-providers/execute/answer/${callSid}`,
      { method: 'POST' }
    )
  }

  async terminateCall(callSid: string): Promise<{ callSid: string; status: string }> {
    return this.fetchJson<{ callSid: string; status: string }>(
      `/api/voice-providers/execute/end/${callSid}`,
      { method: 'POST' }
    )
  }

  async playCallAudio(callSid: string, text: string, voiceId?: string): Promise<{ callSid: string; status: string }> {
    return this.fetchJson<{ callSid: string; status: string }>(
      `/api/voice-providers/execute/play-audio/${callSid}`,
      { method: 'POST', body: JSON.stringify({ text, voiceId }) }
    )
  }

  async startCallRecording(callSid: string): Promise<{ callSid: string; recordingUrl: string }> {
    return this.fetchJson<{ callSid: string; recordingUrl: string }>(
      `/api/voice-providers/execute/record/${callSid}`,
      { method: 'POST' }
    )
  }

  async stopCallRecording(callSid: string): Promise<{ callSid: string; status: string }> {
    return this.fetchJson<{ callSid: string; status: string }>(
      `/api/voice-providers/execute/stop-recording/${callSid}`,
      { method: 'POST' }
    )
  }

  async getCallStatus(callSid: string): Promise<{ status: string; durationMs?: number; recordingUrl?: string }> {
    return this.fetchJson<{ status: string; durationMs?: number; recordingUrl?: string }>(
      `/api/voice-providers/execute/status/${callSid}`
    )
  }

  async executeCallFlow(input: {
    callSid: string
    to: string
    from: string
    ttsText: string
    voiceId?: string
  }): Promise<{ callSid: string; status: string; recordingUrl?: string }> {
    return this.fetchJson<{ callSid: string; status: string; recordingUrl?: string }>(
      `/api/voice-providers/execute/flow/${input.callSid}`,
      { method: 'POST', body: JSON.stringify(input) }
    )
  }

  // AI Call Intelligence (Phase 8.7)

  async getAISummary(organizationId: string, callId: string): Promise<{ summary: AICallSummary | null }> {
    return this.fetchJson<{ summary: AICallSummary | null }>(`/api/calling-engine/${callId}/summary`)
  }

  async generateAISummary(organizationId: string, callId: string, input: {
    summary: string
    sentiment?: string
    riskLevel?: string
  }): Promise<{ summary: AICallSummary }> {
    return this.fetchJson<{ summary: AICallSummary }>(`/api/calling-engine/${callId}/summary`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async getAISentiment(organizationId: string, callId: string): Promise<{ sentiments: CallSentiment[] }> {
    return this.fetchJson<{ sentiments: CallSentiment[] }>(`/api/calling-engine/${callId}/sentiment`)
  }

  async getAgentAssistSuggestions(organizationId: string, callId: string, options?: {
    applied?: boolean
    priority?: string
    suggestionType?: string
  }): Promise<{ suggestions: AgentAssistSuggestion[]; total: number; page: number; pageSize: number }> {
    const qs = new URLSearchParams()
    if (options?.applied !== undefined) qs.set('applied', String(options.applied))
    if (options?.priority) qs.set('priority', options.priority)
    if (options?.suggestionType) qs.set('suggestionType', options.suggestionType)
    return this.fetchJson<{ suggestions: AgentAssistSuggestion[]; total: number; page: number; pageSize: number }>(
      `/api/calling-engine/${callId}/agent-assist${qs.toString() ? `?${qs.toString()}` : ''}`
    )
  }

  async applyAISuggestion(organizationId: string, callId: string, id: string): Promise<{ suggestion: AgentAssistSuggestion }> {
    return this.fetchJson<{ suggestion: AgentAssistSuggestion }>(
      `/api/calling-engine/${callId}/agent-assist/${id}/apply`,
      { method: 'PATCH' }
    )
  }

  async getCallIntents(organizationId: string, callId: string): Promise<{ intents: CallIntent[] }> {
    return this.fetchJson<{ intents: CallIntent[] }>(`/api/calling-engine/${callId}/intents`)
  }

  async getAIMetrics(organizationId: string, callId: string): Promise<{ metrics: AICallMetrics | null }> {
    return this.fetchJson<{ metrics: AICallMetrics | null }>(`/api/calling-engine/${callId}/metrics`)
  }

  async getAIIntelligence(organizationId: string, callId: string): Promise<{ dashboard: any }> {
    return this.fetchJson<{ dashboard: any }>(`/api/calling-engine/${callId}/intelligence`)
  }
}

export const api = new ApiClient()
