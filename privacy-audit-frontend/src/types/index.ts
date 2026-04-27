export interface AuditEvent {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantUserId: string;
  eventId: string;
  actionCode: 'READ' | 'EXPORT' | 'DELETE' | 'SHARE';
  actionLabel: string;
  dataFields: string[];
  reasonCode: string;
  reasonLabel: string;
  actorType: 'SYSTEM' | 'EMPLOYEE' | 'THIRD_PARTY' | 'OTHER_USER';
  actorLabel: string;
  actorIdentifier: string | null;
  sensitivityCode: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  thirdPartyInvolved: boolean;
  thirdPartyName: string | null;
  retentionDays: number;
  region: string | null;
  consentObtained: boolean;
  userOptedOut: boolean;
  meta: Record<string, string> | null;
  occurredAt: string;
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
}

// 'all' = all events; any other string = tenantId UUID to filter by
export type TenantFilter = string;

export interface ExportRequest {
  requestId: string;
  status: 'requested' | 'processing' | 'completed' | 'failed';
  eventCount: number | null;
  downloadAvailable: boolean;
  downloadExpiresAt: string | null;
  requestedAt: string;
  completedAt: string | null;
}

export interface DeletionRequest {
  requestId: string;
  status: 'requested' | 'processing' | 'completed' | 'failed';
  eventsDeleted: number | null;
  requestedAt: string;
  completedAt: string | null;
}

export interface LinkedAccount {
  id: string;
  tenantId: string;
  tenantUserId: string;
  linkedAt: string;
}

export interface DashboardUser {
  id: string;
  googleId: string;
  email: string;
  name: string;
  picture: string | null;
  linkedAccounts: LinkedAccount[];
}

export interface RiskAlert {
  id: string;
  eventId: string;
  riskScore: number;
  explanation: string;
  createdAt: string;
}
