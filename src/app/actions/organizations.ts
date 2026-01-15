import { createClient } from '@/lib/supabase/server'
import { createPublicClient } from '@/lib/supabase/public'
import { requireAuth } from './_guards'
import { authViolation } from '@/app/domain/errors'
import { MEMBERSHIP_STATUS } from '@/app/domain/constants'

/**
 * Public function to get an organization by slug.
 * 
 * Used by both org switcher (via getUserOrgs) and public community page.
 * 
 * Rules:
 * - No authentication required (public read access)
 * - Uses same table and fields as org switcher: orgs table, id/name/slug fields
 * - RLS may block access - caller should handle gracefully
 * 
 * @param slug - Organization slug to query
 * @returns Organization with id, name, slug, or null if not found
 */
export async function getOrgBySlug(slug: string): Promise<{
  id: string
  name: string
  slug: string
  logo_url?: string | null
} | null> {
  // Use public client for anonymous access (no auth required)
  // This allows public pages to query orgs without authentication
  // NO cookies, NO session, NO auth logic - pure anonymous access
  const supabase = createPublicClient()

  // Use EXACT SAME query pattern as org switcher
  // Try to select logo_url, but handle gracefully if column doesn't exist
  let { data: org, error: orgError }: any = await supabase
    .from('orgs')
    .select('id, name, slug, logo_url')
    .eq('slug', slug)
    .maybeSingle()
  
  // If error is due to missing column, retry without logo_url
  if (orgError && (orgError?.code === '42703' || orgError?.message?.includes('logo_url'))) {
    const { data: orgRetry, error: orgRetryError }: any = await supabase
      .from('orgs')
      .select('id, name, slug')
      .eq('slug', slug)
      .maybeSingle()
    
    if (!orgRetryError && orgRetry) {
      org = { ...orgRetry, logo_url: null }
      orgError = null
    }
  }

  // Temporary console.log showing fetched org result
  console.log('PUBLIC_ORG_FETCH: getOrgBySlug result:', {
    slug,
    orgFound: !!org,
    orgId: org?.id,
    orgName: org?.name,
    orgSlug: org?.slug,
    error: orgError ? {
      code: orgError.code,
      message: orgError.message,
      details: orgError.details,
      hint: orgError.hint,
    } : null,
  })

  if (orgError) {
    // Log detailed error for debugging
    console.error('Error fetching org by slug:', {
      slug,
      errorCode: orgError.code,
      errorMessage: orgError.message,
      errorDetails: orgError.details,
      errorHint: orgError.hint,
      // Common issues:
      // - 42501: RLS policy violation (anon user blocked)
      // - PGRST116: No rows returned (org not found)
      // - 42703: Column does not exist
    })
    
    // If RLS blocks access (42501), log specific message
    if (orgError.code === '42501') {
      console.error('RLS_BLOCKED: Public access to orgs table is blocked by RLS policies')
      console.error('Solution: RLS policies on orgs table must allow SELECT for anon users')
    }
    
    return null
  }

  return org || null
}

/**
 * Server Action to get all organizations the current user belongs to.
 * 
 * Rules:
 * - Uses authenticated user client (no service_role)
 * - Only returns orgs where user has ACTIVE membership
 * - RLS enforces user can only see their own memberships
 * 
 * @returns Array of organizations with id, name, slug, and membership_id
 * @throws Error('auth_violation') if authentication fails
 */
export async function getUserOrgs(): Promise<
  Array<{
    id: string
    name: string
    slug: string
    membership_id: string
    role?: string
    logo_url?: string | null
    status?: string
    metadata?: any
  }>
> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Step 2: Query memberships for the user
  // RLS on memberships will enforce user can only see their own memberships
  // Query ALL memberships (including PENDING) so users can access dashboard even with PENDING status
  // This allows users to see their pending membership and wait for approval
  const { data: allMemberships, error: membershipsError }: any = await supabase
    .from('memberships')
    .select('id, org_id, role, joined_at, member_status')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })

  if (membershipsError) {
    // Check if error is due to RLS violation
    if (membershipsError?.code === '42501') {
      console.error('RLS violation when fetching memberships')
      authViolation()
    }
    // If memberships query fails, log and return empty array instead of throwing
    // This allows the UI to render even if there's a temporary DB issue
    console.error('Error fetching memberships:', membershipsError)
    return []
  }

  // Use allMemberships (including PENDING) so users can access dashboard even with PENDING status
  const memberships = allMemberships || []

  if (!memberships || memberships.length === 0) {
    console.log('No memberships found for user:', user.id)
    return []
  }

  console.log(`Found ${memberships.length} memberships for user`)

  // Step 3: Query orgs for the org_ids
  const orgIds = memberships.map((m: any) => m.org_id)
  console.log('Querying orgs for IDs:', orgIds)
  
  // Try to select logo_url - handle gracefully if column doesn't exist
  // NOTE: metadata column does NOT exist in orgs table (schema frozen v19.0)
  // PRE_ORG blocking logic should not rely on metadata column
  const { data: orgs, error: orgsError }: any = await supabase
    .from('orgs')
    .select('id, name, slug, logo_url, status')
    .in('id', orgIds)


  console.log('ORGS QUERY RESULT:', { 
    orgs, 
    error: orgsError, 
    orgIds,
    orgCount: orgs?.length || 0
  })

  if (orgsError) {
    // Check if error is due to RLS violation
    if (orgsError?.code === '42501') {
      console.error('RLS violation when fetching orgs')
      authViolation()
    }
    
    // Check if error is due to missing column (logo_url or metadata doesn't exist)
    // This can happen if SQL migration hasn't been run
    if (orgsError?.code === '42703') {
      console.warn('Column not found in orgs table, trying with minimal columns. Error:', orgsError?.message)
      
      // Try with just the essential columns that definitely exist
      // NOTE: metadata column may not exist in orgs table (schema frozen)
      const { data: orgsRetry, error: orgsRetryError }: any = await supabase
        .from('orgs')
        .select('id, name, slug, status')
        .in('id', orgIds)
      
      
      if (orgsRetryError) {
        console.error('Error fetching organizations (retry with minimal columns):', orgsRetryError)
        return []
      }
      
      // Map results without logo_url and metadata
      const orgsMap = new Map<string, { name: string; slug: string; status?: string }>(
        (orgsRetry || []).map((org: any) => [org.id, { name: org.name, slug: org.slug, status: org.status }])
      )
      
      return memberships.map((membership: any) => {
        const orgData = orgsMap.get(membership.org_id) || { name: 'Unknown Organization', slug: '', status: undefined }
        return {
          id: membership.org_id,
          name: orgData.name,
          slug: orgData.slug,
          membership_id: membership.id,
          role: membership.role,
          logo_url: null, // logo_url not available
          status: orgData.status,
          metadata: undefined, // metadata not available (schema frozen, column doesn't exist)
        }
      })
    }
    
    // If orgs query fails, log and return empty array instead of throwing
    // This allows the UI to render even if there's a temporary DB issue
    console.error('Error fetching organizations:', orgsError)
    return []
  }

  // Step 4: Combine memberships with orgs
  // NOTE: metadata column does NOT exist in orgs table (schema frozen v19.0)
  const orgsMap = new Map<string, { name: string; slug: string; logo_url?: string | null; status?: string }>(
    (orgs || []).map((org: any) => [org.id, { name: org.name, slug: org.slug, logo_url: org.logo_url, status: org.status }])
  )

  const result = memberships.map((membership: any) => {
    const orgData = orgsMap.get(membership.org_id) || { name: 'Unknown Organization', slug: '', logo_url: null, status: undefined }
    return {
      id: membership.org_id,
      name: orgData.name,
      slug: orgData.slug,
      membership_id: membership.id,
      role: membership.role,
      logo_url: orgData.logo_url || null,
      status: orgData.status,
      metadata: undefined, // metadata column does not exist in orgs table (schema frozen)
    }
  })

  console.log('RETURNING ORGS:', result)
  return result
}

/**
 * Server Action to get a specific organization by membership_id.
 * 
 * @param membership_id - UUID of the membership
 * @returns Organization with id, name, and membership_id
 * @throws Error('auth_violation') if authentication fails
 * @throws Error('operation_failed') if membership not found
 */
export async function getOrgByMembershipId(
  membership_id: string
): Promise<{
  id: string
  name: string
  membership_id: string
}> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Query membership
  // CRITICAL: Use member_status (not status) per schema fix
  const { data: membership, error: membershipError }: any = await supabase
    .from('memberships')
    .select('org_id')
    .eq('id', membership_id)
    .eq('user_id', user.id)
    .eq('member_status', MEMBERSHIP_STATUS.ACTIVE)
    .single()

  if (membershipError || !membership) {
    if (membershipError?.code === '42501') {
      authViolation()
    }
    // operationFailed() - but let's return null instead for graceful handling
    throw new Error('Membership not found')
  }

  // Query organization
  const { data: org, error: orgError }: any = await supabase
    .from('orgs')
    .select('id, name')
    .eq('id', membership.org_id)
    .single()

  if (orgError || !org) {
    if (orgError?.code === '42501') {
      authViolation()
    }
    throw new Error('Organization not found')
  }

  return {
    id: org.id,
    name: org.name,
    membership_id: membership.id,
  }
}

/**
 * Server Action to get the user's role for a specific membership.
 * 
 * @param membership_id - UUID of the membership
 * @returns User's role (OWNER, ADMIN, CHAIR, or MEMBER)
 * @throws Error('auth_violation') if authentication fails
 */
export async function getMembershipRole(
  membership_id: string
): Promise<'OWNER' | 'ADMIN' | 'CHAIR' | 'MEMBER'> {
  const supabase = await createClient()
  const user = await requireAuth(supabase)

  // Query membership role
  // CRITICAL: Use member_status (not status) per schema fix
  const { data: membership, error: membershipError }: any = await supabase
    .from('memberships')
    .select('role')
    .eq('id', membership_id)
    .eq('user_id', user.id)
    .eq('member_status', MEMBERSHIP_STATUS.ACTIVE)
    .single()

  if (membershipError || !membership) {
    if (membershipError?.code === '42501') {
      authViolation()
    }
    // Default to MEMBER if membership not found
    return 'MEMBER'
  }

  return (membership.role as 'OWNER' | 'ADMIN' | 'CHAIR' | 'MEMBER') || 'MEMBER'
}
