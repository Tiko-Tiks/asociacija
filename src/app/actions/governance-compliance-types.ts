// Types for governance compliance
// Separated from governance-compliance.ts to avoid "use server" export restrictions

export interface ComplianceValidation {
  ok: boolean
  status: 'OK' | 'NEEDS_UPDATE' | 'INVALID' | 'UNKNOWN'
  schema_version_no: number
  missing_required: string[]
  invalid_types: Array<{
    question_key: string
    expected: string
    actual_type: string
    value: string
  }>
  inactive_answered: string[]
  details: {
    org_version?: number
    schema_version: number
    version_mismatch: boolean
  }
}

export interface ComplianceIssue {
  id: string
  org_id: string
  schema_version_no: number
  issue_code: string
  severity: 'warning' | 'error'
  question_key: string | null
  message: string
  details: Record<string, any> | null
  created_at: string
  resolved_at: string | null
}
