'use server'

import { createPublicClient } from '@/lib/supabase/public'
import { createAdminClient } from '@/lib/supabase/admin'
import { MEMBERSHIP_STATUS } from '@/app/domain/constants'
import { sendEmail } from '@/lib/email'
import { getMemberRegistrationEmail, getMemberRegistrationOwnerNotificationEmail } from '@/lib/email-templates'
import { logAudit } from '@/app/utils/audit'
import { revalidatePath } from 'next/cache'

/**
 * ============================================================================
 * V2 – GOVERNANCE-LOCKED, DO NOT AUTO-MODIFY
 * ============================================================================
 * 
 * This module implements V2 member registration with governance guarantees.
 * Any automation here breaks legal guarantees.
 * 
 * V2 Member Registration
 * 
 * Preconditions (HARD):
 * - orgs.status MUST be 'ACTIVE'
 * - orgs.metadata.fact.pre_org MUST NOT exist
 * - No duplicate membership (ACTIVE or PENDING)
 * 
 * Governance decision from:
 * - orgs.metadata.governance.new_member_approval
 * 
 * Cases:
 * A) 'auto' → member_status = 'ACTIVE', log MEMBER_APPROVED_AUTO
 * B) 'chairman' | 'board' | 'members' → member_status = 'PENDING', notify approvers, log MEMBER_PENDING_APPROVAL
 * C) 'consent-based' → member_status = 'PENDING', set consent window metadata, notify org, log MEMBER_CONSENT_WINDOW_STARTED
 * 
 * STRICT RULE:
 * - Consent window ending does NOT auto-activate
 * - Transition to ACTIVE requires explicit human action
 * 
 * STATUS: FROZEN - No modifications without governance approval
 * ============================================================================
 */

export interface RegisterMemberV2Input {
  orgSlug: string
  email: string
  firstName?: string
  lastName?: string
}

export interface RegisterMemberV2Result {
  success: boolean
  memberStatus?: 'ACTIVE' | 'PENDING'
  approvalType?: 'auto' | 'chairman' | 'board' | 'members' | 'consent-based'
  consentWindowDays?: number
  error?: string
}

// Default consent window duration (days)
const CONSENT_WINDOW_DAYS = 7

/**
 * Register a new member V2
 */
export async function registerMemberV2(
  input: RegisterMemberV2Input
): Promise<RegisterMemberV2Result> {
  const supabase = createPublicClient()
  const adminSupabase = createAdminClient()

  const { orgSlug, email, firstName, lastName } = input

  try {
    // Step 1: Validate email
    if (!email || !email.trim() || !email.includes('@')) {
      return { success: false, error: 'Neteisingas el. pašto adresas' }
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Step 2: Get organization by slug
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .select('id, name, slug, status, metadata')
      .eq('slug', orgSlug)
      .maybeSingle()

    if (orgError || !org) {
      console.error('Error fetching organization:', orgError)
      return { success: false, error: 'Bendruomenė nerasta' }
    }

    // HARD PRECONDITION 1: org.status MUST be 'ACTIVE'
    if (org.status !== 'ACTIVE') {
      await logAudit(adminSupabase, {
        orgId: org.id,
        userId: null,
        action: 'PRE_ORG_ACCESS_BLOCKED',
        targetTable: 'orgs',
        targetId: org.id,
        metadata: {
          fact: {
            entrypoint: 'member_registration_v2',
            org_slug: orgSlug,
            org_status: org.status,
          },
        },
      })
      return { success: false, error: 'Bendruomenė dar neaktyvi' }
    }

    // HARD PRECONDITION 2: org.metadata.fact.pre_org MUST NOT exist
    if (org.metadata?.fact?.pre_org === true) {
      await logAudit(adminSupabase, {
        orgId: org.id,
        userId: null,
        action: 'PRE_ORG_ACCESS_BLOCKED',
        targetTable: 'orgs',
        targetId: org.id,
        metadata: {
          fact: {
            entrypoint: 'member_registration_v2',
            org_slug: orgSlug,
            is_pre_org: true,
          },
        },
      })
      return { success: false, error: 'Bendruomenė dar neaktyvi' }
    }

    // Step 3: Find user by email (via profiles)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError)
      return { success: false, error: 'Nepavyko patikrinti vartotojo' }
    }

    if (!profile) {
      return { 
        success: false, 
        error: 'Vartotojas su šiuo el. paštu nerastas. Prašome pirmiausia užsiregistruoti.' 
      }
    }

    const userId = profile.id

    // HARD PRECONDITION 3: No duplicate membership (ACTIVE or PENDING)
    const { data: existingMembership, error: membershipError } = await supabase
      .from('memberships')
      .select('id, member_status')
      .eq('org_id', org.id)
      .eq('user_id', userId)
      .maybeSingle()

    if (membershipError && membershipError.code !== 'PGRST116') {
      console.error('Error checking membership:', membershipError)
      return { success: false, error: 'Nepavyko patikrinti narystės' }
    }

    if (existingMembership) {
      if (existingMembership.member_status === 'ACTIVE') {
        return { success: false, error: 'Jūs jau esate šios bendruomenės narys' }
      } else if (existingMembership.member_status === 'PENDING') {
        return { success: false, error: 'Jūsų prašymas jau pateiktas ir laukia patvirtinimo' }
      }
      // If status is SUSPENDED or LEFT, allow re-registration
    }

    // Step 4: Read governance decision from orgs.metadata.governance.new_member_approval
    const newMemberApproval = org.metadata?.governance?.new_member_approval || 'chairman'
    
    let memberStatus: 'ACTIVE' | 'PENDING' = 'PENDING'
    let approvalType: 'auto' | 'chairman' | 'board' | 'members' | 'consent-based' = 'chairman'
    let consentWindowDays: number | undefined = undefined

    // Determine member status and approval type based on governance setting
    if (newMemberApproval === 'auto') {
      memberStatus = 'ACTIVE'
      approvalType = 'auto'
    } else if (newMemberApproval === 'chairman' || newMemberApproval === 'board' || newMemberApproval === 'members') {
      memberStatus = 'PENDING'
      approvalType = newMemberApproval
    } else if (newMemberApproval === 'consent-based') {
      memberStatus = 'PENDING'
      approvalType = 'consent-based'
      consentWindowDays = CONSENT_WINDOW_DAYS
    } else {
      // Default to chairman approval if unknown value
      memberStatus = 'PENDING'
      approvalType = 'chairman'
    }

    // Step 5: Prepare membership metadata (for consent-based case)
    const membershipMetadata: Record<string, any> = {}
    if (approvalType === 'consent-based') {
      const now = new Date()
      const windowEnd = new Date(now)
      windowEnd.setDate(windowEnd.getDate() + CONSENT_WINDOW_DAYS)

      membershipMetadata.fact = {
        consent_window_started_at: now.toISOString(),
        consent_window_ends_at: windowEnd.toISOString(),
      }
    }

    // Step 6: Create or update membership
    let membershipId: string | null = null

    if (existingMembership) {
      // Update existing membership
      const { error: updateError } = await adminSupabase
        .from('memberships')
        .update({
          member_status: memberStatus,
          metadata: Object.keys(membershipMetadata).length > 0 ? membershipMetadata : null,
        })
        .eq('id', existingMembership.id)

      if (updateError) {
        console.error('Error updating membership:', updateError)
        return { success: false, error: 'Nepavyko atnaujinti narystės' }
      }
      membershipId = existingMembership.id
    } else {
      // Create new membership
      const { data: newMembership, error: createError } = await adminSupabase
        .from('memberships')
        .insert({
          org_id: org.id,
          user_id: userId,
          role: 'MEMBER',
          member_status: memberStatus,
          metadata: Object.keys(membershipMetadata).length > 0 ? membershipMetadata : null,
        })
        .select('id')
        .single()

      if (createError) {
        console.error('Error creating membership:', createError)
        return { success: false, error: 'Nepavyko sukurti narystės' }
      }
      membershipId = newMembership.id
    }

    // Step 7: Update profile if names provided
    // NOTE: v19.0 schema - profiles table only has full_name column (no first_name/last_name)
    if (firstName || lastName) {
      const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || null

      const { error: profileUpdateError } = await adminSupabase
        .from('profiles')
        .update({
          full_name: fullName,
        })
        .eq('id', userId)

      if (profileUpdateError) {
        console.error('Error updating profile:', profileUpdateError)
        // Non-blocking
      }
    }

    // Step 8: Send confirmation email to member
    try {
      const memberEmail = getMemberRegistrationEmail({
        orgName: org.name,
        orgSlug: org.slug,
        requiresApproval: memberStatus === 'PENDING',
        approvalType: approvalType === 'consent-based' ? 'chairman' : approvalType, // Use chairman for consent-based in email
        firstName: firstName || null,
      })

      await sendEmail({
        to: normalizedEmail,
        subject: memberEmail.subject,
        html: memberEmail.html,
        text: memberEmail.text,
      })
    } catch (emailError) {
      console.error('Error sending member confirmation email:', emailError)
      // Non-blocking
    }

    // Step 9: Handle notifications based on approval type
    if (approvalType === 'chairman') {
      // Notify chairman (OWNER)
      await notifyApprovers(adminSupabase, org.id, 'OWNER', userId, org.name, org.slug)
    } else if (approvalType === 'board') {
      // Notify board members (BOARD role or specific board members)
      await notifyApprovers(adminSupabase, org.id, 'BOARD', userId, org.name, org.slug)
    } else if (approvalType === 'members') {
      // Notify all active members
      await notifyApprovers(adminSupabase, org.id, 'MEMBERS', userId, org.name, org.slug)
    } else if (approvalType === 'consent-based') {
      // Notify org (all active members) about consent window
      await notifyConsentWindow(adminSupabase, org.id, userId, org.name, org.slug, normalizedEmail, CONSENT_WINDOW_DAYS)
    }

    // Step 10: Audit logging
    let auditAction: string
    if (approvalType === 'auto') {
      auditAction = 'MEMBER_APPROVED_AUTO'
    } else if (approvalType === 'consent-based') {
      auditAction = 'MEMBER_CONSENT_WINDOW_STARTED'
    } else {
      auditAction = 'MEMBER_PENDING_APPROVAL'
    }

    await logAudit(adminSupabase, {
      orgId: org.id,
      userId: userId,
      action: auditAction,
      targetTable: 'memberships',
      targetId: membershipId,
      metadata: {
        fact: {
          source: 'member_registration_v2',
          approval_type: approvalType,
          member_status: memberStatus,
          email: normalizedEmail,
          ...(approvalType === 'consent-based' ? {
            consent_window_days: CONSENT_WINDOW_DAYS,
          } : {}),
        },
      },
    })

    // Step 11: Revalidate
    revalidatePath(`/c/${orgSlug}`, 'page')

    return {
      success: true,
      memberStatus,
      approvalType,
      consentWindowDays: approvalType === 'consent-based' ? CONSENT_WINDOW_DAYS : undefined,
    }
  } catch (error: any) {
    console.error('Error registering member V2:', error)
    return { 
      success: false, 
      error: error?.message || 'Įvyko netikėta klaida' 
    }
  }
}

/**
 * Notify approvers about pending member
 */
async function notifyApprovers(
  adminSupabase: any,
  orgId: string,
  approverType: 'OWNER' | 'board' | 'members',
  userId: string,
  orgName: string,
  orgSlug: string
): Promise<void> {
  try {
    // Get approver emails based on type
    let approverEmails: string[] = []

    if (approverType === 'OWNER') {
      // Get OWNER email
      const { data: ownerMembership } = await adminSupabase
        .from('memberships')
        .select('user_id')
        .eq('org_id', orgId)
        .eq('role', 'OWNER')
        .eq('member_status', 'ACTIVE')
        .limit(1)
        .maybeSingle()

      if (ownerMembership) {
        const { data: ownerProfile } = await adminSupabase
          .from('profiles')
          .select('email')
          .eq('id', ownerMembership.user_id)
          .maybeSingle()

        if (ownerProfile?.email) {
          approverEmails.push(ownerProfile.email)
        }
      }
    } else if (approverType === 'board') {
      // Get board members emails
      // Check board_member_assignments table for active board members
      const { data: boardAssignments } = await adminSupabase
        .from('board_member_assignments')
        .select('membership_id')
        .eq('org_id', orgId)
        .eq('is_active', true)

      if (boardAssignments && boardAssignments.length > 0) {
        const membershipIds = boardAssignments.map((a: any) => a.membership_id)
        const { data: boardMemberships } = await adminSupabase
          .from('memberships')
          .select('user_id')
          .in('id', membershipIds)
          .eq('member_status', 'ACTIVE')

        if (boardMemberships && boardMemberships.length > 0) {
          const userIds = boardMemberships.map((m: any) => m.user_id)
          const { data: profiles } = await adminSupabase
            .from('profiles')
            .select('email')
            .in('id', userIds)

          if (profiles) {
            approverEmails = profiles
              .map((p: any) => p.email)
              .filter((email: string | null): email is string => !!email)
          }
        }
      }
      
      // Fallback: if no board assignments found, notify OWNER
      if (approverEmails.length === 0) {
        const { data: ownerMembership } = await adminSupabase
          .from('memberships')
          .select('user_id')
          .eq('org_id', orgId)
          .eq('role', 'OWNER')
          .eq('member_status', 'ACTIVE')
          .limit(1)
          .maybeSingle()

        if (ownerMembership) {
          const { data: ownerProfile } = await adminSupabase
            .from('profiles')
            .select('email')
            .eq('id', ownerMembership.user_id)
            .maybeSingle()

          if (ownerProfile?.email) {
            approverEmails.push(ownerProfile.email)
          }
        }
      }
    } else if (approverType === 'members') {

      if (boardMemberships && boardMemberships.length > 0) {
        const userIds = boardMemberships.map((m: any) => m.user_id)
        const { data: profiles } = await adminSupabase
          .from('profiles')
          .select('email')
          .in('id', userIds)

        if (profiles) {
          approverEmails = profiles
            .map((p: any) => p.email)
            .filter((email: string | null): email is string => !!email)
        }
      }
    } else if (approverType === 'members') {
      // Get all active members emails
      const { data: memberships } = await adminSupabase
        .from('memberships')
        .select('user_id')
        .eq('org_id', orgId)
        .eq('member_status', 'ACTIVE')

      if (memberships && memberships.length > 0) {
        const userIds = memberships.map((m: any) => m.user_id)
        const { data: profiles } = await adminSupabase
          .from('profiles')
          .select('email')
          .in('id', userIds)

        if (profiles) {
          approverEmails = profiles
            .map((p: any) => p.email)
            .filter((email: string | null): email is string => !!email)
        }
      }
    }

    // Send notification emails
    if (approverEmails.length > 0) {
      // Get member info for notification
      const { data: memberProfile } = await adminSupabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .maybeSingle()

      const memberEmail = memberProfile?.email || 'Nėra el. pašto'
      const memberName = memberProfile?.full_name || memberEmail

      const { getMemberRegistrationOwnerNotificationEmail } = await import('@/lib/email-templates')
      const notificationEmail = getMemberRegistrationOwnerNotificationEmail({
        orgName,
        orgSlug,
        memberEmail,
        memberName,
      })

      // Send to all approvers
      for (const email of approverEmails) {
        try {
          await sendEmail({
            to: email,
            subject: notificationEmail.subject,
            html: notificationEmail.html,
            text: notificationEmail.text,
          })
        } catch (emailError) {
          console.error(`Error sending notification to ${email}:`, emailError)
          // Continue with other emails
        }
      }
    }
  } catch (error) {
    console.error('Error notifying approvers:', error)
    // Non-blocking
  }
}

/**
 * Notify org about consent window started
 */
async function notifyConsentWindow(
  adminSupabase: any,
  orgId: string,
  userId: string,
  orgName: string,
  orgSlug: string,
  memberEmail: string,
  windowDays: number
): Promise<void> {
  try {
    // Get all active members emails
    const { data: memberships } = await adminSupabase
      .from('memberships')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('member_status', 'ACTIVE')

    if (!memberships || memberships.length === 0) {
      return
    }

    const userIds = memberships.map((m: any) => m.user_id)
    const { data: profiles } = await adminSupabase
      .from('profiles')
      .select('email, full_name')
      .in('id', userIds)

    if (!profiles) {
      return
    }

    const memberEmails = profiles
      .map((p: any) => p.email)
      .filter((email: string | null): email is string => !!email)

    // Send consent window notification
    // Note: Using generic notification template (no specific template required)
    const consentWindowEnd = new Date()
    consentWindowEnd.setDate(consentWindowEnd.getDate() + windowDays)

    for (const email of memberEmails) {
      try {
        await sendEmail({
          to: email,
          subject: `Naujas narys: ${memberEmail} - ${windowDays} dienų prieštaravimo terminas`,
          html: `
            <h2>Naujas narys prašo priėmimo</h2>
            <p>Narys <strong>${memberEmail}</strong> prašo priėmimo į ${orgName}.</p>
            <p>Prieštaravimo terminas: ${consentWindowEnd.toLocaleDateString('lt-LT')}.</p>
            <p>Jei nėra prieštaravimų, narys bus priimtas automatiškai.</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://branduolys.lt'}/dashboard/${orgSlug}">Peržiūrėti prašymą</a></p>
          `,
          text: `Naujas narys ${memberEmail} prašo priėmimo į ${orgName}. Prieštaravimo terminas: ${consentWindowEnd.toLocaleDateString('lt-LT')}.`,
        })
      } catch (emailError) {
        console.error(`Error sending consent window notification to ${email}:`, emailError)
        // Continue with other emails
      }
    }
  } catch (error) {
    console.error('Error notifying consent window:', error)
    // Non-blocking
  }
}
