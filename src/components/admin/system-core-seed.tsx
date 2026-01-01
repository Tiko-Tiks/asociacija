'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { seedSystemCore } from '@/app/actions/admin/seed-system-core'
import { useToast } from '@/components/ui/use-toast'
import { Database, Loader2 } from 'lucide-react'

/**
 * System Core Seed Component
 * 
 * Allows super admin to seed the Branduolys organization.
 */
export function SystemCoreSeed() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    orgId?: string
  } | null>(null)

  const handleSeed = async () => {
    setLoading(true)
    setResult(null)

    try {
      const seedResult = await seedSystemCore()
      setResult(seedResult)

      if (seedResult.success) {
        toast({
          title: 'Success',
          description: seedResult.message,
        })
      } else {
        toast({
          title: 'Error',
          description: seedResult.message || seedResult.error,
          variant: 'destructive',
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setResult({
        success: false,
        message: errorMessage,
      })
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          <Database className="h-5 w-5" />
          System Core Seeding
        </CardTitle>
        <CardDescription className="text-slate-400">
          Create the official Branduolys platform organization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-300">
          This will create the &quot;Lietuvos Branduolys&quot; organization if it doesn&apos;t exist.
          The super admin user (admin@pastas.email) will be assigned as OWNER.
        </p>

        <Button
          onClick={handleSeed}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Seeding...
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              Seed System Core
            </>
          )}
        </Button>

        {result && (
          <div
            className={`p-4 rounded-lg border ${
              result.success
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <p className="font-semibold">{result.success ? 'Success' : 'Error'}</p>
            <p className="text-sm mt-1">{result.message}</p>
            {result.orgId && (
              <p className="text-xs mt-2 font-mono">Org ID: {result.orgId}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

