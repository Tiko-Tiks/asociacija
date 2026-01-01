import { MEMBERSHIP_STATUS, PROJECT_STATUS, PROJECT_ROLE, PROJECT_AUDIT_ACTION, INVOICE_STATUS, MEMBERSHIP_ROLE, MEDIA_CATEGORY, MEDIA_OBJECT_TYPE } from './constants'

export type MembershipStatus =
  (typeof MEMBERSHIP_STATUS)[keyof typeof MEMBERSHIP_STATUS]

export type ProjectStatus =
  (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS]

export type ProjectRole =
  (typeof PROJECT_ROLE)[keyof typeof PROJECT_ROLE]

export type ProjectAuditAction =
  (typeof PROJECT_AUDIT_ACTION)[keyof typeof PROJECT_AUDIT_ACTION]

export type InvoiceStatus =
  (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS]

export type MembershipRole =
  (typeof MEMBERSHIP_ROLE)[keyof typeof MEMBERSHIP_ROLE]

export type MediaCategory =
  (typeof MEDIA_CATEGORY)[keyof typeof MEDIA_CATEGORY]

export type MediaObjectType =
  (typeof MEDIA_OBJECT_TYPE)[keyof typeof MEDIA_OBJECT_TYPE]
