/**
 * Domain Types
 * 
 * Central type definitions for the application.
 * These types are derived from constants and ensure type safety.
 */

import {
  MEMBERSHIP_STATUS,
  MEMBERSHIP_ROLE,
  INVOICE_STATUS,
  RESOLUTION_STATUS,
  RESOLUTION_VISIBILITY,
  PROJECT_STATUS,
  CONSENT_TYPE,
  ERROR_CODE,
} from './constants'

// ============================================
// TYPE EXPORTS FROM CONSTANTS
// ============================================

export type MembershipStatus = typeof MEMBERSHIP_STATUS[keyof typeof MEMBERSHIP_STATUS]
export type MembershipRole = typeof MEMBERSHIP_ROLE[keyof typeof MEMBERSHIP_ROLE]
export type InvoiceStatus = typeof INVOICE_STATUS[keyof typeof INVOICE_STATUS]
export type ResolutionStatus = typeof RESOLUTION_STATUS[keyof typeof RESOLUTION_STATUS]
export type ResolutionVisibility = typeof RESOLUTION_VISIBILITY[keyof typeof RESOLUTION_VISIBILITY]
export type ProjectStatus = typeof PROJECT_STATUS[keyof typeof PROJECT_STATUS]
export type ConsentType = typeof CONSENT_TYPE[keyof typeof CONSENT_TYPE]
export type ErrorCode = typeof ERROR_CODE[keyof typeof ERROR_CODE]

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Type guard for MembershipStatus
 */
export function isMembershipStatus(value: unknown): value is MembershipStatus {
  return typeof value === 'string' && Object.values(MEMBERSHIP_STATUS).includes(value as any)
}

/**
 * Type guard for InvoiceStatus
 */
export function isInvoiceStatus(value: unknown): value is InvoiceStatus {
  return typeof value === 'string' && Object.values(INVOICE_STATUS).includes(value as any)
}

/**
 * Type guard for ResolutionStatus
 */
export function isResolutionStatus(value: unknown): value is ResolutionStatus {
  return typeof value === 'string' && Object.values(RESOLUTION_STATUS).includes(value as any)
}

/**
 * Type guard for MembershipRole
 */
export function isMembershipRole(value: unknown): value is MembershipRole {
  return typeof value === 'string' && Object.values(MEMBERSHIP_ROLE).includes(value as any)
}

// ============================================
// DOMAIN ENTITIES
// ============================================

/**
 * Membership entity with type-safe status and role
 */
export interface Membership {
  id: string
  user_id: string
  org_id: string
  role: MembershipRole
  member_status: MembershipStatus
  status: MembershipStatus // Technical field for RLS
  created_at: string
  updated_at?: string
}

/**
 * Invoice entity with type-safe status
 */
export interface Invoice {
  id: string
  org_id: string
  membership_id: string
  amount: number
  description: string | null
  due_date: string
  status: InvoiceStatus
  created_at: string
  updated_at?: string
}

/**
 * Resolution entity with type-safe status and visibility
 */
export interface Resolution {
  id: string
  org_id: string
  title: string
  content: string | null
  status: ResolutionStatus
  visibility: ResolutionVisibility
  created_by: string
  adopted_by?: string | null
  adopted_at?: string | null
  created_at: string
  updated_at?: string
}

// ============================================
// LEGACY SUPPORT (for gradual migration)
// ============================================

/**
 * @deprecated Use InvoiceStatus type instead
 */
export type InvoiceStatusLegacy = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE'
