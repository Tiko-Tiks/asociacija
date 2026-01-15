import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/app/actions/auth'
import { getUserOrgs } from '@/app/actions/organizations'
import { getMemberProfile } from '@/app/actions/member-profile'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Calendar, Shield, ArrowLeft, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MEMBERSHIP_ROLE } from '@/app/domain/constants'
import Link from 'next/link'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string }
}): Promise<Metadata> {
  const resolvedParams = 'then' in params ? await params : params
  const normalizedSlug = decodeURIComponent(resolvedParams.slug).trim()

  return {
    title: 'Mano profilis',
    description: 'Asmeninė informacija ir narystės statusas',
  }
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string }
}) {
  const resolvedParams = 'then' in params ? await params : params
  const normalizedSlug = decodeURIComponent(resolvedParams.slug).trim()

  // Get current user
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  // Get user's organizations
  const orgs = await getUserOrgs()
  const selectedOrg = orgs.find((org) => org.slug === normalizedSlug)

  if (!selectedOrg) {
    redirect('/dashboard')
  }

  // Get member profile data
  const profileData = await getMemberProfile(selectedOrg.membership_id)

  if (!profileData) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header with name and back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {profileData.full_name || 'Nenurodyta'}
            </h1>
            <p className="text-gray-600">
              {user.email}
            </p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/${normalizedSlug}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Grįžti
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Kontaktinė informacija
            </CardTitle>
            <CardDescription>
              El. pašto adresas susietas su paskyra
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <label className="text-sm font-medium text-gray-500">El. paštas</label>
              <p className="text-lg text-gray-900 mt-1 flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                {user.email || 'Nenurodyta'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Membership Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Narystės informacija
            </CardTitle>
            <CardDescription>
              Jūsų narystės statusas ir teisės
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Rolė</label>
              <div className="mt-1">
                <Badge 
                  variant={profileData.role === MEMBERSHIP_ROLE.OWNER ? 'default' : 'secondary'}
                  className="text-sm"
                >
                  {profileData.role === MEMBERSHIP_ROLE.OWNER ? 'Pirmininkas' : 'Narys'}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Statusas</label>
              <div className="mt-1">
                <Badge 
                  variant={profileData.member_status === 'ACTIVE' ? 'default' : 'secondary'}
                  className="text-sm"
                >
                  {profileData.member_status === 'ACTIVE' ? 'Aktyvus' : profileData.member_status}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Prisijungimo data</label>
              <p className="text-lg text-gray-900 mt-1 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                {profileData.joined_at 
                  ? new Date(profileData.joined_at).toLocaleDateString('lt-LT')
                  : 'Nenurodyta'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Positions */}
      {profileData.positions && profileData.positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pareigos</CardTitle>
            <CardDescription>
              Jūsų pareigos šioje bendruomenėje
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profileData.positions.map((position, index) => (
                <Badge key={index} variant="outline" className="text-sm">
                  {position}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

