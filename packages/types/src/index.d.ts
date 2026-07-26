export type UserRole = 'super_admin' | 'org_admin' | 'agent' | 'viewer';
export interface User {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    organizationId: string;
    createdAt: string;
    updatedAt: string;
}
export interface Organization {
    id: string;
    name: string;
    slug: string;
    plan: 'starter' | 'growth' | 'enterprise';
    createdAt: string;
    updatedAt: string;
}
export type CallStatus = 'queued' | 'ringing' | 'connected' | 'ended' | 'failed';
export interface Call {
    id: string;
    organizationId: string;
    campaignId: string;
    contactId: string;
    agentId?: string;
    status: CallStatus;
    direction: 'outbound' | 'inbound';
    startedAt?: string;
    endedAt?: string;
    durationSeconds: number;
    recordingUrl?: string;
    transcript?: string;
    summary?: string;
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed';
export interface Campaign {
    id: string;
    organizationId: string;
    name: string;
    status: CampaignStatus;
    script: string;
    voice: string;
    scheduledAt?: string;
    contactsCount: number;
    completedCount: number;
    createdAt: string;
    updatedAt: string;
}
export interface OrganizationSettings {
    id: string;
    organizationId: string;
    maxConcurrentCalls: number;
    maxAgents: number;
    callRecordingEnabled: boolean;
    aiTtsVoiceId: string | null;
    aiSttProvider: string | null;
    defaultCallerId: string | null;
    aiGreeting: string | null;
    aiFallbackMessage: string | null;
    complianceDndCheck: boolean;
    complianceConsentRequired: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
}
export * from './zod';
//# sourceMappingURL=index.d.ts.map