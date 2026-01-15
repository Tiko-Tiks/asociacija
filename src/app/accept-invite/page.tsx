import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/app/actions/auth'
import { acceptInvite } from '@/app/actions/accept-invite'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { PageLayout } from '@/components/layout/page-layout'

interface AcceptInvitePageProps {
  searchParams: Promise<{ token?: string }> | { token?: string }
}

export default async function AcceptInvitePage({ searchParams }: AcceptInvitePageProps) {
  const resolvedParams = 'then' in searchParams ? await searchParams : searchParams
  const token = resolvedParams?.token

  // If no token, show error
  if (!token) {
    return (
      <PageLayout showHeader={true} showFooter={false}>
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Kvietimas nerastas</CardTitle>
              <CardDescription>
                Kvietimo nuoroda neteisinga arba trūksta kvietimo tokeno.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  Prašome naudoti teisingą kvietimo nuorodą.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    )
  }

  // Check if user is authenticated
  const user = await getCurrentUser()

  if (!user) {
    // Redirect to login with return URL
    const returnUrl = encodeURIComponent(`/accept-invite?token=${token}`)
    redirect(`/login?redirect=${returnUrl}`)
  }

  // User is authenticated, try to accept invite
  const result = await acceptInvite(token)

  if (result.success && result.orgId) {
    // Redirect to organization dashboard
    const { getUserOrgs } = await import('@/app/actions/organizations')
    const orgs = await getUserOrgs()
    const org = orgs.find((o) => o.id === result.orgId)
    
    if (org?.slug) {
      redirect(`/dashboard/${org.slug}`)
    } else {
      redirect('/dashboard')
    }
  }

  // Show error or success message
  return (
    <PageLayout showHeader={true} showFooter={false}>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>
              {result.success ? 'Kvietimas priimtas' : 'Klaida'}
            </CardTitle>
            <CardDescription>
              {result.success
                ? 'Jūs sėkmingai prisijungėte prie bendruomenės.'
                : 'Nepavyko priimti kvietimo.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.success ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Kvietimas sėkmingai priimtas. Jūs būsite nukreipti į bendruomenės puslapį.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  {result.error || 'Įvyko klaida priimant kvietimą'}
                </AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <a href="/">Grįžti į pagrindinį puslapį</a>
              </Button>
              {result.success && (
                <Button asChild>
                  <a href="/dashboard">Eiti į dashboard</a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}

