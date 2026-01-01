import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Maintenance Mode Middleware
 * 
 * Checks if maintenance mode is enabled and redirects to maintenance page.
 * Allows bypass for admin users.
 */

const MAINTENANCE_MODE = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true'
const MAINTENANCE_BYPASS_KEY = process.env.MAINTENANCE_BYPASS_KEY || 'bypass-maintenance'

export function maintenanceMiddleware(request: NextRequest) {
  // Skip maintenance check if not enabled
  if (!MAINTENANCE_MODE) {
    return null
  }

  const { pathname } = request.nextUrl

  // Allow access to maintenance page itself
  if (pathname === '/maintenance') {
    return null
  }

  // Allow access to API routes (for admin operations)
  if (pathname.startsWith('/api/')) {
    return null
  }

  // Check for bypass key in query parameter or cookie
  const bypassKey = request.nextUrl.searchParams.get('bypass') || request.cookies.get('maintenance-bypass')?.value
  
  if (bypassKey === MAINTENANCE_BYPASS_KEY) {
    // Set bypass cookie for future requests
    const response = NextResponse.next()
    response.cookies.set('maintenance-bypass', MAINTENANCE_BYPASS_KEY, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
    })
    return response
  }

  // Check if user is admin (via cookie or header)
  // This is a simple check - in production, you might want to verify via API
  const isAdmin = request.cookies.get('is-admin')?.value === 'true'
  
  if (isAdmin) {
    return null
  }

  // Redirect to maintenance page
  const url = request.nextUrl.clone()
  url.pathname = '/maintenance'
  return NextResponse.redirect(url)
}

