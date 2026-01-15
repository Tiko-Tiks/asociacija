'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { revalidatePath } from 'next/cache'
import type { ComplianceValidation, ComplianceIssue } from './governance-compliance-types'

// ==================================================
// GET COMPLIANCE STATUS
// ==================================================

/**
 * Get compliance status for an organization
 */
export async function getOrgCompliance(orgId: string): Promise<{
  status: string
  schema_version_no: number | null
  last_validated_at: string | null
  issues: ComplianceIssue[]
} | null> {
  const supabase = await createClient()
  await requireAuth(supabase)

  // Get config status
  const { data: config, error: configError }: any = await supabase
    .from('governance_configs')
    .select('compliance_status, schema_version_no, last_validated_at')
    .eq('org_id', orgId)
    .single()

  if (configError) {
    if (configError.code === '42501') {
      authViolation()
    }
    console.error('Error fetching compliance:', configError)
    return null
  }

  // Get unresolved issues
  const { data: issues, error: issuesError } = await supabase
    .from('governance_compliance_issues')
    .select('*')
    .eq('org_id', orgId)
    .is('resolved_at', null)
    .order('severity', { ascending: false })
    .order('created_at', { ascending: false })

  if (issuesError) {
    console.error('Error fetching issues:', issuesError)
  }

  return {
    status: config?.compliance_status || 'UNKNOWN',
    schema_version_no: config?.schema_version_no || null,
    last_validated_at: config?.last_validated_at || null,
    issues: (issues || []) as ComplianceIssue[],
  }
}

// ==================================================
// VALIDATE COMPLIANCE
// ==================================================

/**
 * Validate organization compliance
 */
export async function validateOrgCompliance(
  orgId: string
): Promise<ComplianceValidation | null> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error }: any = await (supabase as any).rpc('validate_governance_for_org', {
    p_org_id: orgId,
  })

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error validating compliance:', error)
    return null
  }

  const result = data?.[0]
  if (!result) {
    return null
  }

  // Upsert issues
  const { error: issuesError } = await (supabase as any).rpc('upsert_compliance_issues', {
    p_org_id: orgId,
    p_schema_version_no: result.schema_version_no,
    p_missing_required: result.missing_required || [],
    p_invalid_types: result.invalid_types || [],
    p_inactive_answered: result.inactive_answered || [],
  })
  
  if (issuesError) {
    console.error('Error upserting compliance issues:', issuesError)
  }

  // Update config status
  const { error: updateError }: any = await (supabase as any)
    .from('governance_configs')
    .update({
      compliance_status: result.status,
      last_validated_at: new Date().toISOString(),
    })
    .eq('org_id', orgId)
  
  if (updateError) {
    console.error('Error updating compliance status:', updateError)
  }
  
  console.log('Compliance validation completed:', {
    orgId,
    status: result.status,
    missing: result.missing_required?.length || 0,
    invalid: result.invalid_types?.length || 0,
    inactive: result.inactive_answered?.length || 0,
    details: result.details,
  })

  return {
    ok: result.ok,
    status: result.status,
    schema_version_no: result.schema_version_no,
    missing_required: result.missing_required || [],
    invalid_types: result.invalid_types || [],
    inactive_answered: result.inactive_answered || [],
    details: result.details || {},
  }
}

// ==================================================
// MARK COMPLIANCE OK
// ==================================================

/**
 * Mark organization as compliant (after fixing issues)
 */
export async function markOrgComplianceOk(
  orgId: string,
  schemaVersionNo: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  await requireAuth(supabase)

  const { data, error }: any = await (supabase as any).rpc(
    'set_governance_schema_version_for_org',
    {
      p_org_id: orgId,
      p_schema_version_no: schemaVersionNo,
    }
  )

  if (error) {
    if (error.code === '42501') {
      authViolation()
    }
    console.error('Error marking compliance OK:', error)
    return {
      success: false,
      error: error.message || 'Failed to mark compliance as OK',
    }
  }

  const result = data?.[0]
  if (!result?.ok) {
    return {
      success: false,
      error: result?.reason || 'Failed to mark compliance as OK',
    }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

// ==================================================
// CHECK IF ACTION IS ALLOWED
// ==================================================

/**
 * Check if a critical action is allowed (compliance check)
 */
export async function checkActionAllowed(
  orgId: string,
  action: string
): Promise<{
  allowed: boolean
  reason?: string
  missing_keys?: string[]
  status?: string
}> {
  const validation = await validateOrgCompliance(orgId)

  if (!validation) {
    return {
      allowed: false,
      reason: 'VALIDATION_FAILED',
    }
  }

  // Block if INVALID
  if (validation.status === 'INVALID') {
    return {
      allowed: false,
      reason: 'INVALID_COMPLIANCE',
      missing_keys: validation.missing_required,
      status: validation.status,
    }
  }

  // Allow if OK or NEEDS_UPDATE (warnings only)
  return {
    allowed: true,
    status: validation.status,
  }
}

