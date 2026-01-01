'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

/**
 * Get all organizations (Admin view)
 * 
 * Uses admin client to bypass RLS and fetch all organizations.
 */
export interface OrgAdminView {
  id: string
  name: string
  slug: string
  status: string | null
  created_at: string | null
  memberCount: number
  ownerEmail: string | null
  ownerName: string | null
  hasGovernanceConfig: boolean
  hasProposedRuleset: boolean
  hasActiveRuleset: boolean
  governanceAnswers: Record<string, any> | null
  rulesetContent: string | null
}

export async function getAllOrganizationsAdmin(): Promise<OrgAdminView[]> {
  const supabase = createAdminClient()

  // Fetch all organizations
  const { data: orgs, error: orgsError } = await supabase
    .from('orgs')
    .select('id, name, slug, status, created_at')
    .order('created_at', { ascending: false })

  if (orgsError) {
    console.error('Error fetching organizations:', orgsError)
    return []
  }

  // For each org, get member count and owner info
  const orgsWithDetails = await Promise.all(
    (orgs || []).map(async (org) => {
      // Get member count
      const { count } = await supabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('member_status', 'ACTIVE')

      // Get owner
      const { data: ownerMembership } = await supabase
        .from('memberships')
        .select('user_id, role')
        .eq('org_id', org.id)
        .eq('role', 'OWNER')
        .eq('member_status', 'ACTIVE')
        .limit(1)
        .maybeSingle()

      let ownerEmail: string | null = null
      let ownerName: string | null = null

      if (ownerMembership) {
        // Get owner user info
        const { data: ownerUser } = await supabase.auth.admin.getUserById(
          ownerMembership.user_id
        )
        ownerEmail = ownerUser?.user?.email || null
        ownerName = ownerUser?.user?.user_metadata?.full_name || null
      }

      // Get governance config
      const { data: governanceConfig } = await supabase
        .from('governance_configs')
        .select('answers')
        .eq('org_id', org.id)
        .maybeSingle()

      // Get proposed ruleset
      const { data: proposedRuleset } = await supabase
        .from('org_rulesets')
        .select('answers, generated_text, status')
        .eq('org_id', org.id)
        .eq('status', 'PROPOSED')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Check for active ruleset
      const { data: activeRuleset } = await supabase
        .from('org_rulesets')
        .select('id')
        .eq('org_id', org.id)
        .eq('status', 'ACTIVE')
        .maybeSingle()

      // Determine effective status based on actual state:
      // - ACTIVE only if: org.status is ACTIVE AND has active ruleset
      // - PENDING_REVIEW if: has governance config and PROPOSED ruleset but no ACTIVE ruleset
      // - PENDING if: missing governance config or PROPOSED ruleset
      // - Otherwise use org.status (could be SUSPENDED, etc.)
      let effectiveStatus = org.status
      
      // If org.status is ACTIVE but doesn't have active ruleset, it's not fully active
      if (org.status === 'ACTIVE' && !activeRuleset) {
        if (governanceConfig && proposedRuleset) {
          effectiveStatus = 'PENDING_REVIEW' // Has data but waiting for approval
        } else {
          effectiveStatus = 'PENDING' // Missing data
        }
      } else if (!org.status || org.status === 'PENDING') {
        if (governanceConfig && proposedRuleset && !activeRuleset) {
          effectiveStatus = 'PENDING_REVIEW'
        } else if (!governanceConfig || !proposedRuleset) {
          effectiveStatus = 'PENDING'
        }
      }
      // If org.status is ACTIVE and has active ruleset, keep ACTIVE
      // If org.status is SUSPENDED, keep SUSPENDED

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: effectiveStatus,
        created_at: org.created_at,
        memberCount: count || 0,
        ownerEmail,
        ownerName,
        hasGovernanceConfig: !!governanceConfig,
        hasProposedRuleset: !!proposedRuleset,
        hasActiveRuleset: !!activeRuleset,
        governanceAnswers: governanceConfig?.answers || null,
        rulesetContent: proposedRuleset?.generated_text || proposedRuleset?.answers || null,
      }
    })
  )

  return orgsWithDetails
}

/**
 * Suspend an organization
 */
export async function suspendOrganization(
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('orgs')
    .update({ status: 'SUSPENDED' })
    .eq('id', orgId)

  if (error) {
    console.error('Error suspending organization:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin')
  return { success: true }
}

/**
 * Activate an organization (approve pending)
 * 
 * CRITICAL: This function activates an organization by:
 * 1. Updating orgs.status to 'ACTIVE'
 * 2. Activating the PROPOSED ruleset (status -> 'ACTIVE')
 * 3. Sending email to Chairman
 * 4. Logging audit trail
 */
export async function activateOrganizationAdmin(
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  // Verify admin client is using service role
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    console.error('ORG_ACTIVATION_CRITICAL: SUPABASE_SERVICE_ROLE_KEY not set!')
    return { success: false, error: 'Admin client not configured properly' }
  }
  
  console.log('ORG_ACTIVATION_START: Using admin client with service role', {
    orgId,
    hasServiceRoleKey: !!serviceRoleKey,
    serviceRoleKeyLength: serviceRoleKey.length,
  })

  const supabase = createAdminClient()

  // Step 1: Get org details (for email and logging)
  const { data: org, error: orgFetchError } = await supabase
    .from('orgs')
    .select('id, name, slug')
    .eq('id', orgId)
    .single()

  if (orgFetchError) {
    console.error('Error fetching org for activation:', orgFetchError)
    return { success: false, error: 'Organizacija nerasta' }
  }

  // Step 2: Activate the PROPOSED ruleset first (if exists)
  console.log('ORG_ACTIVATION_STEP2: Checking for PROPOSED ruleset', { orgId })
  
  const { data: proposedRuleset, error: rulesetError } = await supabase
    .from('org_rulesets')
    .select('id, status')
    .eq('org_id', orgId)
    .eq('status', 'PROPOSED')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (rulesetError && rulesetError.code !== 'PGRST116') {
    console.error('ORG_ACTIVATION_STEP2_ERROR: Error fetching proposed ruleset:', rulesetError)
    // Don't fail - ruleset might not exist yet, but log it
  }

  console.log('ORG_ACTIVATION_STEP2_RESULT:', {
    orgId,
    hasProposedRuleset: !!proposedRuleset,
    rulesetId: proposedRuleset?.id,
  })

  if (proposedRuleset) {
    console.log('ORG_ACTIVATION_STEP2: Activating PROPOSED ruleset', {
      orgId,
      rulesetId: proposedRuleset.id,
    })

    // Get current user for approved_by
    const { data: { user } } = await supabase.auth.getUser()
    const approvedBy = user?.id || null

    // Update ruleset to ACTIVE
    const updateData: any = {
      status: 'ACTIVE',
      approved_at: new Date().toISOString(),
    }
    
    // Add approved_by if we have user
    if (approvedBy) {
      updateData.approved_by = approvedBy
    }

    console.log('ORG_ACTIVATION_STEP2: Attempting UPDATE with data:', {
      orgId,
      rulesetId: proposedRuleset.id,
      updateData,
    })

    // Try using SQL function first (bypasses RLS)
    console.log('ORG_ACTIVATION_STEP2: Attempting to use SQL function', {
      orgId,
      rulesetId: proposedRuleset.id,
      approvedBy,
    })

    const { data: functionResult, error: functionError } = await supabase
      .rpc('activate_ruleset_admin', {
        p_ruleset_id: proposedRuleset.id,
        p_approved_by: approvedBy,
      })

    console.log('ORG_ACTIVATION_STEP2: Function call result', {
      orgId,
      rulesetId: proposedRuleset.id,
      hasResult: !!functionResult,
      resultType: typeof functionResult,
      isArray: Array.isArray(functionResult),
      resultLength: functionResult?.length,
      functionResult: JSON.stringify(functionResult),
      functionError: functionError?.message,
      functionErrorCode: functionError?.code,
      functionErrorDetails: functionError?.details,
      functionErrorHint: functionError?.hint,
    })

    let rulesetActivated = false

    if (functionError) {
      console.error('ORG_ACTIVATION_STEP2_ERROR: Function call failed', {
        orgId,
        rulesetId: proposedRuleset.id,
        error: functionError,
        code: functionError.code,
        message: functionError.message,
        details: functionError.details,
        hint: functionError.hint,
      })
    } else if (functionResult) {
      // Function returned data - check format
      let result: any = null
      
      if (Array.isArray(functionResult)) {
        result = functionResult[0]
      } else if (typeof functionResult === 'object') {
        // Might be single object instead of array
        result = functionResult
      }
      
      if (result) {
        console.log('ORG_ACTIVATION_STEP2: Parsed function result', {
          orgId,
          rulesetId: proposedRuleset.id,
          result,
          success: result.success,
          error_message: result.error_message,
        })
        
        if (result.success === true) {
          // Function succeeded
          console.log('ORG_ACTIVATION_STEP2_SUCCESS: Ruleset activated via SQL function', {
            orgId,
            rulesetId: proposedRuleset.id,
            functionResult: result,
          })
          rulesetActivated = true
        } else {
          console.error('ORG_ACTIVATION_STEP2_ERROR: Function returned error', {
            orgId,
            rulesetId: proposedRuleset.id,
            errorMessage: result.error_message,
            functionResult: result,
          })
        }
      } else {
        console.warn('ORG_ACTIVATION_STEP2_WARNING: Could not parse function result', {
          orgId,
          rulesetId: proposedRuleset.id,
          functionResult,
        })
      }
    }

    if (!rulesetActivated) {
      // Fallback to direct UPDATE (should work with service role)
      console.log('ORG_ACTIVATION_STEP2: Function not available or failed, using direct UPDATE', {
        orgId,
        rulesetId: proposedRuleset.id,
        functionError: functionError?.message,
        functionErrorCode: functionError?.code,
      })

      const { data: updatedRuleset, error: rulesetUpdateError } = await supabase
        .from('org_rulesets')
        .update(updateData)
        .eq('id', proposedRuleset.id)
        .select('id, status, approved_at, approved_by')
        .single()

      if (rulesetUpdateError) {
        console.error('ORG_ACTIVATION_STEP2_ERROR: Failed to activate ruleset:', {
          error: rulesetUpdateError,
          code: rulesetUpdateError.code,
          message: rulesetUpdateError.message,
          details: rulesetUpdateError.details,
          hint: rulesetUpdateError.hint,
          orgId,
          rulesetId: proposedRuleset.id,
          updateData,
        })
        return { success: false, error: `Nepavyko aktyvuoti ruleset: ${rulesetUpdateError.message || rulesetUpdateError.code}` }
      }

      if (!updatedRuleset) {
        console.error('ORG_ACTIVATION_STEP2_ERROR: No ruleset returned after UPDATE', {
          orgId,
          rulesetId: proposedRuleset.id,
        })
        return { success: false, error: 'Ruleset nebuvo grąžintas po UPDATE' }
      }

      if (updatedRuleset.status !== 'ACTIVE') {
        console.error('ORG_ACTIVATION_STEP2_ERROR: Ruleset status is not ACTIVE after UPDATE', {
          orgId,
          rulesetId: proposedRuleset.id,
          expectedStatus: 'ACTIVE',
          actualStatus: updatedRuleset.status,
          updatedRuleset,
        })
        return { success: false, error: `Ruleset status yra ${updatedRuleset.status}, o ne ACTIVE` }
      }

      console.log('ORG_ACTIVATION_STEP2_SUCCESS: Ruleset activated via direct UPDATE', {
        orgId,
        rulesetId: updatedRuleset.id,
        status: updatedRuleset.status,
      })
      rulesetActivated = true
    }

    // Verify ruleset is ACTIVE
    if (rulesetActivated) {
      const { data: verifyRuleset } = await supabase
        .from('org_rulesets')
        .select('id, status')
        .eq('id', proposedRuleset.id)
        .single()

      if (verifyRuleset && verifyRuleset.status === 'ACTIVE') {
        console.log('ORG_ACTIVATION_STEP2_VERIFIED: Ruleset confirmed as ACTIVE', {
          orgId,
          rulesetId: verifyRuleset.id,
          status: verifyRuleset.status,
        })
      } else {
        console.error('ORG_ACTIVATION_STEP2_VERIFY_ERROR: Ruleset not ACTIVE after activation', {
          orgId,
          rulesetId: proposedRuleset.id,
          verifyRuleset,
        })
      }
    }
  } else {
    // If no PROPOSED ruleset, check if ACTIVE ruleset already exists
    console.log('ORG_ACTIVATION_STEP2: No PROPOSED ruleset, checking for existing ACTIVE ruleset', { orgId })
    
    const { data: activeRuleset } = await supabase
      .from('org_rulesets')
      .select('id')
      .eq('org_id', orgId)
      .eq('status', 'ACTIVE')
      .maybeSingle()

    if (!activeRuleset) {
      console.warn('ORG_ACTIVATION_STEP2_WARNING: No PROPOSED ruleset found and no ACTIVE ruleset exists.', { orgId })
      
      // Try to create ACTIVE ruleset from governance config
      console.log('ORG_ACTIVATION_STEP2: Attempting to create ACTIVE ruleset from governance config', { orgId })
      
      const { data: governanceConfig } = await supabase
        .from('governance_configs')
        .select('id, answers')
        .eq('org_id', orgId)
        .maybeSingle()

      if (governanceConfig && governanceConfig.answers) {
        // Get current user for created_by
        const { data: { user } } = await supabase.auth.getUser()
        const createdBy = user?.id || null

        // Check which columns exist in org_rulesets table
        // Based on error messages, it has: answers, generated_text (both NOT NULL)
        const { data: newRuleset, error: createError } = await supabase
          .from('org_rulesets')
          .insert({
            org_id: orgId,
            status: 'ACTIVE',
            answers: governanceConfig.answers,  // Use answers column (JSONB)
            generated_text: JSON.stringify(governanceConfig.answers),  // Use generated_text column (TEXT)
            created_by: createdBy,
            approved_at: new Date().toISOString(),
            approved_by: createdBy,
          })
          .select('id, status')
          .single()

        if (createError) {
          console.error('ORG_ACTIVATION_STEP2_ERROR: Failed to create ACTIVE ruleset from governance config', {
            orgId,
            error: createError,
            code: createError.code,
            message: createError.message,
          })
          // Don't fail - allow activation without ruleset (edge case)
        } else {
          console.log('ORG_ACTIVATION_STEP2_SUCCESS: Created ACTIVE ruleset from governance config', {
            orgId,
            rulesetId: newRuleset.id,
            status: newRuleset.status,
          })
        }
      } else {
        console.warn('ORG_ACTIVATION_STEP2_WARNING: No governance config found to create ruleset from', { orgId })
        // Don't fail - allow activation without ruleset (edge case)
      }
    } else {
      console.log('ORG_ACTIVATION_STEP2: ACTIVE ruleset already exists', {
        orgId,
        rulesetId: activeRuleset.id,
      })
    }
  }

  // Step 3: Update org status to ACTIVE
  console.log('ORG_ACTIVATION_STEP3: Updating org status to ACTIVE', { orgId })
  
  const { data: updatedOrg, error: orgError } = await supabase
    .from('orgs')
    .update({ status: 'ACTIVE' })
    .eq('id', orgId)
    .select()
    .single()

  if (orgError) {
    console.error('ORG_ACTIVATION_ERROR: Failed to update org status:', orgError)
    return { success: false, error: orgError.message }
  }

  if (!updatedOrg) {
    console.error('ORG_ACTIVATION_ERROR: No organization found after activation')
    return { success: false, error: 'Organizacija nerasta po aktyvacijos' }
  }

  console.log('ORG_ACTIVATION_STEP3_SUCCESS: Org status updated', {
    orgId,
    newStatus: updatedOrg.status,
    orgName: updatedOrg.name,
  })

  // Step 4: Verify activation was successful
  console.log('ORG_ACTIVATION_STEP4: Verifying activation', { orgId })
  
  // Check if org is now ACTIVE
  const { data: verifyOrg } = await supabase
    .from('orgs')
    .select('id, status')
    .eq('id', orgId)
    .single()

  if (!verifyOrg || verifyOrg.status !== 'ACTIVE') {
    console.error('ORG_ACTIVATION_STEP4_ERROR: Org status verification failed', {
      orgId,
      expectedStatus: 'ACTIVE',
      actualStatus: verifyOrg?.status,
    })
    return { success: false, error: 'Organizacijos statusas nebuvo atnaujintas teisingai' }
  }

  // Check if ruleset is ACTIVE (if it existed or was created)
  const { data: verifyRuleset } = await supabase
    .from('org_rulesets')
    .select('id, status')
    .eq('org_id', orgId)
    .eq('status', 'ACTIVE')
    .maybeSingle()

  if (!verifyRuleset) {
    console.warn('ORG_ACTIVATION_STEP4_WARNING: No ACTIVE ruleset found after activation. This is an inconsistent state.', {
      orgId,
      hadProposedRuleset: !!proposedRuleset,
    })
    // Don't fail - org is ACTIVE, but ruleset is missing
    // This can happen if ruleset was never created or was deleted
  } else {
    console.log('ORG_ACTIVATION_STEP4_SUCCESS: Ruleset verified as ACTIVE', {
      orgId,
      rulesetId: verifyRuleset.id,
      status: verifyRuleset.status,
    })
  }

  // Step 5: Get Chairman (OWNER) info for email (non-blocking)
  let chairmanEmail: string | null = null
  let chairmanName: string | null = null

  try {
    const { data: ownerMembership } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('role', 'OWNER')
      .eq('member_status', 'ACTIVE')
      .limit(1)
      .maybeSingle()

    if (ownerMembership) {
      try {
        const { data: ownerUser } = await supabase.auth.admin.getUserById(
          ownerMembership.user_id
        )
        chairmanEmail = ownerUser?.user?.email || null
        chairmanName = ownerUser?.user?.user_metadata?.full_name || null
      } catch (error) {
        console.warn('ORG_ACTIVATION_STEP5_WARNING: Failed to get owner user info for email', error)
      }
    }
  } catch (error) {
    console.warn('ORG_ACTIVATION_STEP5_WARNING: Failed to get owner membership for email', error)
  }

  // Step 6: Send email to Chairman (non-blocking, fail silently)
  if (chairmanEmail && org) {
    try {
      const { sendOrgActivatedEmail } = await import('@/lib/email')
      sendOrgActivatedEmail({
        orgName: org.name,
        orgSlug: org.slug,
        chairmanEmail,
        chairmanName,
      }).catch((error) => {
        console.error('EMAIL INCIDENT: Failed to send org activated email (non-blocking):', error)
      })
    } catch (error) {
      console.warn('EMAIL INCIDENT: Failed to import or send org activated email (non-blocking):', error)
    }
  }

  // Step 7: Audit logging (soft mode, non-blocking)
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          org_id: orgId,
          user_id: user.id,
          action: 'ORG_ACTIVATED',
          target_table: 'orgs',
          target_id: orgId,
          old_value: null,
          new_value: { status: 'ACTIVE' },
        })

      if (auditError) {
        console.error('AUDIT INCIDENT: Failed to log ORG_ACTIVATED (non-blocking):', auditError)
      }
    }
  } catch (error) {
    console.warn('AUDIT INCIDENT: Failed to log ORG_ACTIVATED (non-blocking):', error)
  }

  // Step 7: Revalidate paths
  revalidatePath('/admin')
  revalidatePath('/dashboard', 'layout')
  revalidatePath('/onboarding', 'page')

  console.log('ORG_ACTIVATED_SUCCESS:', {
    orgId,
    orgName: org.name,
    chairmanEmail,
    rulesetActivated: !!proposedRuleset,
  })

  return { success: true }
}

