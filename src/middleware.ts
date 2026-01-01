import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware for Subdomain Routing
 * 
 * Handles subdomain-based routing for custom domain (asociacija.net)
 * 
 * Examples:
 * - org.asociacija.net → /c/org
 * - branduolys.asociacija.net → /c/branduolys
 * - www.asociacija.net → / (main site)
 * - asociacija.net → / (main site)
 * 
 * If subdomain is detected, rewrites to /c/[slug] route
 * Otherwise, continues with normal routing
 */
export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  
  // Extract subdomain
  // hostname format: subdomain.asociacija.net or subdomain.vercel.app
  const parts = hostname.split('.')
  
  // Check if we have a subdomain (more than 2 parts means subdomain exists)
  // asociacija.net = 2 parts (no subdomain)
  // org.asociacija.net = 3 parts (subdomain: org)
  // www.asociacija.net = 3 parts (subdomain: www, but we'll ignore it)
  
  if (parts.length >= 3) {
    const subdomain = parts[0].toLowerCase()
    
    // Ignore www and common non-community subdomains
    const ignoredSubdomains = ['www', 'api', 'admin', 'app', 'staging', 'test']
    
    if (!ignoredSubdomains.includes(subdomain)) {
      // Rewrite to /c/[slug] route
      url.pathname = `/c/${subdomain}${url.pathname === '/' ? '' : url.pathname}`
      
      // Preserve query parameters
      url.search = request.nextUrl.search
      
      return NextResponse.rewrite(url)
    }
  }
  
  // No subdomain or ignored subdomain - continue with normal routing
  return NextResponse.next()
}

/**
 * Middleware matcher
 * 
 * Only run middleware on:
 * - All routes (to check for subdomain)
 * - Exclude static files and API routes (optional, for performance)
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

