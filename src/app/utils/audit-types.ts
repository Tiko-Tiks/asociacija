// Types and constants for audit logging
// Separated from audit.ts to avoid "use server" export restrictions

export interface AuditLogEntry {
  orgId: string
  userId: string | null
  action: string
  targetTable: string
  targetId: string | null
  oldValue?: any
  newValue?: any
  metadata?: Record<string, any>
}

export interface AuditResult {
  success: boolean
  error?: any
}

/**
 * Pre-defined audit actions for consistency
 */
export const AUDIT_ACTIONS = {
  // Membership
  MEMBER_REGISTRATION: 'MEMBER_REGISTRATION',
  MEMBER_STATUS_CHANGE: 'MEMBER_STATUS_CHANGE',
  MEMBER_ROLE_CHANGE: 'MEMBER_ROLE_CHANGE',
  
  // Governance
  GOVERNANCE_ANSWERS_SUBMITTED: 'GOVERNANCE_ANSWERS_SUBMITTED',
  GOVERNANCE_ACTIVATED: 'GOVERNANCE_ACTIVATED',
  GOVERNANCE_UPDATED: 'GOVERNANCE_UPDATED',
  
  // Voting
  VOTE_CREATED: 'VOTE_CREATED',
  VOTE_CAST: 'VOTE_CAST',
  VOTE_CLOSED: 'VOTE_CLOSED',
  VOTE_OUTCOME_APPLIED: 'VOTE_OUTCOME_APPLIED',
  
  // Resolutions
  RESOLUTION_CREATED: 'RESOLUTION_CREATED',
  RESOLUTION_STATUS_CHANGE: 'RESOLUTION_STATUS_CHANGE',
  RESOLUTION_APPROVED: 'RESOLUTION_APPROVED',
  RESOLUTION_REJECTED: 'RESOLUTION_REJECTED',
  
  // Invoices
  INVOICE_CREATED: 'INVOICE_CREATED',
  INVOICE_STATUS_CHANGE: 'INVOICE_STATUS_CHANGE',
  INVOICE_GENERATED: 'INVOICE_GENERATED',
  
  // Meetings
  MEETING_CREATED: 'MEETING_CREATED',
  MEETING_PUBLISHED: 'MEETING_PUBLISHED',
  MEETING_CANCELLED: 'MEETING_CANCELLED',
  
  // Organization
  ORG_CREATED: 'ORG_CREATED',
  ORG_ACTIVATED: 'ORG_ACTIVATED',
  ORG_STATUS_CHANGE: 'ORG_STATUS_CHANGE',
  ORG_SETTINGS_CHANGE: 'ORG_SETTINGS_CHANGE',
} as const

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS]
