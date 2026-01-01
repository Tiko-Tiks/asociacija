'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ERROR_CODE, MEMBERSHIP_STATUS } from '@/app/domain/constants'
import { authViolation } from '@/app/domain/errors'
import { MembershipState } from '@/app/domain/membership-state'

/**
 * Server Action to sign in a user with email and password.
 * 
 * Follows .cursorrules v17.2-OSMIUM-PLATINUM:
 * - Uses authenticated user client (no service_role)
 * - Handles authentication errors gracefully
 * - Redirects on success
 * 
 * @param formData - Form data containing email and password
 * @param redirectTo - Optional redirect URL after successful login
 * @returns void (redirects on success)
 * @throws Error with message for invalid credentials or other errors
 */
export async function login(formData: FormData, redirectTo?: string) {
  const email = formData.get('email')?.toString()
  const password = formData.get('password')?.toString()

  if (!email || !password) {
    throw new Error('Prašome įvesti el. paštą ir slaptažodį')
  }

  // Get Supabase client (server-side, respects RLS)
  const supabase = await createClient()

  // Sign in with email and password
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Handle authentication errors
    // Map Supabase errors to user-friendly Lithuanian messages
    if (error.message.includes('Invalid login credentials') || error.message.includes('invalid')) {
      throw new Error('Neteisingas el. paštas arba slaptažodis')
    }
    if (error.message.includes('Email not confirmed')) {
      throw new Error('El. paštas nepatvirtintas. Patikrinkite savo el. paštą.')
    }
    if (error.message.includes('Too many requests')) {
      throw new Error('Per daug bandymų. Bandykite vėliau.')
    }
    // Fallback for other errors
    throw new Error('Prisijungti nepavyko. Patikrinkite duomenis ir bandykite dar kartą.')
  }

  if (!data.user) {
    throw new Error('Prisijungti nepavyko. Bandykite dar kartą.')
  }

  // Determine redirect destination
  // Priority: redirectTo parameter > User's organization dashboard > Admin panel > Landing page
  if (redirectTo) {
    // Decode and validate redirect URL
    const decodedRedirect = decodeURIComponent(redirectTo)
    console.log('Login: redirectTo parameter provided:', decodedRedirect)
    
    // If redirect is to a dashboard, verify user has membership in that org
    const dashboardMatch = decodedRedirect.match(/^\/dashboard\/([^/]+)/)
    if (dashboardMatch) {
      const targetSlug = dashboardMatch[1]
      console.log('Login: Redirecting to dashboard, checking membership for slug:', targetSlug)
      
      // Check if user has membership in this org
      try {
        const { getUserOrgs } = await import('@/app/actions/organizations')
        const orgs = await getUserOrgs()
        const hasMembership = orgs.some((org: any) => org.slug === targetSlug)
        
        if (hasMembership) {
          console.log('Login: User has membership, redirecting to:', decodedRedirect)
          redirect(decodedRedirect)
        } else {
          console.log('Login: User does not have membership in', targetSlug, 'redirecting to first org instead')
          // User doesn't have membership in target org, redirect to first org instead
          if (orgs.length > 0 && orgs[0]?.slug) {
            redirect(`/dashboard/${orgs[0].slug}`)
          }
        }
      } catch (error) {
        console.error('Login: Error checking membership, using redirect anyway:', error)
        // On error, still try to redirect (might work if user has access)
        redirect(decodedRedirect)
      }
    } else {
      // Not a dashboard redirect, use as-is
      console.log('Login: Non-dashboard redirect, using as-is:', decodedRedirect)
      redirect(decodedRedirect)
    }
  }

  // Determine redirect destination based on user's membership state
  // Priority: User's organization dashboard > Admin panel > Landing page
  try {
    // Check if user has active memberships
    const { getUserOrgs } = await import('@/app/actions/organizations')
    const orgs = await getUserOrgs()
    
    console.log('Login: Checking user orgs for redirect:', { orgCount: orgs.length })
    
    if (orgs.length > 0) {
      // User has organizations - redirect to first organization's dashboard
      const firstOrg = orgs[0]
      if (firstOrg?.slug) {
        console.log('Login: Redirecting to first org dashboard:', firstOrg.slug)
        redirect(`/dashboard/${firstOrg.slug}`)
      } else {
        console.log('Login: First org has no slug, trying next org or admin')
      }
    }

    // Check if user is platform admin (super admin or branduolys owner)
    const { isPlatformAdmin } = await import('@/app/actions/admin')
    const isAdmin = await isPlatformAdmin()
    if (isAdmin) {
      console.log('Login: User is platform admin, redirecting to admin panel')
      redirect('/admin')
    }
  } catch (error) {
    // If error determining redirect, fall back to landing page
    console.error('Login: Error determining redirect destination:', error)
  }
  
  // Fallback: Redirect to landing page
  console.log('Login: No orgs or admin, redirecting to landing page')
  redirect('/')
}

/**
 * Server Action to check if user is authenticated.
 * 
 * Handles expired/invalid sessions gracefully by returning null.
 * This prevents redirect loops and provides clear session state.
 * 
 * Session handling:
 * - Expired sessions: Returns null (no error thrown, no silent failure)
 * - Invalid tokens: Returns null (no error thrown)
 * - Network errors: May throw (caught by caller)
 * - No repeated retries: Single call only, no automatic retry logic
 * 
 * @returns User object if authenticated with valid session, null otherwise
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  
  // getUser() validates the session and returns error for expired/invalid tokens
  // This is a single call - no automatic retries, no repeated attempts
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  // Return null for expired/invalid sessions (graceful handling)
  // This is NOT a silent failure - it's the expected behavior for expired sessions
  // Calling code must explicitly check for null to handle unauthenticated state
  if (error || !user) {
    return null
  }

  return user
}

/**
 * Server Action to sign out the current user.
 * 
 * @returns void (redirects to login on success)
 */
export async function logout() {
  const supabase = await createClient()
  
  await supabase.auth.signOut()
  
  redirect('/login')
}

/**
 * Server Action to send password reset email.
 * 
 * Uses Supabase's password reset functionality which sends an email
 * with a reset link to the user.
 * 
 * @param formData - Form data containing email
 * @returns Object with success status and optional error message
 */
export async function forgotPassword(formData: FormData) {
  const email = formData.get('email')?.toString()

  if (!email) {
    return {
      success: false,
      error: 'Prašome įvesti el. pašto adresą',
    }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return {
      success: false,
      error: 'Neteisingas el. pašto adreso formatas',
    }
  }

  // Use anonymous client for password reset (no authentication required)
  const { createAnonClient } = await import('@/lib/supabase/server')
  const supabase = createAnonClient()

  // Send password reset email
  // Determine app URL: priority: NEXT_PUBLIC_APP_URL > VERCEL_URL > default production URL
  let appUrl = 'https://asociacija.net' // Default production URL
  
  if (process.env.NEXT_PUBLIC_APP_URL) {
    // Use explicitly set app URL (production)
    appUrl = process.env.NEXT_PUBLIC_APP_URL
    // Ensure it doesn't end with /
    appUrl = appUrl.replace(/\/$/, '')
  } else if (process.env.VERCEL_URL) {
    // Use Vercel URL (preview/production)
    const vercelUrl = process.env.VERCEL_URL
    // VERCEL_URL might already include https:// or might not
    if (vercelUrl.startsWith('http://') || vercelUrl.startsWith('https://')) {
      appUrl = vercelUrl
    } else {
      appUrl = `https://${vercelUrl}`
    }
  }
  
  // In development, use localhost only if explicitly set
  if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_APP_URL && !process.env.VERCEL_URL) {
    appUrl = 'http://localhost:3000'
  }
  
  console.log('Password reset redirect URL:', `${appUrl}/reset-password`)
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/reset-password`,
  })

  if (error) {
    // Don't reveal if email exists or not (security best practice)
    // Always return success message to prevent email enumeration
    console.error('Password reset error:', error)
    // Return success even on error to prevent email enumeration
    return {
      success: true,
      message: 'Jei šis el. paštas yra registruotas, jūs gausite slaptažodžio atkūrimo nuorodą.',
    }
  }

  return {
    success: true,
    message: 'Jei šis el. paštas yra registruotas, jūs gausite slaptažodžio atkūrimo nuorodą.',
  }
}

/**
 * Server Action to reset password using a reset token.
 * 
 * Uses Supabase's password reset functionality which requires a valid
 * reset token from the email link.
 * 
 * @param formData - Form data containing password and code (reset token)
 * @param next - Optional redirect URL after successful password reset
 * @returns void (redirects on success)
 * @throws Error with message for invalid token or other errors
 */
export async function resetPassword(formData: FormData, next?: string) {
  const password = formData.get('password')?.toString()
  const code = formData.get('code')?.toString()

  if (!password || !code) {
    throw new Error('Prašome įvesti slaptažodį ir patvirtinimo kodą')
  }

  if (password.length < 6) {
    throw new Error('Slaptažodis turi būti bent 6 simbolių ilgio')
  }

  // Get Supabase client
  const supabase = await createClient()

  // Exchange the code for a session
  // Supabase resetPasswordForEmail sends a code that needs to be exchanged for a session
  const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    if (exchangeError.message.includes('expired') || exchangeError.message.includes('invalid')) {
      throw new Error('Atkūrimo nuoroda nebegalioja arba neteisinga. Prašome užsakyti naują nuorodą.')
    }
    throw new Error('Slaptažodžio atkūrimas nepavyko. Bandykite dar kartą.')
  }

  // Verify we have a session
  if (!sessionData.session) {
    throw new Error('Nepavyko sukurti sesijos. Bandykite dar kartą.')
  }

  // Update password (user is now authenticated via the session from the code)
  const { error: updateError } = await supabase.auth.updateUser({
    password: password,
  })

  if (updateError) {
    throw new Error('Nepavyko atnaujinti slaptažodžio. Bandykite dar kartą.')
  }

  // Determine redirect destination
  if (next) {
    redirect(decodeURIComponent(next))
  }

  // Try to redirect to user's dashboard
  try {
    const { getUserOrgs } = await import('@/app/actions/organizations')
    const orgs = await getUserOrgs()
    
    if (orgs.length > 0 && orgs[0]?.slug) {
      redirect(`/dashboard/${orgs[0].slug}`)
    }
  } catch (error) {
    console.error('Error determining redirect destination:', error)
  }

  // Fallback: Redirect to login
  redirect('/login?password_reset=success')
}

/**
 * Single Source of Truth: Membership State Resolver
 * 
 * Implements Section 7.3 of .cursorrules.
 * 
 * Rules:
 * - No DB schema changes, no RLS policy changes, no service_role
 * - Uses authenticated user context only
 * - Empty result due to RLS = NO_MEMBERSHIP, NOT an error
 * - Multiple memberships: ACTIVE takes precedence over SUSPENDED
 * - No UI rendering, no redirects, no side effects
 * - Minimal queries only (select 'status' only, no '*')
 * 
 * Session handling:
 * - Expired sessions: Returns UNAUTHENTICATED (no error thrown, predictable behavior)
 * - Invalid tokens: Returns UNAUTHENTICATED (no error thrown)
 * - Network errors: May throw (caught by Landing Page caller)
 * - No repeated retries: Single calls only, no automatic retry logic
 * 
 * Resolution (per Section 7.3):
 * 1. No session -> UNAUTHENTICATED
 * 2. Session exists:
 *    - No membership rows -> AUTHENTICATED_NO_MEMBERSHIP
 *    - status == 'SUSPENDED' (and no ACTIVE) -> MEMBERSHIP_SUSPENDED
 *    - status == 'ACTIVE' -> MEMBERSHIP_ACTIVE
 * 
 * @returns MembershipState - One of the four allowed states (EXHAUSTIVE STATE MACHINE)
 */
export async function resolveMembershipState(): Promise<MembershipState> {
  const supabase = await createClient()

  // Step 1: Check authentication
  // getUser() validates session; expired/invalid sessions return error
  // Single call only - no automatic retries, predictable behavior
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // No session or invalid session -> UNAUTHENTICATED
  // This is NOT a silent failure - it's the expected behavior for expired sessions
  // Expired sessions resolve to UNAUTHENTICATED state, preventing redirect loops
  if (authError || !user) {
    return 'UNAUTHENTICATED'
  }

  // Step 2: Query memberships for authenticated user
  // Do NOT filter by status - need all statuses to determine state
  // RLS enforces user can only see their own memberships
  // Minimal query: select only 'status' (no '*', no profiles)
  const { data: memberships, error: membershipsError }: any = await supabase
    .from('memberships')
    .select('status')
    .eq('user_id', user.id)

  // Step 3: Handle RLS empty results (per Section 7.3)
  // Empty result due to RLS = NO_MEMBERSHIP, NOT an error
  if (membershipsError) {
    // RLS violation (42501) or other errors -> NO_MEMBERSHIP
    return 'AUTHENTICATED_NO_MEMBERSHIP'
  }

  if (!memberships || memberships.length === 0) {
    return 'AUTHENTICATED_NO_MEMBERSHIP'
  }

  // Step 4: Determine state based on membership statuses
  // ACTIVE takes precedence over SUSPENDED (per Section 7.3)
  const hasActive = memberships.some((m: any) => m.status === MEMBERSHIP_STATUS.ACTIVE)
  const hasSuspended = memberships.some((m: any) => m.status === MEMBERSHIP_STATUS.SUSPENDED)

  if (hasActive) {
    return 'MEMBERSHIP_ACTIVE'
  }

  if (hasSuspended) {
    return 'MEMBERSHIP_SUSPENDED'
  }

  // Fallback: memberships exist but no known status -> NO_MEMBERSHIP
  return 'AUTHENTICATED_NO_MEMBERSHIP'
}

