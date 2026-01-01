import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Maintenance Mode Middleware
 * 
 * Checks if maintenance mode is enabled and redirects to maintenance page.
 * Allows bypass for admin users.
 */

// Get maintenance mode from environment
// Note: In middleware, we need to check the actual value
const getMaintenanceMode = () => {
  const mode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE
  return mode === 'true' || mode === '1'
}

const getBypassKey = () => {
  return process.env.MAINTENANCE_BYPASS_KEY || 'bypass-maintenance-2024'
}

export function maintenanceMiddleware(request: NextRequest) {
  // Skip maintenance check if not enabled
  const isMaintenanceMode = getMaintenanceMode()
  
  // Debug logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Maintenance] Mode check:', {
      env: process.env.NEXT_PUBLIC_MAINTENANCE_MODE,
      isEnabled: isMaintenanceMode,
      pathname: request.nextUrl.pathname,
    })
  }
  
  if (!isMaintenanceMode) {
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
  const requiredBypassKey = getBypassKey()
  
  if (bypassKey === requiredBypassKey) {
    // Set bypass cookie for future requests
    const response = NextResponse.next()
    response.cookies.set('maintenance-bypass', requiredBypassKey, {
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

