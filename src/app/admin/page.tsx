import { SuperAdminDashboard } from '@/components/admin/super-admin-dashboard'
import { getGlobalStats } from '@/app/actions/admin/global-stats'
import { getAllOrganizationsAdmin } from '@/app/actions/admin/manage-orgs'
import { getCommunityApplications } from '@/app/actions/admin'

/**
 * Super Admin Dashboard - Mission Control
 * 
 * Platform Core administration interface.
 * Only accessible to users in NEXT_PUBLIC_SUPER_ADMINS.
 */
export const dynamic = 'force-dynamic' // Uses admin client with service role key

export default async function SuperAdminPage() {
  try {
    // Fetch global stats, organizations, and community applications
    const [globalStats, organizations, applications] = await Promise.all([
      getGlobalStats().catch((error) => {
        console.error('Error fetching global stats:', error)
        // Return default stats on error
        return {
          totalCommunities: 0,
          activeCommunities: 0,
          pendingCommunities: 0,
          suspendedCommunities: 0,
          totalUsers: 0,
          activeMemberships: 0,
          suspendedMemberships: 0,
          totalInvoices: 0,
          paidInvoices: 0,
          unpaidInvoices: 0,
          totalRevenue: 0,
          userGrowthLast30Days: 0,
          systemHealth: {
            database: 'degraded' as const,
            lastChecked: new Date().toISOString(),
          },
        }
      }),
      getAllOrganizationsAdmin().catch((error) => {
        console.error('Error fetching organizations:', error)
        return []
      }),
      getCommunityApplications().catch((error) => {
        console.error('Error fetching community applications:', error)
        return []
      }),
    ])

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <SuperAdminDashboard
          globalStats={globalStats}
          organizations={organizations}
          applications={applications}
        />
      </div>
    )
  } catch (error) {
    console.error('Error in SuperAdminPage:', error)
    // Return error page
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Klaida</h1>
          <p className="text-slate-300 mb-4">
            Nepavyko užkrauti admin puslapio. Patikrinkite serverio log&apos;us.
          </p>
          <p className="text-sm text-slate-500">
            {error instanceof Error ? error.message : 'Nežinoma klaida'}
          </p>
        </div>
      </div>
    )
  }
}

