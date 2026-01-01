import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReactNode } from 'react'

/**
 * Super Admin Layout - The Iron Wall
 * 
 * Security: Only users with IDs in NEXT_PUBLIC_SUPER_ADMINS can access.
 * Format: Comma-separated list of user IDs in environment variable.
 * 
 * Example: NEXT_PUBLIC_SUPER_ADMINS="uuid1,uuid2,uuid3"
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  // Get current user
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // If not authenticated, redirect to login
  if (authError || !user) {
    redirect('/login?redirect=/admin')
  }

  // Get super admin IDs from environment variable
  const superAdminIdsEnv = process.env.NEXT_PUBLIC_SUPER_ADMINS
  const superAdminIds = superAdminIdsEnv
    ? superAdminIdsEnv.split(',').map((id) => id.trim()).filter(Boolean)
    : []

  // Check if user is in super admin list
  const isSuperAdmin = superAdminIds.length > 0 && superAdminIds.includes(user.id)
  
  // Also check if user email is admin@pastas.email (fallback for development)
  const isEmailAdmin = user.email === 'admin@pastas.email'
  
  // Allow access if user is in super admin list OR is admin@pastas.email
  const hasAdminAccess = isSuperAdmin || isEmailAdmin

  // If not super admin, return 404 (don't reveal admin route exists)
  if (!hasAdminAccess) {
    console.warn('Admin access denied:', {
      userId: user.id,
      userEmail: user.email,
      superAdminIds,
      isSuperAdmin,
      isEmailAdmin,
    })
    notFound()
  }

  return <>{children}</>
}

