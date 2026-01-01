import { Suspense } from 'react'
import { ModernDashboard } from './modern-dashboard'
import { SystemNewsWidget } from '@/components/dashboard/system-news-widget'
import { CommandCenterData } from '@/app/actions/command-center'
import type { SystemNewsItem } from '@/app/actions/system-news'

interface CommandCenterContentProps {
  data: CommandCenterData
  orgId: string
  orgSlug: string
  canPublish: boolean
  systemNews?: SystemNewsItem[]
}

/**
 * Command Center Content Component - Modern Dashboard
 * 
 * Modern, clean dashboard with all modules:
 * - Stats overview
 * - Module cards (Resolutions, Meetings, Voting, Simple Votes, Protocols, Members)
 * - Quick actions
 * - Recent activity
 */
export function CommandCenterContent({
  data,
  orgId,
  orgSlug,
  canPublish,
  systemNews = [],
}: CommandCenterContentProps) {
  return (
    <>
      {/* System News Widget - Display at top if available */}
      {systemNews.length > 0 && (
        <div className="mb-6">
          <SystemNewsWidget news={systemNews} />
        </div>
      )}

      {/* Modern Dashboard */}
      <ModernDashboard
        orgId={orgId}
        orgSlug={orgSlug}
        stats={data.monitoring}
        recentActivity={data.activityFeed}
        canPublish={canPublish}
      />
    </>
  )
}

