import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { getUserOrgs } from "@/app/actions/organizations"
import { DashboardLayoutClient } from "@/components/dashboard/dashboard-layout-client"
import { getCurrentUser } from "@/app/actions/auth"
import { isPlatformAdmin } from "@/app/actions/admin"
import { redirect } from "next/navigation"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  // Check authentication
  // getCurrentUser() returns null for expired/invalid sessions
  // This prevents infinite redirect loops by gracefully handling session expiration
  const user = await getCurrentUser()
  
  if (!user) {
    // TERMINAL: Redirects to /login?session=expired (login page renders, no further redirect)
    // Include session expiry indicator so user understands what happened
    // This is safe because getCurrentUser() validates the session first
    redirect('/login?session=expired')
  }
  
  // TERMINAL: User authenticated, renders dashboard layout (no redirect)

  // Fetch all organizations the user belongs to
  // If getUserOrgs throws an error (e.g., user has no memberships), handle it gracefully
  let orgs: Array<{ id: string; name: string; slug: string; membership_id: string }> = []
  try {
    orgs = await getUserOrgs()
  } catch (error) {
    // If getUserOrgs fails, it might be because:
    // 1. User has no memberships (expected - return empty array)
    // 2. Database connection issue (log but continue)
    // 3. RLS policy issue (log but continue)
    // Individual pages will handle the empty state
    console.error('Error fetching user organizations:', error)
    // Continue with empty array - don't crash the app
  }

  // Check if user is platform admin (for sidebar admin link)
  let isAdmin = false
  try {
    isAdmin = await isPlatformAdmin()
  } catch (error) {
    // If admin check fails, default to false
    console.error('Error checking admin status:', error)
  }

  return (
    <DashboardLayoutClient orgs={orgs} userEmail={user.email || undefined} isAdmin={isAdmin}>
      {children}
    </DashboardLayoutClient>
  )
}
