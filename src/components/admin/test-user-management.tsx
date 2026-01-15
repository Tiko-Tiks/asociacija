'use client'

/**
 * TEST USER MANAGEMENT PANEL
 * 
 * UI for managing test users during development/testing.
 * Only accessible to OWNER role.
 * 
 * Features:
 * - Create test users quickly
 * - View all test users
 * - See statistics
 * - Cleanup (mark as LEFT)
 * 
 * Location: /dashboard/[slug]/admin/test-users
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  createTestUser, 
  listTestUsers, 
  getTestUserStats, 
  markTestUsersAsLeft 
} from '@/app/actions/test-helpers'
import { AlertCircle, CheckCircle2, Users, Trash2, UserPlus, BarChart3 } from 'lucide-react'

interface TestUserManagementProps {
  orgId: string
}

export function TestUserManagement({ orgId }: TestUserManagementProps) {
  // State
  const [email, setEmail] = useState('test.')
  const [firstName, setFirstName] = useState('Test')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const [testUsers, setTestUsers] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loadingUsers, setLoadingUsers] = useState(true)

  // Load data
  useEffect(() => {
    loadTestUsers()
    loadStats()
  }, [orgId])

  const loadTestUsers = async () => {
    setLoadingUsers(true)
    try {
      const result = await listTestUsers(orgId)
      if (result.success) {
        setTestUsers(result.users)
      }
    } catch (error) {
      console.error('Error loading test users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadStats = async () => {
    try {
      const result = await getTestUserStats(orgId)
      if (result.success) {
        setStats(result.stats)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const result = await createTestUser(email, firstName, lastName)
      
      if (result.success) {
        setMessage({ type: 'success', text: `✅ Test user sukurtas: ${email}` })
        setLastName('') // Clear only last name
        await loadTestUsers()
        await loadStats()
      } else {
        setMessage({ type: 'error', text: result.error || 'Nepavyko sukurti user' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Klaida kuriant user' })
    } finally {
      setLoading(false)
    }
  }

  const handleCleanup = async () => {
    if (!confirm('Ar tikrai norite pažymėti visus test users kaip LEFT?')) {
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const result = await markTestUsersAsLeft(orgId)
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `✅ Pažymėta ${result.count} test users kaip LEFT` 
        })
        await loadTestUsers()
        await loadStats()
      } else {
        setMessage({ type: 'error', text: result.error || 'Nepavyko cleanup' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Klaida cleanup' })
    } finally {
      setLoading(false)
    }
  }

  const activeUsers = testUsers.filter(u => u.member_status === 'ACTIVE')
  const leftUsers = testUsers.filter(u => u.member_status === 'LEFT')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Test User Management</h2>
        <p className="text-muted-foreground">
          Valdykite test users development/testing metu
        </p>
      </div>

      {/* Warning */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>⚠️ Development Only:</strong> Šis įrankis skirtas tik test/development aplinkai.
          Visi test users turi būti pažymėti <code>test.*@example.com</code> email formatu.
        </AlertDescription>
      </Alert>

      {/* Message */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Visi test users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              Aktyvūs test users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Left</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.left || 0}</div>
            <p className="text-xs text-muted-foreground">
              Išėję (cleaned up)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Other</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.suspended || 0) + (stats?.pending || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Suspended/Pending
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Create Test User Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Sukurti Test User
            </CardTitle>
            <CardDescription>
              Sukurkite naują test user su teisinga konvencija
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="test.user.1@example.com"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  ⚠️ Turi prasidėti <code>test.</code>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Test"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Rekomenduojama: <code>Test</code>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="User #1"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Bet koks aprašymas
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Kuriama...' : 'Sukurti Test User'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Cleanup Actions
            </CardTitle>
            <CardDescription>
              Pašalinkite test users po testavimo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm">
                Pažymėti visus test users kaip <Badge variant="outline">LEFT</Badge>
              </p>
              <p className="text-xs text-muted-foreground">
                Visi users su email <code>test.*</code> arba first_name <code>Test</code> bus 
                pažymėti kaip LEFT (soft delete). Audit trail išlieka.
              </p>
            </div>

            <Button 
              onClick={handleCleanup} 
              disabled={loading || activeUsers.length === 0}
              variant="destructive"
              className="w-full"
            >
              {loading ? 'Vykdoma...' : `Cleanup ${activeUsers.length} Test Users`}
            </Button>

            {activeUsers.length === 0 && (
              <p className="text-xs text-center text-muted-foreground">
                Nėra aktyvių test users
              </p>
            )}

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Quick Templates:</h4>
              <div className="space-y-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('test.voter.1@example.com')
                    setLastName('Voter #1')
                  }}
                  className="block w-full text-left p-2 hover:bg-muted rounded"
                >
                  test.voter.1@example.com → Test Voter #1
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('test.chairman@example.com')
                    setLastName('Chairman')
                  }}
                  className="block w-full text-left p-2 hover:bg-muted rounded"
                >
                  test.chairman@example.com → Test Chairman
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('test.member.1@example.com')
                    setLastName('Member #1')
                  }}
                  className="block w-full text-left p-2 hover:bg-muted rounded"
                >
                  test.member.1@example.com → Test Member #1
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Test Users ({testUsers.length})</CardTitle>
          <CardDescription>
            Visi test users šioje organizacijoje
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <p className="text-center py-8 text-muted-foreground">Kraunama...</p>
          ) : testUsers.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nėra test users. Sukurkite naują aukščiau.
            </p>
          ) : (
            <div className="space-y-2">
              {/* Active Users */}
              {activeUsers.length > 0 && (
                <>
                  <h4 className="text-sm font-medium text-green-600 dark:text-green-400">
                    Active ({activeUsers.length})
                  </h4>
                  {activeUsers.map((user) => (
                    <div
                      key={user.membership_id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{user.first_name} {user.last_name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        ACTIVE
                      </Badge>
                    </div>
                  ))}
                </>
              )}

              {/* Left Users */}
              {leftUsers.length > 0 && (
                <>
                  <h4 className="text-sm font-medium text-muted-foreground mt-4">
                    Left ({leftUsers.length})
                  </h4>
                  {leftUsers.map((user) => (
                    <div
                      key={user.membership_id}
                      className="flex items-center justify-between p-3 border rounded-lg opacity-60"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{user.first_name} {user.last_name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge variant="outline">LEFT</Badge>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

