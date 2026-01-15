'use client'

/**
 * TEST USER STATS WIDGET
 * 
 * Small widget to show test user count in admin dashboard.
 * Can be added to admin/owner dashboard for quick monitoring.
 * 
 * Usage:
 * <TestUserStatsWidget orgId={org.id} />
 */

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getTestUserStats } from '@/app/actions/test-helpers'
import { Users, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface TestUserStatsWidgetProps {
  orgId: string
  orgSlug: string
}

export function TestUserStatsWidget({ orgId, orgSlug }: TestUserStatsWidgetProps) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [orgId])

  const loadStats = async () => {
    try {
      const result = await getTestUserStats(orgId)
      if (result.success) {
        setStats(result.stats)
      }
    } catch (error) {
      console.error('Error loading test stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground text-center">Kraunama...</p>
        </CardContent>
      </Card>
    )
  }

  // Only show widget if there are test users
  if (!stats || stats.total === 0) {
    return null
  }

  const hasActiveTests = stats.active > 0

  return (
    <Card className={hasActiveTests ? 'border-yellow-200 dark:border-yellow-800' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Test Users</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">total</div>
        </div>
        
        <div className="flex gap-2 mt-2">
          {stats.active > 0 && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {stats.active} active
            </Badge>
          )}
          {stats.left > 0 && (
            <Badge variant="outline">
              {stats.left} left
            </Badge>
          )}
        </div>

        {hasActiveTests && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
            ⚠️ Test users reikia cleanup
          </p>
        )}

        <Button
          asChild
          variant="ghost"
          size="sm"
          className="w-full mt-3 text-xs"
        >
          <Link href={`/dashboard/${orgSlug}/admin/test-users`}>
            Manage Test Users
            <ArrowRight className="ml-2 h-3 w-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

