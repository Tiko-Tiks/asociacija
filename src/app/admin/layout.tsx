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
  const superAdminIds = process.env.NEXT_PUBLIC_SUPER_ADMINS?.split(',').map(
    (id) => id.trim()
  ) || []

  // Check if user is in super admin list
  const isSuperAdmin = superAdminIds.includes(user.id)

  // If not super admin, return 404 (don't reveal admin route exists)
  if (!isSuperAdmin) {
    notFound()
  }

  return <>{children}</>
}

