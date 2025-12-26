export const MEMBERSHIP_STATUS = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const

export const PROJECT_STATUS = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const

export const ERROR_CODE = {
  AUTH: 'auth_violation',
  CROSS_ORG: 'cross_org_violation',
  OPERATION_FAILED: 'operation_failed',
} as const

export const PROJECT_ROLE = {
  OWNER: 'OWNER',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER',
} as const

export const PROJECT_AUDIT_ACTION = {
  MEMBER_ADDED: 'MEMBER_ADDED',
  ROLE_CHANGED: 'ROLE_CHANGED',
  MEMBER_REMOVED: 'MEMBER_REMOVED',
} as const

