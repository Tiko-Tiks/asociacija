'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react'
import type { GlobalStats } from '@/app/actions/admin/global-stats'

interface GlobalStatsProps {
  stats: GlobalStats
}

export function GlobalStats({ stats }: GlobalStatsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-100 mb-4">
          Global Metrics - The Pulse
        </h2>
      </div>

      {/* Communities Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Total Communities
            </CardTitle>
            <Building2 className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-100">
              {stats.totalCommunities}
            </div>
            <div className="flex gap-4 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {stats.activeCommunities} active
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-yellow-500" />
                {stats.pendingCommunities} pending
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-500" />
                {stats.suspendedCommunities} suspended
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-100">
              {stats.totalUsers}
            </div>
            <div className="flex gap-4 mt-2 text-xs text-slate-500">
              <span>{stats.activeMemberships} active</span>
              <span>{stats.suspendedMemberships} suspended</span>
            </div>
            {stats.userGrowthLast30Days > 0 && (
              <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +{stats.userGrowthLast30Days} last 30 days
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {stats.totalRevenue.toFixed(2)} €
            </div>
            <div className="flex gap-4 mt-2 text-xs text-slate-500">
              <span>{stats.paidInvoices} paid</span>
              <span>{stats.unpaidInvoices} unpaid</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.totalInvoices} total invoices
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              System Health
            </CardTitle>
            {stats.systemHealth.database === 'healthy' ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-slate-100 capitalize">
              {stats.systemHealth.database}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Last checked:{' '}
              {new Date(stats.systemHealth.lastChecked).toISOString().replace('T', ' ').slice(0, 19)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-400">
              Community Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Active</span>
                <span className="text-sm font-semibold text-green-500">
                  {stats.activeCommunities}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Pending</span>
                <span className="text-sm font-semibold text-yellow-500">
                  {stats.pendingCommunities}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Suspended</span>
                <span className="text-sm font-semibold text-red-500">
                  {stats.suspendedCommunities}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-400">
              Membership Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Active</span>
                <span className="text-sm font-semibold text-green-500">
                  {stats.activeMemberships}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Suspended</span>
                <span className="text-sm font-semibold text-red-500">
                  {stats.suspendedMemberships}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-400">
              Financial Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Total Invoices</span>
                <span className="text-sm font-semibold text-slate-100">
                  {stats.totalInvoices}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Paid</span>
                <span className="text-sm font-semibold text-green-500">
                  {stats.paidInvoices}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">Unpaid</span>
                <span className="text-sm font-semibold text-red-500">
                  {stats.unpaidInvoices}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

