'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

/**
 * Admin member view
 */
export interface AdminMemberView {
  id: string
  user_id: string
  org_id: string
  role: string
  member_status: string
  email: string | null
  full_name: string | null
  first_name: string | null
  last_name: string | null
  created_at: string
}

/**
 * Get all members for an organization (Admin view)
 * Uses admin client to bypass RLS
 */
export async function getOrgMembersAdmin(orgId: string): Promise<AdminMemberView[]> {
  const supabase = createAdminClient()

  // Get all memberships for this org
  const { data: memberships, error: membershipsError } = await supabase
    .from('memberships')
    .select('id, user_id, org_id, role, member_status, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (membershipsError) {
    console.error('Error fetching memberships:', membershipsError)
    return []
  }

  if (!memberships || memberships.length === 0) {
    return []
  }

  // Get user details for each membership
  const membersWithDetails = await Promise.all(
    memberships.map(async (membership) => {
      // Get user from auth.users
      const { data: userData } = await supabase.auth.admin.getUserById(membership.user_id)
      const user = userData?.user

      // Get profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, first_name, last_name')
        .eq('id', membership.user_id)
        .maybeSingle()

      return {
        id: membership.id,
        user_id: membership.user_id,
        org_id: membership.org_id,
        role: membership.role,
        member_status: membership.member_status,
        email: user?.email || null,
        full_name: profile?.full_name || user?.user_metadata?.full_name || null,
        first_name: profile?.first_name || null,
        last_name: profile?.last_name || null,
        created_at: membership.created_at,
      }
    })
  )

  return membersWithDetails
}

/**
 * Update member status (Admin)
 */
export async function updateMemberStatusAdmin(
  membershipId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('memberships')
    .update({ member_status: newStatus })
    .eq('id', membershipId)

  if (error) {
    console.error('Error updating member status:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Delete member (Admin)
 * Sets member_status to 'LEFT'
 */
export async function deleteMemberAdmin(
  membershipId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Get membership to check if it's OWNER
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('id', membershipId)
    .single()

  if (membership?.role === 'OWNER') {
    return { success: false, error: 'Negalima pašalinti OWNER nario' }
  }

  // Set status to LEFT instead of deleting
  const { error } = await supabase
    .from('memberships')
    .update({ member_status: 'LEFT' })
    .eq('id', membershipId)

  if (error) {
    console.error('Error deleting member:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Get all users with their current organizations (Admin view)
 */
export interface UserWithOrgs {
  id: string
  email: string | null
  full_name: string | null
  first_name: string | null
  last_name: string | null
  current_orgs: Array<{
    org_id: string
    org_name: string
    org_slug: string
    role: string
    member_status: string
  }>
  created_at: string
}

export async function getAllUsersWithOrgs(): Promise<UserWithOrgs[]> {
  const supabase = createAdminClient()

  // Get all users from auth.users
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers()

  if (usersError) {
    console.error('Error fetching users:', usersError)
    return []
  }

  // Get all memberships
  const { data: memberships, error: membershipsError } = await supabase
    .from('memberships')
    .select('id, user_id, org_id, role, member_status')
    .eq('member_status', 'ACTIVE')

  if (membershipsError) {
    console.error('Error fetching memberships:', membershipsError)
    return []
  }

  // Get all organizations
  const { data: orgs, error: orgsError } = await supabase
    .from('orgs')
    .select('id, name, slug')

  if (orgsError) {
    console.error('Error fetching organizations:', orgsError)
    return []
  }

  // Create org map
  const orgMap = new Map((orgs || []).map((org) => [org.id, { name: org.name, slug: org.slug }]))

  // Group memberships by user_id
  const membershipsByUser = new Map<string, typeof memberships>()
  ;(memberships || []).forEach((membership) => {
    if (!membershipsByUser.has(membership.user_id)) {
      membershipsByUser.set(membership.user_id, [])
    }
    membershipsByUser.get(membership.user_id)!.push(membership)
  })

  // Get profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, first_name, last_name')

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError)
  }

  const profileMap = new Map(
    (profiles || []).map((profile) => [
      profile.id,
      {
        full_name: profile.full_name,
        first_name: profile.first_name,
        last_name: profile.last_name,
      },
    ])
  )

  // Combine user data with memberships
  return (users?.users || []).map((user) => {
    const profile = profileMap.get(user.id)
    const userMemberships = membershipsByUser.get(user.id) || []

    return {
      id: user.id,
      email: user.email || null,
      full_name:
        profile?.full_name ||
        user.user_metadata?.full_name ||
        `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() ||
        null,
      first_name: profile?.first_name || user.user_metadata?.first_name || null,
      last_name: profile?.last_name || user.user_metadata?.last_name || null,
      current_orgs: userMemberships
        .map((m) => {
          const org = orgMap.get(m.org_id)
          if (!org) return null
          return {
            org_id: m.org_id,
            org_name: org.name,
            org_slug: org.slug,
            role: m.role,
            member_status: m.member_status,
          }
        })
        .filter((o): o is NonNullable<typeof o> => o !== null),
      created_at: user.created_at,
    }
  })
}

/**
 * Change user's organization (Admin)
 * 
 * This function:
 * 1. Removes user from old organization (sets member_status to 'LEFT')
 * 2. Creates new membership in target organization
 * 3. Preserves role if possible, otherwise sets to MEMBER
 */
export async function changeUserOrganization(
  userId: string,
  oldOrgId: string,
  newOrgId: string,
  preserveRole: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Step 1: Get old membership to preserve role if needed
  const { data: oldMembership, error: oldMembershipError } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('org_id', oldOrgId)
    .eq('member_status', 'ACTIVE')
    .maybeSingle()

  if (oldMembershipError && oldMembershipError.code !== 'PGRST116') {
    console.error('Error fetching old membership:', oldMembershipError)
    return { success: false, error: 'Nepavyko rasti senos narystės' }
  }

  // Step 2: Check if user already has membership in new org
  const { data: existingMembership, error: existingError } = await supabase
    .from('memberships')
    .select('id, member_status')
    .eq('user_id', userId)
    .eq('org_id', newOrgId)
    .maybeSingle()

  if (existingError && existingError.code !== 'PGRST116') {
    console.error('Error checking existing membership:', existingError)
    return { success: false, error: 'Nepavyko patikrinti esamos narystės' }
  }

  // Step 3: If user has existing membership in new org, activate it
  if (existingMembership) {
    if (existingMembership.member_status === 'ACTIVE') {
      return { success: false, error: 'Vartotojas jau yra aktyvus šios organizacijos narys' }
    }

    // Reactivate existing membership
    const newRole = preserveRole && oldMembership ? oldMembership.role : 'MEMBER'
    const { error: updateError } = await supabase
      .from('memberships')
      .update({
        member_status: 'ACTIVE',
        role: newRole,
      })
      .eq('id', existingMembership.id)

    if (updateError) {
      console.error('Error reactivating membership:', updateError)
      return { success: false, error: 'Nepavyko aktyvuoti narystės' }
    }
  } else {
    // Step 4: Create new membership in new org
    const newRole = preserveRole && oldMembership ? oldMembership.role : 'MEMBER'
    const { error: createError } = await supabase.from('memberships').insert({
      user_id: userId,
      org_id: newOrgId,
      role: newRole,
      member_status: 'ACTIVE',
      status: 'ACTIVE',
    })

    if (createError) {
      console.error('Error creating new membership:', createError)
      return { success: false, error: 'Nepavyko sukurti naujos narystės' }
    }
  }

  // Step 5: Remove from old org (set to LEFT)
  if (oldMembership) {
    const { error: leaveError } = await supabase
      .from('memberships')
      .update({ member_status: 'LEFT' })
      .eq('user_id', userId)
      .eq('org_id', oldOrgId)
      .eq('member_status', 'ACTIVE')

    if (leaveError) {
      console.error('Error leaving old organization:', leaveError)
      // Don't fail - new membership is created, just log the error
    }
  }

  // Step 6: Audit logging (soft mode, non-blocking)
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('audit_logs').insert({
        org_id: newOrgId,
        user_id: user.id,
        action: 'USER_ORG_CHANGED',
        target_table: 'memberships',
        target_id: userId,
        old_value: { org_id: oldOrgId },
        new_value: { org_id: newOrgId },
      })
    }
  } catch (auditError) {
    console.error('AUDIT INCIDENT: Failed to log USER_ORG_CHANGED:', auditError)
  }

  // Step 7: Revalidate paths
  revalidatePath('/admin')
  revalidatePath('/dashboard', 'layout')

  return { success: true }
}

/**
 * Check dependencies for a membership (Admin)
 * Returns information about what data depends on this membership
 */
export interface MembershipDependencies {
  invoices: number
  votes: number
  positions: number
  project_contributions: number
  total: number
}

export async function checkMembershipDependencies(
  membershipId: string
): Promise<MembershipDependencies> {
  const supabase = createAdminClient()

  const dependencies: MembershipDependencies = {
    invoices: 0,
    votes: 0,
    positions: 0,
    project_contributions: 0,
    total: 0,
  }

  // Check invoices
  try {
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('membership_id', membershipId)
    dependencies.invoices = count || 0
  } catch (error) {
    // Table might not exist or RLS might block
    console.warn('Could not check invoices dependencies:', error)
  }

  // Check votes
  try {
    const { count } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('membership_id', membershipId)
    dependencies.votes = count || 0
  } catch (error) {
    console.warn('Could not check votes dependencies:', error)
  }

  // Check positions
  try {
    const { count } = await supabase
      .from('positions')
      .select('*', { count: 'exact', head: true })
      .eq('membership_id', membershipId)
    dependencies.positions = count || 0
  } catch (error) {
    console.warn('Could not check positions dependencies:', error)
  }

  // Check project_contributions
  try {
    const { count } = await supabase
      .from('project_contributions')
      .select('*', { count: 'exact', head: true })
      .eq('membership_id', membershipId)
    dependencies.project_contributions = count || 0
  } catch (error) {
    console.warn('Could not check project_contributions dependencies:', error)
  }

  dependencies.total =
    dependencies.invoices +
    dependencies.votes +
    dependencies.positions +
    dependencies.project_contributions

  return dependencies
}

/**
 * Get membership ID for user in organization
 */
export async function getMembershipId(
  userId: string,
  orgId: string
): Promise<string | null> {
  const supabase = createAdminClient()

  const { data: membership, error } = await supabase
    .from('memberships')
    .select('id')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .eq('member_status', 'ACTIVE')
    .maybeSingle()

  if (error || !membership) {
    return null
  }

  return membership.id
}

/**
 * Remove user from organization (Admin)
 * 
 * Sets member_status to 'LEFT' for the user's membership in the specified organization.
 * Prevents removing OWNER if they are the only OWNER in the organization.
 * 
 * @param force - If true, will attempt to delete membership even with dependencies (uses CASCADE)
 */
export async function removeUserFromOrganization(
  userId: string,
  orgId: string,
  force: boolean = false
): Promise<{ success: boolean; error?: string; dependencies?: MembershipDependencies }> {
  const supabase = createAdminClient()

  // Step 1: Get membership to check role
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('id, role')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .eq('member_status', 'ACTIVE')
    .maybeSingle()

  if (membershipError && membershipError.code !== 'PGRST116') {
    console.error('Error fetching membership:', membershipError)
    return { success: false, error: 'Nepavyko rasti narystės' }
  }

  if (!membership) {
    return { success: false, error: 'Vartotojas nėra šios organizacijos narys' }
  }

  // Step 2: Check dependencies
  const dependencies = await checkMembershipDependencies(membership.id)

  // Step 3: If OWNER, check if there are other OWNERs
  if (membership.role === 'OWNER') {
    const { count, error: countError } = await supabase
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('role', 'OWNER')
      .eq('member_status', 'ACTIVE')

    if (countError) {
      console.error('Error counting OWNERs:', countError)
      return { success: false, error: 'Nepavyko patikrinti OWNER skaičiaus' }
    }

    if ((count || 0) <= 1) {
      return {
        success: false,
        error: 'Negalima pašalinti paskutinio OWNER iš organizacijos',
        dependencies,
      }
    }
  }

  // Step 4: If force is false and there are dependencies, return them
  if (!force && dependencies.total > 0) {
    return {
      success: false,
      error: `Narystė turi priklausomybių (${dependencies.total} įrašų). Naudokite "Pašalinti su priklausomybėmis" jei norite tęsti.`,
      dependencies,
    }
  }

  // Step 5: Set member_status to LEFT (or delete if force)
  if (force) {
    // Try to delete membership (CASCADE will handle dependencies)
    const { error: deleteError } = await supabase
      .from('memberships')
      .delete()
      .eq('id', membership.id)

    if (deleteError) {
      // If delete fails, fall back to setting status to LEFT
      console.warn('Delete failed, falling back to status update:', deleteError)
      const { error: updateError } = await supabase
        .from('memberships')
        .update({ member_status: 'LEFT' })
        .eq('id', membership.id)

      if (updateError) {
        console.error('Error removing user from organization:', updateError)
        return { success: false, error: 'Nepavyko pašalinti vartotojo iš organizacijos' }
      }
    }
  } else {
    // Normal removal: just set status to LEFT
    const { error: updateError } = await supabase
      .from('memberships')
      .update({ member_status: 'LEFT' })
      .eq('id', membership.id)

    if (updateError) {
      console.error('Error removing user from organization:', updateError)
      return { success: false, error: 'Nepavyko pašalinti vartotojo iš organizacijos' }
    }
  }

  // Step 4: Audit logging (soft mode, non-blocking)
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('audit_logs').insert({
        org_id: orgId,
        user_id: user.id,
        action: 'USER_REMOVED_FROM_ORG',
        target_table: 'memberships',
        target_id: membership.id,
        old_value: { member_status: 'ACTIVE' },
        new_value: { member_status: 'LEFT' },
      })
    }
  } catch (auditError) {
    console.error('AUDIT INCIDENT: Failed to log USER_REMOVED_FROM_ORG:', auditError)
  }

  // Step 5: Revalidate paths
  revalidatePath('/admin')
  revalidatePath('/dashboard', 'layout')

  return { success: true }
}

/**
 * Add user to organization (Admin)
 * 
 * Creates a new membership for the user in the specified organization.
 * If user already has a membership (LEFT status), reactivates it.
 */
export async function addUserToOrganization(
  userId: string,
  orgId: string,
  role: 'OWNER' | 'MEMBER' = 'MEMBER'
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Step 1: Check if user already has membership in this org
  const { data: existingMembership, error: existingError } = await supabase
    .from('memberships')
    .select('id, member_status')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .maybeSingle()

  if (existingError && existingError.code !== 'PGRST116') {
    console.error('Error checking existing membership:', existingError)
    return { success: false, error: 'Nepavyko patikrinti esamos narystės' }
  }

  // Step 2: If user has existing membership, reactivate it
  if (existingMembership) {
    if (existingMembership.member_status === 'ACTIVE') {
      return { success: false, error: 'Vartotojas jau yra aktyvus šios organizacijos narys' }
    }

    // Reactivate existing membership
    const { error: updateError } = await supabase
      .from('memberships')
      .update({
        member_status: 'ACTIVE',
        role: role,
        status: 'ACTIVE',
      })
      .eq('id', existingMembership.id)

    if (updateError) {
      console.error('Error reactivating membership:', updateError)
      return { success: false, error: 'Nepavyko aktyvuoti narystės' }
    }
  } else {
    // Step 3: Create new membership
    const { error: createError } = await supabase.from('memberships').insert({
      user_id: userId,
      org_id: orgId,
      role: role,
      member_status: 'ACTIVE',
      status: 'ACTIVE',
    })

    if (createError) {
      console.error('Error creating membership:', createError)
      return { success: false, error: 'Nepavyko sukurti narystės' }
    }
  }

  // Step 4: Audit logging (soft mode, non-blocking)
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('audit_logs').insert({
        org_id: orgId,
        user_id: user.id,
        action: 'USER_ADDED_TO_ORG',
        target_table: 'memberships',
        target_id: userId,
        old_value: null,
        new_value: { org_id: orgId, role: role, member_status: 'ACTIVE' },
      })
    }
  } catch (auditError) {
    console.error('AUDIT INCIDENT: Failed to log USER_ADDED_TO_ORG:', auditError)
  }

  // Step 5: Revalidate paths
  revalidatePath('/admin')
  revalidatePath('/dashboard', 'layout')

  return { success: true }
}

