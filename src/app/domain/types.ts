import {
  MEMBERSHIP_STATUS,
  PROJECT_STATUS,
  PROJECT_ROLE,
  PROJECT_AUDIT_ACTION,
} from './constants'

export type MembershipStatus =
  (typeof MEMBERSHIP_STATUS)[keyof typeof MEMBERSHIP_STATUS]

export type ProjectStatus =
  (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS]

export type ProjectRole =
  (typeof PROJECT_ROLE)[keyof typeof PROJECT_ROLE]

export type ProjectAuditAction =
  (typeof PROJECT_AUDIT_ACTION)[keyof typeof PROJECT_AUDIT_ACTION]

