'use server'

import { createPublicClient } from '@/lib/supabase/public'
import { createAdminClient } from '@/lib/supabase/admin'
import { MEMBERSHIP_STATUS } from '@/app/domain/constants'
import { sendEmail } from '@/lib/email'
import { getMemberRegistrationEmail, getMemberRegistrationOwnerNotificationEmail } from '@/lib/email-templates'
import { revalidatePath } from 'next/cache'

/**
 * Register a new member to a community
 *
 * Flow:
 * 1. Validate email and check if user exists
 * 2. Check if user already has membership in this org
 * 3. Check governance setting: new_member_approval
 * 4. Create membership with appropriate status (PENDING or ACTIVE)
 * 5. Send confirmation email to member
 * 6. If approval required, send notification to OWNER
 */
export async function registerMember(
  orgSlug: string,
  email: string,
  firstName?: string,
  lastName?: string
): Promise<{
  success: boolean
  requiresApproval?: boolean
  error?: string
}> {
  const supabase = createPublicClient()

  // Step 1: Validate email
  if (!email || !email.trim() || !email.includes('@')) {
    return { success: false, error: 'Neteisingas el. pa?to adresas' }
  }

  const normalizedEmail = email.toLowerCase().trim()

  // Step 2: Get organization by slug
  // Note: v19.0 schema does not have metadata column in orgs table
  const { data: org, error: orgError }: any = await supabase
    .from('orgs')
    .select('id, name, slug, status')
    .eq('slug', orgSlug)
    .maybeSingle()

  if (orgError || !org) {
    console.error('Error fetching organization:', orgError, 'slug:', orgSlug)
    return { success: false, error: 'Bendruomenė nerasta' }
  }

  // PRE_ORG BLOCKING: Check if organization is ACTIVE
  // Note: v19.0 - PRE_ORG check removed as metadata column doesn't exist
  // V2 orgs use status='ONBOARDING' which will be blocked below
  if (org.status !== 'ACTIVE') {
    // Check if this is a PRE_ORG (V2 onboarding) - based on status only
    const isPreOrg = org.status === 'ONBOARDING'
    
    // Log audit entry for blocked access
    try {
      const { logAudit } = await import('@/app/utils/audit')
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const adminSupabase = createAdminClient()
      
      await logAudit(adminSupabase, {
        orgId: org.id,
        userId: null, // Public registration, no user yet
        action: 'PRE_ORG_ACCESS_BLOCKED',
        targetTable: 'orgs',
        targetId: org.id,
        metadata: {
          fact: {
            entrypoint: 'member_registration',
            org_slug: orgSlug,
            org_status: org.status,
            is_pre_org: isPreOrg,
          },
        },
      })
    } catch (auditError) {
      console.error('AUDIT INCIDENT: Failed to log PRE_ORG_ACCESS_BLOCKED:', auditError)
    }
    
    return { success: false, error: 'Organization is not active yet.' }
  }

  // Step 3: Find user by email
  // NOTE: profiles.email may be empty (handle_new_user trigger doesn't copy it)
  // So we need to search in auth.users via admin API first, then fall back to profiles
  let existingUser: any = null
  
  // Initialize admin client early for membership checks
  const adminSupabase = createAdminClient()
  
  // Try to find user via Auth Admin API (most reliable - searches auth.users by email)
  try {
    const { data: authUsers } = await adminSupabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    })
    
    // Search for user with matching email in auth.users
    // Note: listUsers doesn't support email filter, so we need to use getUserByEmail or iterate
    // Actually, we should use a different approach - check if email exists in auth
    
    // Alternative: Try to get user by email from auth
    // Supabase doesn't have getUserByEmail in admin API, so we search profiles and auth
    
    // First, try profiles table
    const { data: userProfile }: any = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle()
    
    if (userProfile) {
      existingUser = { id: userProfile.id }
    } else {
      // Profiles.email is empty - try to find user in auth.users via admin
      // We need to iterate through users or use a workaround
      // For now, we'll check auth.users directly using the admin client
      const { data: allUsers } = await adminSupabase.auth.admin.listUsers()
      
      if (allUsers?.users) {
        const matchingUser = allUsers.users.find(
          (u: any) => u.email?.toLowerCase() === normalizedEmail
        )
        if (matchingUser) {
          existingUser = { id: matchingUser.id }
          
          // Also update profiles.email so future lookups work
          await adminSupabase
            .from('profiles')
            .update({ email: normalizedEmail })
            .eq('id', matchingUser.id)
        }
      }
    }
  } catch (authError) {
    console.error('Error searching for user:', authError)
    // Fall back to profiles-only search
    const { data: userProfile }: any = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle()
    
    if (userProfile) {
      existingUser = { id: userProfile.id }
    }
  }
  
  if (existingUser) {
    // Check if user already has membership in this org (check ALL statuses to prevent duplicates)
    // Use admin client to bypass RLS and check all memberships
    const { data: existingMembership }: any = await adminSupabase
      .from('memberships')
      .select('id, member_status')
      .eq('org_id', org.id)
      .eq('user_id', existingUser.id)
      .maybeSingle()
    
    if (existingMembership) {
      if (existingMembership.member_status === 'ACTIVE') {
        return { success: false, error: 'Jūs jau esate šios bendruomenės narys' }
      } else if (existingMembership.member_status === 'PENDING') {
        return { success: false, error: 'Jūsų prašymas jau pateiktas ir laukia patvirtinimo' }
      } else {
        // SUSPENDED or LEFT - still prevent duplicate, user must be reactivated by admin
        return { success: false, error: 'Jūs jau turite narystę šioje bendruomenėje. Susisiekite su administracija, jei norite ją atkurti.' }
      }
    }
  }

  // Step 4: Check governance setting: new_member_approval
  // Possible values: 'auto', 'chairman', 'board', 'members'
  let requiresApproval = true
  let approvalType = 'chairman' // default

  try {
    const { data: governanceValue }: any = await supabase.rpc('get_governance_string', {
      p_org_id: org.id,
      p_key: 'new_member_approval',
      p_default: 'chairman',
    })

    if (governanceValue) {
      approvalType = governanceValue
      if (approvalType === 'auto') {
        requiresApproval = false
      }
    }
  } catch (error) {
    console.error('Error checking governance setting:', error)
  }

  // Step 5: Create membership
  // Use admin client to bypass RLS for membership operations
  // NOTE: We already checked for existing membership above, so we can safely create new one
  // adminSupabase already initialized above
  let membershipId: string | null = null
  let membershipStatus: string = requiresApproval ? 'PENDING' : 'ACTIVE'

  // Check if user exists by trying to find profile with matching email pattern
  // Note: This is limited - cannot create users without service_role
  // For new users, they must register via auth flow first
  if (existingUser) {
    // User exists - create new membership (we already checked it doesn't exist above)
    const { data: newMembership, error: createError }: any = await adminSupabase
      .from('memberships')
      .insert({
        org_id: org.id,
        user_id: existingUser.id,
        role: 'MEMBER',
        member_status: membershipStatus,
      })
      .select('id')
      .single()

    if (createError) {
      console.error('Error creating membership:', createError)
      // If duplicate key error, membership was created between our check and insert
      if (createError.code === '23505') {
        return { success: false, error: 'Jūsų prašymas jau pateiktas. Prašome palaukti patvirtinimo.' }
      }
      return { success: false, error: 'Nepavyko sukurti narystės' }
    } else if (newMembership) {
      membershipId = newMembership.id
    }
  } else {
    // New user - profile not found by email
    // User needs to create an account first via sign-up
    return { 
      success: false, 
      error: 'Šis el. pašto adresas nerastas sistemoje. Pirmiausia susikurkite paskyrą naudodami mygtuką "Prisijungti prie paskyros" ir pasirinkite "Registruotis".' 
    }
  }

  if (!membershipId) {
    return { success: false, error: 'Nepavyko sukurti narystės' }
  }

  // Step 6: ALWAYS update profile if names provided (using admin client to bypass RLS)
  // NOTE: v19.0 schema - profiles table only has full_name column (no first_name/last_name)
  // IMPORTANT: Always update full_name when provided, even if user already exists
  // This ensures new registration data overwrites old data
  if (existingUser && (firstName || lastName)) {
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || null

    const { data: updatedProfile, error: profileError }: any = await adminSupabase
      .from('profiles')
      .update({
        full_name: fullName,
      })
      .eq('id', existingUser.id)
      .select('id, full_name')
      .single()

    if (profileError) {
      console.error('Error updating profile:', profileError)
      // Non-blocking, but log the error
    } else if (updatedProfile && updatedProfile.full_name !== fullName) {
      // Verify update worked
      console.warn('Profile update may have failed - full_name mismatch:', {
        expected: fullName,
        actual: updatedProfile.full_name,
      })
    }
  }

  // Step 7: Send confirmation email to member
  try {
    const memberEmail = getMemberRegistrationEmail({
      orgName: org.name,
      orgSlug: org.slug,
      requiresApproval,
      approvalType,
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
  }

  // Step 8: If approval required, send notification to OWNER
  if (requiresApproval) {
    try {
      const { data: ownerMembership }: any = await adminSupabase
        .from('memberships')
        .select('user_id')
        .eq('org_id', org.id)
        .eq('role', 'OWNER')
        .eq('member_status', 'ACTIVE')
        .limit(1)
        .maybeSingle()

      if (ownerMembership) {
        // Get owner email from profiles
        const { data: ownerProfile }: any = await adminSupabase
          .from('profiles')
          .select('email')
          .eq('id', ownerMembership.user_id)
          .maybeSingle()
        
        if (ownerProfile?.email) {
          const ownerEmail = getMemberRegistrationOwnerNotificationEmail({
            orgName: org.name,
            orgSlug: org.slug,
            memberEmail: normalizedEmail,
            memberName: firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || null,
          })
          
          await sendEmail({
            to: ownerProfile.email,
            subject: ownerEmail.subject,
            html: ownerEmail.html,
            text: ownerEmail.text,
          })
        }
      }
    } catch (emailError) {
      console.error('Error sending owner notification email:', emailError)
    }
  }

  // Step 9: Soft audit logging
  try {
    await adminSupabase
      .from('audit_logs')
      .insert({
        org_id: org.id,
        user_id: existingUser?.id || null,
        action: 'MEMBER_REGISTRATION',
        target_table: 'memberships',
        target_id: membershipId,
        old_value: null,
        new_value: {
          email: normalizedEmail,
          member_status: membershipStatus,
          requires_approval: requiresApproval,
        },
      })
  } catch (auditError) {
    console.error('AUDIT INCIDENT: Failed to log MEMBER_REGISTRATION:', auditError)
  }

  // Step 10: Revalidate
  revalidatePath(`/c/${orgSlug}`, 'page')

  return {
    success: true,
    requiresApproval,
  }
}
