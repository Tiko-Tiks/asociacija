'use client'

/**
 * DEV-ONLY TEST USER SWITCHER
 * 
 * Quick switcher for testing different user perspectives.
 * Only shown in development environment.
 * 
 * Features:
 * - Quick login as different test users
 * - Shows current user
 * - One-click switch
 * - Credential display
 * 
 * ⚠️ SECURITY: Only render in development!
 */

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  Crown, 
  User, 
  Vote,
  LogIn,
  AlertTriangle,
  Copy,
  Check
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface TestUser {
  email: string
  password: string
  role: 'OWNER' | 'MEMBER'
  name: string
  purpose: string
  icon: any
  color: string
}

const TEST_USERS: TestUser[] = [
  {
    email: 'test.member.1@example.com',
    password: 'Test123!',
    role: 'MEMBER',
    name: 'Test Member #1',
    purpose: 'General member actions, create drafts, vote',
    icon: User,
    color: 'text-blue-600',
  },
  {
    email: 'test.member.2@example.com',
    password: 'Test123!',
    role: 'MEMBER',
    name: 'Test Member #2',
    purpose: 'Test multiple member interactions, voting',
    icon: User,
    color: 'text-green-600',
  },
  {
    email: 'test.member.3@example.com',
    password: 'Test123!',
    role: 'MEMBER',
    name: 'Test Member #3',
    purpose: 'Additional member for voting scenarios',
    icon: User,
    color: 'text-purple-600',
  },
  {
    email: 'test.member.4@example.com',
    password: 'Test123!',
    role: 'MEMBER',
    name: 'Test Member #4',
    purpose: 'Test member permissions, group actions',
    icon: User,
    color: 'text-orange-600',
  },
  {
    email: 'test.voter@example.com',
    password: 'Test123!',
    role: 'MEMBER',
    name: 'Test Voter',
    purpose: 'Focus on voting features, tallying',
    icon: Vote,
    color: 'text-gray-600',
  },
]

export function TestUserSwitcher() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)

  // Load current user on mount
  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUser(data.user.email || null)
      }
    })
  })

  const handleSwitch = async (user: TestUser) => {
    setLoading(user.email)
    setMessage(null)

    try {
      // Sign out current user
      await supabase.auth.signOut()

      // Sign in as test user
      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password,
      })

      if (error) {
        setMessage({ 
          type: 'error', 
          text: `Login failed: ${error.message}. User might not exist in auth.users.` 
        })
        setLoading(null)
        return
      }

      setCurrentUser(user.email)
      setMessage({ 
        type: 'success', 
        text: `✅ Switched to ${user.name}` 
      })

      // Redirect to test org dashboard
      setTimeout(() => {
        router.push('/dashboard/test-dev')
        router.refresh()
      }, 500)

    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to switch user' 
      })
    } finally {
      setLoading(null)
    }
  }

  const copyCredentials = (email: string, password: string) => {
    const text = `Email: ${email}\nPassword: ${password}`
    navigator.clipboard.writeText(text)
    setCopiedEmail(email)
    setTimeout(() => setCopiedEmail(null), 2000)
  }

  return (
    <Card className="border-yellow-200 dark:border-yellow-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          Test Member Switcher
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
            DEV ONLY
          </Badge>
        </CardTitle>
        <CardDescription>
          Greitai perjunkite tarp test members skirtingoms perspektyvoms testuoti
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Warning */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>⚠️ Development Only:</strong> Šis įrankis rodo passwords ir 
            niekada neturėtų būti production! Process.env check turi blokuoti rendering.
          </AlertDescription>
        </Alert>

        {/* Current User */}
        {currentUser && (
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              <strong>Current user:</strong> {currentUser}
            </AlertDescription>
          </Alert>
        )}

        {/* Message */}
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Test Users List */}
        <div className="space-y-2">
          {TEST_USERS.map((user) => {
            const Icon = user.icon
            const isCurrentUser = currentUser === user.email
            const isCopied = copiedEmail === user.email

            return (
              <div
                key={user.email}
                className={`
                  flex items-start gap-3 p-3 border rounded-lg
                  ${isCurrentUser ? 'border-primary bg-primary/5' : 'border-border'}
                `}
              >
                <Icon className={`h-5 w-5 mt-0.5 ${user.color}`} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{user.name}</p>
                    <Badge variant="outline" className="text-xs">
                      {user.role}
                    </Badge>
                    {isCurrentUser && (
                      <Badge className="text-xs bg-primary">
                        Current
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {user.purpose}
                  </p>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-muted-foreground">{user.email}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => copyCredentials(user.email, user.password)}
                    >
                      {isCopied ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={() => handleSwitch(user)}
                  disabled={loading === user.email || isCurrentUser}
                  size="sm"
                  variant={isCurrentUser ? 'outline' : 'default'}
                >
                  {loading === user.email ? (
                    'Switching...'
                  ) : isCurrentUser ? (
                    'Current'
                  ) : (
                    <>
                      <LogIn className="h-4 w-4 mr-1" />
                      Switch
                    </>
                  )}
                </Button>
              </div>
            )
          })}
        </div>

        {/* Quick Reference */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Quick Reference:</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>• All passwords: <code className="font-mono">Test123!</code></p>
            <p>• All roles: <code className="font-mono">MEMBER</code></p>
            <p>• Test org: <code className="font-mono">test-dev</code></p>
            <p>• URL: <code className="font-mono">/dashboard/test-dev</code></p>
          </div>
        </div>

        {/* Instructions */}
        <Alert>
          <AlertDescription className="text-xs">
            <strong>💡 Tip:</strong> Visi users yra MEMBER role. Jei reikia OWNER 
            actions (approve, settings), naudokite savo tikrą OWNER accountą.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}

/**
 * Wrapper that only renders in development
 */
export function DevOnlyTestUserSwitcher() {
  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return <TestUserSwitcher />
}

