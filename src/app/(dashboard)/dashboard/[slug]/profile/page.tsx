import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/app/actions/auth'
import { getUserOrgs } from '@/app/actions/organizations'
import { getMemberProfile } from '@/app/actions/member-profile'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Edit, User, Mail, Calendar, Shield } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { MEMBERSHIP_ROLE } from '@/app/domain/constants'
import { ProfileEditForm } from '@/components/profile/profile-edit-form'

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mano profilis</h1>
          <p className="text-slate-600 mt-1">
            Asmeninė informacija ir narystės statusas
          </p>
        </div>
      </div>

      {/* Profile Edit Form */}
      <ProfileEditForm
        initialData={{
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          full_name: profileData.full_name,
        }}
        orgSlug={normalizedSlug}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Asmeninė informacija
            </CardTitle>
            <CardDescription>
              Jūsų profilio duomenys
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-500">Vardas, pavardė</label>
              <p className="text-lg text-slate-900 mt-1">
                {profileData.full_name || 'Nenurodyta'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-500">El. paštas</label>
              <p className="text-lg text-slate-900 mt-1 flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
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
              <label className="text-sm font-medium text-slate-500">Rolė</label>
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
              <label className="text-sm font-medium text-slate-500">Statusas</label>
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
              <label className="text-sm font-medium text-slate-500">Prisijungimo data</label>
              <p className="text-lg text-slate-900 mt-1 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
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

