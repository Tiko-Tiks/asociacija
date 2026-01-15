'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from './_guards'
import { logAudit } from '@/app/utils/audit'
import { MEMBERSHIP_ROLE, MEMBERSHIP_STATUS } from '@/app/domain/constants'
import { revalidatePath } from 'next/cache'

/**
 * ============================================================================
 * V2 – GOVERNANCE-LOCKED, DO NOT AUTO-MODIFY
 * ============================================================================
 * 
 * This module implements V2 member decision flow with governance guarantees.
 * Any automation here breaks legal guarantees.
 * 
 * V2 Member Decision Flow
 * 
 * Human-driven decisions only:
 * - Objection: Any valid objection logs audit, keeps PENDING, initiates manual procedure
 * - Approval: Only authorized humans can approve and set ACTIVE
 * 
 * STRICTLY FORBIDDEN:
 * - Auto-approval on consent window end (consent window ending does NOTHING automatically)
 * - Auto-rejection on objection (objections do NOT change status, only log and initiate manual procedure)
 * 
 * IMPORTANT:
 * - Consent window metadata (consent_window_ends_at) is informational only
 * - No scheduled jobs or triggers should check consent window expiration
 * - All status transitions require explicit human action via approveMemberV2()
 * 
 * STATUS: FROZEN - No modifications without governance approval
 * ============================================================================
 */

// Types moved to separate file to avoid "use server" export restrictions
// These are re-exported from types file if needed elsewhere
type ObjectionInput = {
  membershipId: string
  objectionReason: string
}

type ApprovalInput = {
  membershipId: string
  approvalNote?: string
}

/**
 * Raise objection to pending member
 * 
 * Behavior:
 * - Logs audit(action='MEMBER_OBJECTION_RAISED')
 * - Keeps member_status = 'PENDING'
 * - Does NOT auto-reject
 * - Initiates manual procedure
 * 
 * Authorization:
 * - Any active member of the org can raise objection
 */
export async function raiseMemberObjection(
  input: ObjectionInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const user = await requireAuth(supabase)

  try {
    const { membershipId, objectionReason } = input

    if (!objectionReason || !objectionReason.trim()) {
      return { success: false, error: 'Prieštaravimo priežastis yra privaloma' }
    }

    // Step 1: Get membership details
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('id, org_id, user_id, member_status')
      .eq('id', membershipId)
      .maybeSingle()

    if (membershipError || !membership) {
      return { success: false, error: 'Narystė nerasta' }
    }

    // Step 2: Verify membership is PENDING
    if (membership.member_status !== 'PENDING') {
      return { 
        success: false, 
        error: `Prieštaravimas gali būti pateiktas tik laukiantiems nariams. Dabartinis statusas: ${membership.member_status}` 
      }
    }

    // Step 3: Verify user is active member of the same org
    const { data: userMembership, error: userMembershipError } = await supabase
      .from('memberships')
      .select('id, role, member_status')
      .eq('org_id', membership.org_id)
      .eq('user_id', user.id)
      .eq('member_status', 'ACTIVE')
      .maybeSingle()

    if (userMembershipError || !userMembership) {
      return { success: false, error: 'Neturite teisių pateikti prieštaravimą' }
    }

    // Step 4: Get org details for audit
    const { data: org } = await supabase
      .from('orgs')
      .select('id, name, slug')
      .eq('id', membership.org_id)
      .maybeSingle()

    // Step 5: Log objection (no membership update needed)
    // NOTE: v19.0 schema - memberships table does NOT have metadata column
    // Objection information is logged in audit_logs instead
    // Membership status remains PENDING (objections don't change status)
    // No database update needed - just audit logging

    // Step 7: Audit logging
    await logAudit(adminSupabase, {
      orgId: membership.org_id,
      userId: user.id,
      action: 'MEMBER_OBJECTION_RAISED',
      targetTable: 'memberships',
      targetId: membershipId,
      metadata: {
        fact: {
          source: 'member_decision_v2',
          objection_reason: objectionReason.trim(),
          member_user_id: membership.user_id,
          raised_by_role: userMembership.role,
        },
      },
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error raising member objection:', error)
    return { 
      success: false, 
      error: error?.message || 'Įvyko netikėta klaida' 
    }
  }
}

/**
 * Approve pending member (manual)
 * 
 * Behavior:
 * - Sets member_status = 'ACTIVE'
 * - Logs audit(action='MEMBER_APPROVED_MANUAL')
 * 
 * Authorization:
 * - OWNER (chairman) can approve if governance.new_member_approval = 'chairman'
 * - Board members can approve if governance.new_member_approval = 'board'
 * - Any active member can approve if governance.new_member_approval = 'members'
 * - Branduolys admin (OWNER of Branduolys org) can always approve
 */
export async function approveMemberV2(
  input: ApprovalInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const user = await requireAuth(supabase)

  try {
    const { membershipId, approvalNote } = input

    // Step 1: Get membership details
    // Use admin client to bypass RLS for membership lookup (needed for approval)
    // Validate membershipId format first
    if (!membershipId || typeof membershipId !== 'string' || membershipId.trim().length === 0) {
      return { success: false, error: 'Neteisingas narystės ID formatas' }
    }

    const { data: membership, error: membershipError } = await adminSupabase
      .from('memberships')
      .select('id, org_id, user_id, member_status')
      .eq('id', membershipId.trim())
      .maybeSingle()
    

    if (membershipError) {
      console.error('Error querying membership:', membershipError)
      return { success: false, error: `Klaida ieškant narystės: ${membershipError.message || 'Nežinoma klaida'}` }
    }

    if (!membership) {
      
      // Additional check: verify the ID format looks like a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(membershipId.trim())) {
        return { 
          success: false, 
          error: `Neteisingas narystės ID formatas. Gautas ID: ${membershipId.substring(0, 20)}...` 
        }
      }
      
      // Try to find membership by checking all memberships in user's orgs as fallback
      // Get user's memberships to find org context
      const { data: userMemberships } = await adminSupabase
        .from('memberships')
        .select('org_id')
        .eq('user_id', user.id)
        .in('member_status', ['ACTIVE', 'PENDING'])
      
      
      return { success: false, error: `Narystė nerasta duomenų bazėje. ID: ${membershipId.substring(0, 8)}...` }
    }

    // Step 2: Verify membership is PENDING
    if (membership.member_status !== 'PENDING') {
      return { 
        success: false, 
        error: `Galima patvirtinti tik laukiančius narius. Dabartinis statusas: ${membership.member_status}` 
      }
    }

    // Step 3: Get org details and governance settings
    // Use admin client to bypass RLS for org lookup
    
    const { data: org, error: orgError } = await adminSupabase
      .from('orgs')
      .select('id, name, slug')
      .eq('id', membership.org_id)
      .maybeSingle()
    

    if (orgError) {
      console.error('Error querying org:', orgError)
      return { success: false, error: `Klaida ieškant bendruomenės: ${orgError.message || 'Nežinoma klaida'}` }
    }
    
    if (!org) {
      return { success: false, error: 'Bendruomenė nerasta' }
    }

    // Step 4: Check authorization based on governance setting
    // NOTE: v19.0 schema - orgs table does NOT have metadata column
    // Use RPC function to get governance setting, or use default 'chairman'
    let newMemberApproval = 'chairman' // Default value
    
    try {
      const { data: governanceValue, error: rpcError }: any = await adminSupabase.rpc('get_governance_string', {
        p_org_id: membership.org_id,
        p_key: 'new_member_approval',
        p_default: 'chairman',
      })
      
      if (!rpcError && governanceValue && typeof governanceValue === 'string') {
        newMemberApproval = governanceValue
      }
      
    } catch (error) {
      console.warn('Error getting governance setting, using default:', error)
      // Continue with default 'chairman'
    }
    
    // Check if user is Branduolys admin (OWNER of Branduolys/Platform org)
    const { data: branduolysOrg } = await supabase
      .from('orgs')
      .select('id')
      .in('slug', ['branduolys', 'platform'])
      .limit(1)
      .maybeSingle()

    let isBranduolysAdmin = false
    if (branduolysOrg) {
      const { data: branduolysMembership } = await supabase
        .from('memberships')
        .select('role')
        .eq('org_id', branduolysOrg.id)
        .eq('user_id', user.id)
        .eq('role', 'OWNER')
        .eq('member_status', 'ACTIVE')
        .maybeSingle()

      isBranduolysAdmin = !!branduolysMembership
    }

    // Get user's membership in the target org
    const { data: userMembership, error: userMembershipError } = await supabase
      .from('memberships')
      .select('id, role, member_status')
      .eq('org_id', membership.org_id)
      .eq('user_id', user.id)
      .eq('member_status', 'ACTIVE')
      .maybeSingle()

    let isAuthorized = false
    let authorizationReason = ''

    // Branduolys admin can always approve
    if (isBranduolysAdmin) {
      isAuthorized = true
      authorizationReason = 'BRANDUOLYS_ADMIN'
    } else {

      // Check based on governance setting
      if (newMemberApproval === 'chairman') {
        // Only OWNER can approve
        if (userMembership && userMembership.role === 'OWNER') {
          isAuthorized = true
          authorizationReason = 'OWNER'
        }
      } else if (newMemberApproval === 'board') {
        // Board members can approve
        if (userMembership) {
          // Check if user is a board member
          const { data: boardAssignment } = await supabase
            .from('board_member_assignments')
            .select('id')
            .eq('org_id', membership.org_id)
            .eq('membership_id', userMembership.id)
            .eq('is_active', true)
            .maybeSingle()

          if (boardAssignment || userMembership.role === 'OWNER') {
            isAuthorized = true
            authorizationReason = 'BOARD'
          }
        }
      } else if (newMemberApproval === 'members') {
        // Any active member can approve
        if (userMembership) {
          isAuthorized = true
          authorizationReason = 'MEMBER'
        }
      } else if (newMemberApproval === 'consent-based') {
        // For consent-based, approval requires explicit action
        // Check if user is OWNER or board member
        if (userMembership) {
          if (userMembership.role === 'OWNER') {
            isAuthorized = true
            authorizationReason = 'OWNER'
          } else {
            // Check if user is a board member
            const { data: boardAssignment } = await supabase
              .from('board_member_assignments')
              .select('id')
              .eq('org_id', membership.org_id)
              .eq('membership_id', userMembership.id)
              .eq('is_active', true)
              .maybeSingle()

            if (boardAssignment) {
              isAuthorized = true
              authorizationReason = 'BOARD'
            }
          }
        }
      }
    }

    if (!isAuthorized) {
      return { 
        success: false, 
        error: `Neturite teisių patvirtinti narių. Reikalinga teisė: ${newMemberApproval}` 
      }
    }

    // Step 5: Update membership status to ACTIVE
    // NOTE: v19.0 schema - memberships table does NOT have metadata column
    // Approval information is logged in audit_logs instead

    
    // Update membership status to ACTIVE
    // First, check current status before update (also check if status column exists)
    const { data: beforeUpdate } = await adminSupabase
      .from('memberships')
      .select('id, member_status, status')
      .eq('id', membershipId)
      .single()
    
    
    if (!beforeUpdate) {
      return { success: false, error: 'Narystė nerasta prieš atnaujinimą' }
    }
    
    // Execute UPDATE without select first (Supabase .select() on UPDATE can return stale data)
    // Then verify immediately with a separate query
    
    // Try RPC function first (if available) - this bypasses any Supabase client issues
    // If RPC doesn't exist, fall back to standard UPDATE
    let updateSuccessful = false
    
    try {
      
      const { data: rpcResult, error: rpcError }: any = await adminSupabase.rpc('update_membership_status', {
        p_membership_id: membershipId,
        p_new_status: 'ACTIVE',
      })
      
      if (!rpcError && rpcResult && rpcResult.length > 0 && rpcResult[0].member_status === 'ACTIVE') {
        updateSuccessful = true
      } else if (rpcError && rpcError.code === 'PGRST202') {
        // RPC function doesn't exist, continue with standard UPDATE
      } else if (rpcError) {
        // RPC error, continue with standard UPDATE
      }
    } catch (rpcException) {
      // RPC not available, continue with standard UPDATE
    }
    
    // If RPC didn't work, try standard UPDATE
    if (!updateSuccessful) {
      
      const { data: updateData, count: updateCount, error: updateError } = await adminSupabase
        .from('memberships')
        .update({
          member_status: 'ACTIVE',
        })
        .eq('id', membershipId)
        .select('id, member_status', { count: 'exact', head: false })
      
      
      // Check if no rows were affected
      if (updateCount === 0) {
        console.error('UPDATE affected 0 rows:', { membershipId, updateCount })
        return { success: false, error: `Narystės statusas nebuvo atnaujintas. Nerasta eilutė su ID: ${membershipId}` }
      }

      if (updateError) {
        console.error('Error approving membership:', updateError)
        return { success: false, error: `Nepavyko patvirtinti narystės: ${updateError.message || 'Nežinoma klaida'}` }
      }
      
      // Wait a moment for database to commit
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const { data: verifyMembership, error: verifyError } = await adminSupabase
        .from('memberships')
        .select('id, member_status')
        .eq('id', membershipId)
        .single()
      
      
      if (verifyError || !verifyMembership) {
        console.error('Error verifying membership update:', verifyError)
        return { success: false, error: 'Nepavyko patikrinti narystės atnaujinimo' }
      }
      
      if (verifyMembership.member_status === 'ACTIVE') {
        // Standard UPDATE succeeded
        updateSuccessful = true
      } else {
        // Standard UPDATE didn't work, try RPC as last resort
        
        try {
          const { data: rpcResult, error: rpcError }: any = await adminSupabase.rpc('update_membership_status', {
            p_membership_id: membershipId,
            p_new_status: 'ACTIVE',
          })
          
          if (rpcError) {
            console.error('RPC update error:', rpcError)
            return { success: false, error: `Narystės statusas nebuvo atnaujintas per RPC. Klaida: ${rpcError.message || 'Nežinoma klaida'}` }
          }
          
          if (rpcResult && rpcResult.length > 0 && rpcResult[0].member_status === 'ACTIVE') {
            updateSuccessful = true
          } else {
            return { success: false, error: `Narystės statusas nebuvo atnaujintas. Dabartinis statusas: ${verifyMembership.member_status}` }
          }
        } catch (rpcException: any) {
          console.error('RPC exception:', rpcException)
          return { success: false, error: `Narystės statusas nebuvo atnaujintas. Dabartinis statusas: ${verifyMembership.member_status}` }
        }
      }
    }
    
    // Final verification - get updated membership
    if (!updateSuccessful) {
      return { success: false, error: 'Narystės statusas nebuvo atnaujintas' }
    }
    
    const { data: updatedMembership } = await adminSupabase
      .from('memberships')
      .select('id, member_status')
      .eq('id', membershipId)
      .single()
    
    if (!updatedMembership || updatedMembership.member_status !== 'ACTIVE') {
      return { success: false, error: `Narystės statusas nebuvo atnaujintas. Dabartinis statusas: ${updatedMembership?.member_status || 'nežinomas'}` }
    }

    // Step 6: Audit logging
    await logAudit(adminSupabase, {
      orgId: membership.org_id,
      userId: user.id,
      action: 'MEMBER_APPROVED_MANUAL',
      targetTable: 'memberships',
      targetId: membershipId,
      metadata: {
        fact: {
          source: 'member_decision_v2',
          member_user_id: membership.user_id,
          approved_by_role: authorizationReason,
          approval_note: approvalNote || null,
          governance_setting: newMemberApproval,
        },
      },
    })

    // Step 7: Send confirmation email to member (optional, non-blocking)
    try {
      const { data: memberProfile } = await adminSupabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', membership.user_id)
        .maybeSingle()

      if (memberProfile?.email) {
        const { sendEmail } = await import('@/lib/email')
        const { getMemberRegistrationEmail } = await import('@/lib/email-templates')
        
        const memberEmail = getMemberRegistrationEmail({
          orgName: org.name,
          orgSlug: org.slug,
          requiresApproval: false, // Now approved
          approvalType: 'auto',
          firstName: memberProfile.full_name?.split(' ')[0] || null,
        })

        await sendEmail({
          to: memberProfile.email,
          subject: memberEmail.subject,
          html: memberEmail.html,
          text: memberEmail.text,
        })
      }
    } catch (emailError) {
      console.error('Error sending approval email:', emailError)
      // Non-blocking
    }

    // Step 8: Revalidate Next.js cache for members page
    // This ensures the UI shows updated member status immediately
    revalidatePath('/dashboard/[slug]/members', 'page')
    revalidatePath(`/dashboard/${org.slug}/members`, 'page')
    

    return { success: true }
  } catch (error: any) {
    console.error('Error approving member V2:', error)
    return { 
      success: false, 
      error: error?.message || 'Įvyko netikėta klaida' 
    }
  }
}

/**
 * Reject/Decline pending member
 * 
 * Behavior:
 * - Sets member_status = 'LEFT' (member declined or rejected)
 * - Logs audit(action='MEMBER_REJECTED')
 * 
 * Authorization:
 * - Same as approveMemberV2 (OWNER, board, or members based on governance)
 * - Branduolys admin can always reject
 */
export async function rejectMemberV2(
  input: ApprovalInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const user = await requireAuth(supabase)

  try {
    const { membershipId, approvalNote } = input

    // Step 1: Get membership details
    if (!membershipId || typeof membershipId !== 'string' || membershipId.trim().length === 0) {
      return { success: false, error: 'Neteisingas narystės ID formatas' }
    }

    const { data: membership, error: membershipError } = await adminSupabase
      .from('memberships')
      .select('id, org_id, user_id, member_status')
      .eq('id', membershipId.trim())
      .maybeSingle()

    if (membershipError) {
      console.error('Error querying membership:', membershipError)
      return { success: false, error: `Klaida ieškant narystės: ${membershipError.message || 'Nežinoma klaida'}` }
    }

    if (!membership) {
      return { success: false, error: `Narystė nerasta duomenų bazėje. ID: ${membershipId.substring(0, 8)}...` }
    }

    // Step 2: Verify membership is PENDING
    if (membership.member_status !== 'PENDING') {
      return { 
        success: false, 
        error: `Galima atmesti tik laukiančius narius. Dabartinis statusas: ${membership.member_status}` 
      }
    }

    // Step 3: Get org details and governance settings
    const { data: org, error: orgError } = await adminSupabase
      .from('orgs')
      .select('id, name, slug')
      .eq('id', membership.org_id)
      .maybeSingle()

    if (orgError) {
      console.error('Error querying org:', orgError)
      return { success: false, error: `Klaida ieškant bendruomenės: ${orgError.message || 'Nežinoma klaida'}` }
    }
    
    if (!org) {
      return { success: false, error: 'Bendruomenė nerasta' }
    }

    // Step 4: Check authorization (same as approveMemberV2)
    let newMemberApproval = 'chairman'
    
    try {
      const { data: governanceValue, error: rpcError }: any = await adminSupabase.rpc('get_governance_string', {
        p_org_id: membership.org_id,
        p_key: 'new_member_approval',
        p_default: 'chairman',
      })
      
      if (!rpcError && governanceValue && typeof governanceValue === 'string') {
        newMemberApproval = governanceValue
      }
    } catch (error) {
      console.warn('Error getting governance setting, using default:', error)
    }
    
    // Check if user is Branduolys admin
    const { data: branduolysOrg } = await supabase
      .from('orgs')
      .select('id')
      .in('slug', ['branduolys', 'platform'])
      .limit(1)
      .maybeSingle()

    let isBranduolysAdmin = false
    if (branduolysOrg) {
      const { data: branduolysMembership } = await supabase
        .from('memberships')
        .select('role')
        .eq('org_id', branduolysOrg.id)
        .eq('user_id', user.id)
        .eq('role', 'OWNER')
        .eq('member_status', 'ACTIVE')
        .maybeSingle()

      isBranduolysAdmin = !!branduolysMembership
    }

    // Get user's membership in the target org
    const { data: userMembership, error: userMembershipError } = await supabase
      .from('memberships')
      .select('id, role, member_status')
      .eq('org_id', membership.org_id)
      .eq('user_id', user.id)
      .eq('member_status', 'ACTIVE')
      .maybeSingle()

    let isAuthorized = false
    let authorizationReason = ''

    // Branduolys admin can always reject
    if (isBranduolysAdmin) {
      isAuthorized = true
      authorizationReason = 'BRANDUOLYS_ADMIN'
    } else {
      // Check based on governance setting (same logic as approveMemberV2)
      if (newMemberApproval === 'chairman') {
        if (userMembership && userMembership.role === 'OWNER') {
          isAuthorized = true
          authorizationReason = 'OWNER'
        }
      } else if (newMemberApproval === 'board') {
        if (userMembership) {
          const { data: boardAssignment } = await supabase
            .from('board_member_assignments')
            .select('id')
            .eq('org_id', membership.org_id)
            .eq('membership_id', userMembership.id)
            .eq('is_active', true)
            .maybeSingle()

          if (boardAssignment || userMembership.role === 'OWNER') {
            isAuthorized = true
            authorizationReason = 'BOARD'
          }
        }
      } else if (newMemberApproval === 'members') {
        if (userMembership) {
          isAuthorized = true
          authorizationReason = 'MEMBER'
        }
      } else if (newMemberApproval === 'consent-based') {
        if (userMembership) {
          if (userMembership.role === 'OWNER') {
            isAuthorized = true
            authorizationReason = 'OWNER'
          } else {
            const { data: boardAssignment } = await supabase
              .from('board_member_assignments')
              .select('id')
              .eq('org_id', membership.org_id)
              .eq('membership_id', userMembership.id)
              .eq('is_active', true)
              .maybeSingle()

            if (boardAssignment) {
              isAuthorized = true
              authorizationReason = 'BOARD'
            }
          }
        }
      }
    }

    if (!isAuthorized) {
      return { 
        success: false, 
        error: `Neturite teisių atmesti narių. Reikalinga teisė: ${newMemberApproval}` 
      }
    }

    // Step 5: Update membership status to LEFT
    let updateSuccessful = false
    
    try {
      const { data: rpcResult, error: rpcError }: any = await adminSupabase.rpc('update_membership_status', {
        p_membership_id: membershipId,
        p_new_status: 'LEFT',
      })
      
      if (!rpcError && rpcResult && rpcResult.length > 0 && rpcResult[0].member_status === 'LEFT') {
        updateSuccessful = true
      }
    } catch (rpcException) {
      // RPC not available, continue with standard UPDATE
    }
    
    // If RPC didn't work, try standard UPDATE
    if (!updateSuccessful) {
      const { data: updateData, count: updateCount, error: updateError } = await adminSupabase
        .from('memberships')
        .update({
          member_status: 'LEFT',
        })
        .eq('id', membershipId)
        .select('id, member_status', { count: 'exact', head: false })
      
      if (updateCount === 0) {
        console.error('UPDATE affected 0 rows:', { membershipId, updateCount })
        return { success: false, error: `Narystės statusas nebuvo atnaujintas. Nerasta eilutė su ID: ${membershipId}` }
      }

      if (updateError) {
        console.error('Error rejecting membership:', updateError)
        return { success: false, error: `Nepavyko atmesti narystės: ${updateError.message || 'Nežinoma klaida'}` }
      }
      
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const { data: verifyMembership, error: verifyError } = await adminSupabase
        .from('memberships')
        .select('id, member_status')
        .eq('id', membershipId)
        .single()
      
      if (verifyError || !verifyMembership) {
        console.error('Error verifying membership update:', verifyError)
        return { success: false, error: 'Nepavyko patikrinti narystės atnaujinimo' }
      }
      
      if (verifyMembership.member_status === 'LEFT') {
        updateSuccessful = true
      } else {
        return { success: false, error: `Narystės statusas nebuvo atnaujintas. Dabartinis statusas: ${verifyMembership.member_status}` }
      }
    }
    
    if (!updateSuccessful) {
      return { success: false, error: 'Narystės statusas nebuvo atnaujintas' }
    }

    // Step 6: Audit logging
    await logAudit(adminSupabase, {
      orgId: membership.org_id,
      userId: user.id,
      action: 'MEMBER_REJECTED',
      targetTable: 'memberships',
      targetId: membershipId,
      metadata: {
        fact: {
          source: 'member_decision_v2',
          member_user_id: membership.user_id,
          rejected_by_role: authorizationReason,
          rejection_note: approvalNote || null,
          governance_setting: newMemberApproval,
        },
      },
    })

    // Step 7: Revalidate Next.js cache
    revalidatePath('/dashboard/[slug]/members', 'page')
    revalidatePath(`/dashboard/${org.slug}/members`, 'page')

    return { success: true }
  } catch (error: any) {
    console.error('Error rejecting member V2:', error)
    return { 
      success: false, 
      error: error?.message || 'Įvyko netikėta klaida' 
    }
  }
}

/**
 * Get pending members for an organization
 * 
 * Returns list of pending members with their details
 */
export async function getPendingMembers(
  orgId: string
): Promise<{
  success: boolean
  members?: Array<{
    id: string
    userId: string
    email: string | null
    fullName: string | null
    joinedAt: string | null
    metadata: any
    hasObjections: boolean
    consentWindowEndsAt: string | null
  }>
  error?: string
}> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  try {
    // Verify user is active member of org
    const { data: userMembership } = await supabase
      .from('memberships')
      .select('id, role, member_status')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .eq('member_status', 'ACTIVE')
      .maybeSingle()

    if (!userMembership) {
      return { success: false, error: 'Neturite teisių' }
    }

    // Get pending members
    const { data: pendingMemberships, error: membersError } = await supabase
      .from('memberships')
      .select('id, user_id, joined_at, metadata')
      .eq('org_id', orgId)
      .eq('member_status', 'PENDING')
      .order('joined_at', { ascending: false })

    if (membersError) {
      console.error('Error fetching pending members:', membersError)
      return { success: false, error: 'Nepavyko gauti laukiančių narių sąrašo' }
    }

    if (!pendingMemberships || pendingMemberships.length === 0) {
      return { success: true, members: [] }
    }

    // Get user profiles
    const userIds = pendingMemberships.map((m: any) => m.user_id)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return { success: false, error: 'Nepavyko gauti vartotojų profilių' }
    }

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

    // Build result
    const members = pendingMemberships.map((m: any) => {
      const profile = profileMap.get(m.user_id)
      const metadata = m.metadata || {}
      const objections = metadata.fact?.objections || []
      
      return {
        id: m.id,
        userId: m.user_id,
        email: profile?.email || null,
        fullName: profile?.full_name || null,
        joinedAt: m.joined_at || null,
        metadata: m.metadata,
        hasObjections: objections.length > 0,
        consentWindowEndsAt: metadata.fact?.consent_window_ends_at || null,
      }
    })

    return { success: true, members }
  } catch (error: any) {
    console.error('Error getting pending members:', error)
    return { success: false, error: error?.message || 'Įvyko netikėta klaida' }
  }
}
