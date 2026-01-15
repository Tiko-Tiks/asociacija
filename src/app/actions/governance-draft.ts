'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from './_guards'
import { authViolation } from '@/app/domain/errors'
import { requireOnboardingAccess } from '@/app/domain/guards/onboardingAccess'
import { sendEmail } from '@/lib/email'
import { revalidatePath } from 'next/cache'

/**
 * Save governance answers as draft (without validation)
 * 
 * Allows user to save progress and return later.
 * Sends email with link to continue.
 */

import { getAppUrl } from '@/lib/app-url'

export interface GovernanceAnswers {
  [key: string]: string | number | boolean
}

export async function saveGovernanceDraft(
  orgId: string,
  answers: GovernanceAnswers,
  allowUpdateForActive: boolean = false,
): Promise<{ success: boolean; error?: string; emailSent?: boolean }> {
  try {
    const supabase = await createClient()
    const user = await requireAuth(supabase)

    // Step 1: Check access
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
          error: 'Tik pirmininkas (OWNER) gali išsaugoti valdymo atsakymų juodraštį' 
        }
      }
    } else {
      // For onboarding: use existing check
      try {
        await requireOnboardingAccess(orgId)
      } catch (error: any) {
        if (error?.code === 'access_denied' || error?.code === 'auth_violation') {
          return { 
            success: false, 
            error: 'Neturite teisių išsaugoti valdymo atsakymų' 
          }
        }
        throw error
      }
    }

    // Check if governance config exists
    const { data: existingConfig, error: configCheckError }: any = await supabase
      .from('governance_configs')
      .select('id')
      .eq('org_id', orgId)
      .maybeSingle()

    if (configCheckError && configCheckError.code !== 'PGRST116') {
      if (configCheckError?.code === '42501') {
        authViolation()
      }
      console.error('Error checking governance config:', configCheckError)
      return { success: false, error: 'Nepavyko patikrinti valdymo konfigūracijos' }
    }

    // Update or insert config with draft flag
    if (existingConfig) {
      const { error: updateError }: any = await supabase
        .from('governance_configs')
        .update({
          answers: answers,
          updated_at: new Date().toISOString(),
          // Note: We could add a 'is_draft' field if needed
        })
        .eq('id', existingConfig.id)

      if (updateError) {
        if (updateError?.code === '42501') {
          authViolation()
        }
        console.error('Error updating governance config draft:', updateError)
        return { success: false, error: 'Nepavyko išsaugoti juodraščio' }
      }
    } else {
      const { error: insertError }: any = await supabase
        .from('governance_configs')
        .insert({
          org_id: orgId,
          answers: answers,
        })

      if (insertError) {
        if (insertError?.code === '42501') {
          authViolation()
        }
        console.error('Error inserting governance config draft:', insertError)
        return { success: false, error: 'Nepavyko sukurti juodraščio' }
      }
    }

    // Get org info for email
    const { data: org }: any = await supabase
      .from('orgs')
      .select('name, slug')
      .eq('id', orgId)
      .single()

    // Send email with link to continue
    let emailSent = false
    if (org && user.email) {
      try {
        const continueLink = `${getAppUrl()}/dashboard/${org.slug}/onboarding`
        const { getOnboardingDraftSavedEmail } = await import('@/lib/email-templates')
        const email = getOnboardingDraftSavedEmail({
          orgName: org.name,
          continueLink: continueLink,
        })

        await sendEmail({
          to: user.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
        })
        emailSent = true
      } catch (emailError) {
        console.error('Error sending draft saved email:', emailError)
        // Don't fail the operation if email fails
      }
    }

    // Revalidate paths
    revalidatePath('/dashboard', 'layout')
    revalidatePath('/onboarding', 'page')
    revalidatePath(`/dashboard/[slug]/settings/governance`, 'page')

    return { success: true, emailSent }
  } catch (error: any) {
    console.error('Unexpected error in saveGovernanceDraft:', {
      error,
      code: error?.code,
      message: error?.message,
      orgId,
    })
    return { 
      success: false, 
      error: `Įvyko netikėta klaida: ${error?.message || error?.code || 'Nežinoma klaida'}` 
    }
  }
}

