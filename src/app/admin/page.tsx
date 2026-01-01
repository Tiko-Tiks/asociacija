import { SuperAdminDashboard } from '@/components/admin/super-admin-dashboard'
import { getGlobalStats } from '@/app/actions/admin/global-stats'
import { getAllOrganizationsAdmin } from '@/app/actions/admin/manage-orgs'

/**
 * Super Admin Dashboard - Mission Control
 * 
 * Platform Core administration interface.
 * Only accessible to users in NEXT_PUBLIC_SUPER_ADMINS.
 */
export default async function SuperAdminPage() {
  // Fetch global stats and organizations
  const [globalStats, organizations] = await Promise.all([
    getGlobalStats(),
    getAllOrganizationsAdmin(),
  ])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <SuperAdminDashboard
        globalStats={globalStats}
        organizations={organizations}
      />
    </div>
  )
}

