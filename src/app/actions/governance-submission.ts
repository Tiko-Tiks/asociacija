'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation, operationFailed } from '@/app/domain/errors'
import { requireOnboardingAccess } from '@/app/domain/guards/onboardingAccess'
import { hasAllRequiredConsents } from './consents'
import { sendGovernanceSubmissionEmail } from '@/lib/email'
import { revalidatePath } from 'next/cache'

/**
 * Governance Questions Submission (B3.1.2)
 * 
 * Chairman submits governance answers during onboarding.
 * Requires requireOnboardingAccess(orgId) - user must be OWNER and org must NOT be ACTIVE.
 * 
 * Writes:
 * - governance_configs
 * - org_rulesets (status = PROPOSED)
 * 
 * Answers are MACHINE-READABLE.
 * Text can be placeholder.
 * 
 * CRITICAL: This action is ONLY available during onboarding.
 * After org activation, governance submission is read-only.
 */

export interface GovernanceAnswers {
  [key: string]: string | number | boolean
}

/**
 * Submit governance answers
 * 
 * @param orgId - Organization ID
 * @param answers - Machine-readable answers object
 * @param allowUpdateForActive - Allow updating even if org is ACTIVE (for compliance fixes)
 * @returns Success status
 */
export async function submitGovernanceAnswers(
  orgId: string,
  answers: GovernanceAnswers,
  allowUpdateForActive: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const user = await requireAuth(supabase)

    // Step 1: Check access
    console.log('GOVERNANCE_SUBMISSION_START:', {
      orgId,
      userId: user.id,
      userEmail: user.email,
      allowUpdateForActive,
    })
    
    if (allowUpdateForActive) {
      // For compliance fixes: only check if user is OWNER
      const { data: membership }: any = await supabase
        .from('memberships')
        .select('role, member_status')
        .eq('user_id', user.id)
        .eq('org_id', orgId)
        .eq('member_status', 'ACTIVE')
        .maybeSingle()
      
      if (!membership || membership.role !== 'OWNER') {
        return { 
          success: false, 
          error: 'Tik pirmininkas (OWNER) gali atnaujinti valdymo atsakymus' 
        }
      }
      console.log('GOVERNANCE_SUBMISSION_ACCESS_GRANTED (compliance fix):', { orgId })
    } else {
      // For onboarding: use existing check
      try {
        await requireOnboardingAccess(orgId)
        console.log('GOVERNANCE_SUBMISSION_ACCESS_GRANTED:', { orgId })
      } catch (error: any) {
        console.error('GOVERNANCE_SUBMISSION_ACCESS_DENIED:', {
          orgId,
          errorCode: error?.code,
          errorMessage: error?.message,
          userId: user.id,
          errorStack: error?.stack,
        })
        
        if (error?.code === 'access_denied' || error?.code === 'auth_violation') {
          // Provide more specific error message
          let errorMessage = 'Neturite teisių pateikti valdymo atsakymus arba organizacija jau aktyvuota'
          
          // Try to get more details about why access was denied
          const supabaseCheck = await createClient()
          const { data: membershipCheck }: any = await supabaseCheck
            .from('memberships')
            .select('role, member_status')
            .eq('user_id', user.id)
            .eq('org_id', orgId)
            .maybeSingle()
          
          const { data: orgCheck }: any = await supabaseCheck
            .from('orgs')
            .select('status')
            .eq('id', orgId)
            .maybeSingle()
          
          if (!membershipCheck || membershipCheck.role !== 'OWNER') {
            errorMessage = 'Tik pirmininkas (OWNER) gali pateikti valdymo atsakymus'
          } else if (orgCheck && orgCheck.status === 'ACTIVE') {
            errorMessage = 'Organizacija jau aktyvuota. Valdymo atsakymų pateikti negalima.'
          }
          
          return { success: false, error: errorMessage }
        }
        throw error
      }
    }

  // Step 2: Validate answers
  if (!answers || Object.keys(answers).length === 0) {
    return { success: false, error: 'Atsakymai yra privalomi' }
  }

  // Step 3: Check if governance config exists
  console.log('GOVERNANCE_SUBMISSION_CHECK_CONFIG:', { orgId })
  const { data: existingConfig, error: configCheckError }: any = await supabase
    .from('governance_configs')
    .select('id')
    .eq('org_id', orgId)
    .maybeSingle()

  if (configCheckError && configCheckError.code !== 'PGRST116') {
    if (configCheckError?.code === '42501') {
      authViolation()
    }
    console.error('GOVERNANCE_SUBMISSION_CONFIG_CHECK_ERROR:', {
      error: configCheckError,
      code: configCheckError?.code,
      message: configCheckError?.message,
      orgId,
    })
    operationFailed()
  }
  
  console.log('GOVERNANCE_SUBMISSION_CONFIG_CHECK_RESULT:', {
    orgId,
    hasExistingConfig: !!existingConfig,
    configId: existingConfig?.id,
  })

  let configId: string | null = null

  if (existingConfig) {
    // Update existing config (allow re-submission during onboarding)
    console.log('Updating existing governance config', { 
      orgId, 
      configId: existingConfig.id,
      answersCount: Object.keys(answers).length,
      answersKeys: Object.keys(answers).slice(0, 10), // First 10 keys for debugging
    })
    const { data: updatedConfig, error: updateError }: any = await supabase
      .from('governance_configs')
      .update({
        answers: answers,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingConfig.id)
      .select('id, answers')
      .single()
    
    if (updatedConfig) {
      console.log('Config updated successfully', {
        configId: updatedConfig.id,
        answersCount: Object.keys(updatedConfig.answers || {}).length,
      })
    }

    if (updateError) {
      if (updateError?.code === '42501') {
        authViolation()
      }
      console.error('Error updating governance config:', updateError)
      return { success: false, error: 'Nepavyko atnaujinti valdymo konfigūracijos' }
    }
    configId = updatedConfig?.id || existingConfig.id
  } else {
    // Insert new config
    console.log('Creating new governance config', { orgId })
    const { data: newConfig, error: insertError }: any = await supabase
      .from('governance_configs')
      .insert({
        org_id: orgId,
        answers: answers,
        // active_config is JSONB and nullable, so we can omit it or set to null
        // If needed, it can be set to a JSONB value later
      })
      .select('id')
      .single()

    if (insertError) {
      if (insertError?.code === '42501') {
        authViolation()
      }
      if (insertError?.code === '42P01') {
        return { success: false, error: 'Valdymo konfigūracijos lentelė neegzistuoja' }
      }
      // Log detailed error for debugging
      console.error('Error inserting governance config:', {
        error: insertError,
        code: insertError?.code,
        message: insertError?.message,
        details: insertError?.details,
        hint: insertError?.hint,
        orgId,
        userId: user.id,
      })
      return { 
        success: false, 
        error: `Nepavyko sukurti valdymo konfigūracijos: ${insertError?.message || insertError?.code || 'Nežinoma klaida'}` 
      }
    }
    configId = newConfig?.id || null
  }

  // Step 4: Create or update org_ruleset with status = PROPOSED
  // Check if PROPOSED ruleset already exists
  const { data: existingProposedRuleset }: any = await supabase
    .from('org_rulesets')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'PROPOSED')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingProposedRuleset) {
    // Update existing PROPOSED ruleset
    const { error: updateRulesetError }: any = await supabase
      .from('org_rulesets')
      .update({
        answers: answers,  // Use answers column (JSONB)
        generated_text: JSON.stringify(answers),  // Use generated_text column (TEXT)
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingProposedRuleset.id)

    if (updateRulesetError) {
      if (updateRulesetError?.code === '42501') {
        authViolation()
      }
      console.error('Error updating ruleset:', updateRulesetError)
      // Don't fail the operation - config was saved
    } else {
      console.log('Updated existing PROPOSED ruleset', { orgId, rulesetId: existingProposedRuleset.id })
    }
  } else {
    // Create new PROPOSED ruleset
    const { error: rulesetError }: any = await supabase
      .from('org_rulesets')
      .insert({
        org_id: orgId,
        status: 'PROPOSED',
        answers: answers,  // Use answers column (JSONB)
        generated_text: JSON.stringify(answers),  // Use generated_text column (TEXT)
        created_by: user.id,
      })

    if (rulesetError) {
      if (rulesetError?.code === '42501') {
        authViolation()
      }
      if (rulesetError?.code === '42P01') {
        // Table doesn't exist - log but don't fail
        console.error('AUDIT INCIDENT: org_rulesets table does not exist')
      } else {
        // Log detailed error for debugging
        console.error('Error creating ruleset:', {
          error: rulesetError,
          code: rulesetError?.code,
          message: rulesetError?.message,
          details: rulesetError?.details,
          hint: rulesetError?.hint,
          orgId,
          userId: user.id,
        })
        // Don't fail the operation - config was saved, but log the error
      }
    } else {
      console.log('Created new PROPOSED ruleset', { orgId })
    }
  }

  // Step 5: Soft audit logging
  const { error: auditError }: any = await supabase
    .from('audit_logs')
    .insert({
      org_id: orgId,
      user_id: user.id,
      action: 'GOVERNANCE_ANSWERS_SUBMITTED',
      target_table: 'governance_configs',
      target_id: configId,
      old_value: null,
      new_value: { answers },
    })

  if (auditError) {
    // SOFT AUDIT MODE: Log incident but don't fail
    console.error('AUDIT INCIDENT: Failed to log GOVERNANCE_ANSWERS_SUBMITTED:', auditError)
  }

  // Step 6: Check if all consents are accepted, then send email to Platforma
  try {
    const allConsentsAccepted = await hasAllRequiredConsents(orgId, user.id)
    
    if (allConsentsAccepted) {
      // Get org and chairman info for email
      const { data: org }: any = await supabase
        .from('orgs')
        .select('name, slug')
        .eq('id', orgId)
        .single()

      const { data: profile }: any = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      if (org) {
        // Send email to Platforma (fail silently)
        sendGovernanceSubmissionEmail({
          orgName: org.name,
          orgSlug: org.slug,
          chairmanName: profile?.full_name || null,
          chairmanEmail: user.email || null,
        }).catch((error) => {
          console.error('EMAIL INCIDENT: Failed to send governance submission email:', error)
        })
      }
    }
  } catch (error) {
    // Log but don't fail - email is optional
    console.error('Error checking consents or sending email:', error)
  }

    // Step 7: Update compliance status after saving
    // This ensures compliance validation reflects the new answers
    try {
      const { validateOrgCompliance, markOrgComplianceOk } = await import('./governance-compliance')
      const validationResult = await validateOrgCompliance(orgId)
      console.log('Compliance validation after submit:', {
        orgId,
        status: validationResult?.status,
        missing: validationResult?.missing_required?.length || 0,
        invalid: validationResult?.invalid_types?.length || 0,
        schemaVersionNo: validationResult?.schema_version_no,
      })
      
      // If validation is OK, mark as compliant with current schema version
      if (validationResult && validationResult.status === 'OK') {
        await markOrgComplianceOk(orgId, validationResult.schema_version_no)
        console.log('Marked org as compliant with schema version:', validationResult.schema_version_no)
      }
    } catch (error) {
      // Log but don't fail - compliance update is optional
      console.error('Error updating compliance after governance submission:', error)
    }

    // Step 8: Revalidate dashboard
    revalidatePath('/dashboard', 'layout')
    revalidatePath('/onboarding', 'page')
    revalidatePath(`/dashboard/[slug]/settings/governance`, 'page')
    revalidatePath(`/dashboard`, 'page') // Revalidate dashboard to update compliance banner

    return { success: true }
  } catch (error: any) {
    // Catch any unexpected errors and return user-friendly message
    console.error('Unexpected error in submitGovernanceAnswers:', {
      error,
      code: error?.code,
      message: error?.message,
      stack: error?.stack,
      orgId,
    })
    return { 
      success: false, 
      error: `Įvyko netikėta klaida: ${error?.message || error?.code || 'Nežinoma klaida'}` 
    }
  }
}

