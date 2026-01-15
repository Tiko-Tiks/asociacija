/**
 * DEV TOOLS PAGE
 * 
 * Development-only page with various testing utilities.
 * Only accessible in development environment.
 * 
 * Route: /dev-tools
 * 
 * Features:
 * - Test user switcher
 * - Test org management
 * - Quick actions
 */

import { redirect } from 'next/navigation'
import { DevOnlyTestUserSwitcher } from '@/components/dev/test-user-switcher'
import { TestUserStatsWidget } from '@/components/admin/test-user-stats-widget'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  AlertTriangle, 
  Database, 
  Users, 
  TestTube,
  ArrowRight,
  Home
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function DevToolsPage() {
  // Block in production
  if (process.env.NODE_ENV !== 'development') {
    redirect('/')
  }

  const supabase = await createClient()
  
  // Try to get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Get test org info
  const { data: testOrg }: any = await supabase
    .from('orgs')
    .select('id, slug, name, status')
    .eq('slug', 'test-dev')
    .single()

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <TestTube className="h-8 w-8 text-yellow-600" />
          <h1 className="text-3xl font-bold">Development Tools</h1>
        </div>
        <p className="text-muted-foreground">
          Testing utilities for development environment
        </p>
      </div>

      {/* Warning Banner */}
      <div className="mb-6 p-4 border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
              Development Environment Only
            </h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Šis page neturėtų būti prieinamas production. Environment check turėtų 
              redirect vartotojus. Niekada neeksponuokite test credentials production!
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Test User Switcher */}
        <div className="md:col-span-2">
          <DevOnlyTestUserSwitcher />
        </div>

        {/* Test Org Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Test Organization
            </CardTitle>
            <CardDescription>
              Test environment organization status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {testOrg ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-lg font-semibold">{testOrg.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Slug</p>
                  <p className="font-mono">{testOrg.slug}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <p className="font-semibold">{testOrg.status}</p>
                </div>
                <Button asChild className="w-full">
                  <Link href={`/dashboard/${testOrg.slug}`}>
                    Open Test Org
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">
                  Test org not found
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Run SQL setup script first:
                </p>
                <code className="text-xs bg-muted p-2 rounded">
                  sql/quick_test_org_setup.sql
                </code>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test User Stats */}
        {testOrg && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Test Users
              </CardTitle>
              <CardDescription>
                Current test user statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TestUserStatsWidget 
                orgId={testOrg.id} 
                orgSlug={testOrg.slug} 
              />
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common development tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <Button asChild variant="outline">
                <Link href="/dashboard">
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              
              {testOrg && (
                <>
                  <Button asChild variant="outline">
                    <Link href={`/dashboard/${testOrg.slug}/admin/test-users`}>
                      <Users className="mr-2 h-4 w-4" />
                      Manage Test Users
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline">
                    <Link href={`/dashboard/${testOrg.slug}`}>
                      <Database className="mr-2 h-4 w-4" />
                      Test Org Dashboard
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current User Info */}
        {user && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Current Session</CardTitle>
              <CardDescription>
                Active user information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-mono">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User ID:</span>
                  <span className="font-mono text-xs">{user.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Sign In:</span>
                  <span>{new Date(user.last_sign_in_at || '').toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Documentation Links */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Documentation</CardTitle>
          <CardDescription>
            Helpful guides for testing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            <Link 
              href="/TESTING_QUICK_START.md" 
              className="text-primary hover:underline"
            >
              → Quick Start Guide (2 min)
            </Link>
            <Link 
              href="/SQL_SCRIPTS_GUIDE.md" 
              className="text-primary hover:underline"
            >
              → SQL Scripts Guide
            </Link>
            <Link 
              href="/TESTING_SAFETY_GUIDE.md" 
              className="text-primary hover:underline"
            >
              → Testing Safety Guide (full)
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export const metadata = {
  title: 'Dev Tools',
  description: 'Development testing utilities',
}

