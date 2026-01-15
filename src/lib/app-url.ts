/**
 * App URL Helper
 * 
 * Returns the correct app URL based on environment:
 * - Development: http://localhost:3000
 * - Production: NEXT_PUBLIC_APP_URL or VERCEL_URL or default
 */

export function getAppUrl(): string {
  // Development mode - always use localhost:3000
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }

  // Production mode - use configured URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  if (process.env.VERCEL_URL) {
    const vercelUrl = process.env.VERCEL_URL
    // VERCEL_URL might already include https:// or might not
    if (vercelUrl.startsWith('http://') || vercelUrl.startsWith('https://')) {
      return vercelUrl
    }
    return `https://${vercelUrl}`
  }

  // Default production URL
  return 'https://asociacija.net'
}

/**
 * Get app URL for client-side use
 * Uses window.location in browser, falls back to server-side logic
 */
export function getAppUrlClient(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin
    return window.location.origin
  }

  // Server-side: use same logic as getAppUrl
  return getAppUrl()
}

