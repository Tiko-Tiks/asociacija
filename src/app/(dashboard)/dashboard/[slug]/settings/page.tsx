import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getUserOrgs, getMembershipRole } from '@/app/actions/organizations'
import { MEMBERSHIP_ROLE } from '@/app/domain/constants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileSearch, Gavel, Settings as SettingsIcon, Image as ImageIcon } from 'lucide-react'
import { OrgLogoUpload } from '@/components/organization/org-logo-upload'
import { createClient } from '@/lib/supabase/server'

/**
 * Settings Page - Main Settings Hub
 * 
 * URL: /dashboard/[slug]/settings
 * 
 * This page serves as a hub for all settings pages.
 * Shows a menu with links to different settings sections.
 */
async function SettingsPageContent({ slug }: { slug: string }) {
  // Fetch all orgs user belongs to
  let orgs: Array<{ id: string; name: string; slug: string; membership_id: string }> = []
  try {
    orgs = await getUserOrgs()
  } catch (error) {
    console.error('Error fetching user orgs:', error)
    notFound()
  }
  
  // Find org by slug
  const selectedOrg = orgs.find((org) => org.slug === slug)
  
  if (!selectedOrg) {
    notFound()
  }

  // Check user role - only OWNER can access settings
  let userRole: string
  try {
    userRole = await getMembershipRole(selectedOrg.membership_id)
  } catch (error) {
    console.error('Error fetching user role:', error)
    notFound()
  }

  if (userRole !== MEMBERSHIP_ROLE.OWNER) {
    notFound()
  }

  // Get organization logo (handle gracefully if logo_url column doesn't exist)
  const supabase = await createClient()
  let org: { logo_url?: string | null; name?: string | null } | null = null
  
  try {
    const { data: orgData, error: orgError } = await supabase
      .from('orgs')
      .select('logo_url, name')
      .eq('id', selectedOrg.id)
      .single()
    
    // If error is due to missing column, retry without logo_url
    if (orgError && (orgError?.code === '42703' || orgError?.message?.includes('logo_url'))) {
      const { data: orgRetry } = await supabase
        .from('orgs')
        .select('name')
        .eq('id', selectedOrg.id)
        .single()
      
      if (orgRetry) {
        org = { ...orgRetry, logo_url: null }
      }
    } else if (orgData) {
      org = orgData
    }
  } catch (error) {
    console.error('Error fetching org logo:', error)
    // Continue without logo - not critical
    org = { logo_url: null, name: selectedOrg.name }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Nustatymai</h1>
        <p className="text-slate-600">
          Valdykite organizacijos nustatymus ir konfigūraciją
        </p>
      </div>

      {/* Organization Logo Upload */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Organizacijos logotipas
          </CardTitle>
          <CardDescription>
            Pridėkite arba pakeiskite organizacijos logotipą
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrgLogoUpload
            orgId={selectedOrg.id}
            currentLogoUrl={org?.logo_url || null}
            orgName={org?.name || selectedOrg.name}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Audit Log Settings */}
        <Link href={`/dashboard/${slug}/settings/audit`}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileSearch className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-slate-900">Audito žurnalas</CardTitle>
                  <CardDescription>
                    Peržiūrėti visus organizacijos veiksmus ir pakeitimus
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Raskite visus organizacijos veiksmus, pakeitimus ir audito įrašus vienoje vietoje.
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Governance Settings */}
        <Link href={`/dashboard/${slug}/settings/governance`}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Gavel className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-slate-900">Valdymo konfigūracija</CardTitle>
                  <CardDescription>
                    Valdykite organizacijos valdymo taisykles ir konfigūraciją
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Redaguokite valdymo klausimyną, taisykles ir organizacijos konfigūraciją.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}

export default async function SettingsPage({
  params,
}: {
  params: { slug: string }
}) {
  // Normalize slug (decode URL encoding, trim whitespace)
  const normalizedSlug = decodeURIComponent(params.slug).trim()

  return <SettingsPageContent slug={normalizedSlug} />
}

