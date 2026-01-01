import { Metadata } from 'next'
import Link from 'next/link'
import { getPublicCommunityPageData } from '@/app/actions/public-community-page'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CommunityHeroSection } from '@/components/public/community-hero-section'
import { CommunityAboutSection } from '@/components/public/community-about-section'
import { CommunityActivitySection } from '@/components/public/community-activity-section'
import { TransparencyFooter } from '@/components/public/transparency-footer'

/**
 * Public Community Page (/c/[slug]) - B2.1
 * 
 * Clean, modern, public-facing community page.
 * 
 * CONSTRAINTS:
 * - READ-ONLY
 * - No authentication required
 * - Use public-safe data only
 * - Respect RLS and visibility rules
 * 
 * PAGE STRUCTURE:
 * 1. Hero - Community name, slug, description, CTA buttons
 * 2. About - Description, active positions
 * 3. Public Activity - Events (is_public=true) and Resolutions (PUBLIC, APPROVED)
 * 4. Transparency Footer - Platform attribution, Chartija link, certification badge
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string }
}): Promise<Metadata> {
  const resolvedParams = 'then' in params ? await params : params
  const normalizedSlug = decodeURIComponent(resolvedParams.slug).trim()
  const data = await getPublicCommunityPageData(normalizedSlug)

  if (!data) {
    return {
      title: 'Bendruomenė nerasta',
      description: 'Bendruomenė su šiuo adresu nerasta arba nepasiekiama.',
    }
  }

  const title = data.org.name || 'Bendruomenė'
  const description = data.org.description || `${data.org.name || 'Bendruomenė'} - Bendruomenės svetainė. Informacija apie veiklą, renginius ir sprendimus.`
  // Use relative URL for OpenGraph - Next.js will handle absolute URL in production
  const url = `/c/${data.org.slug}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'Bendruomenių Branduolys',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default async function PublicCommunityPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string }
}) {
  const resolvedParams = 'then' in params ? await params : params
  const normalizedSlug = decodeURIComponent(resolvedParams.slug).trim()

  // Fetch all public data in parallel
  const data = await getPublicCommunityPageData(normalizedSlug)

  // Handle not found - log for debugging
  if (!data) {
    console.error('PublicCommunityPage: No data found for slug:', normalizedSlug)
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl">Bendruomenė nerasta</CardTitle>
              <CardDescription>
                Bendruomenė su šiuo adresu nerasta arba nepasiekiama.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-600">
                Patikrinkite adresą arba susisiekite su administracija.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center pt-4">
                <Button
                  asChild
                  className="w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Link href="/">Grįžti į pagrindinį</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Link href="/register-community">Registruoti bendruomenę</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <CommunityHeroSection
        name={data.org.name}
        slug={data.org.slug}
        description={data.org.description}
      />

      {/* About Section */}
      <CommunityAboutSection
        description={data.org.description}
        activePositions={data.activePositions}
      />

      {/* Public Activity Section */}
      <CommunityActivitySection
        events={data.publicEvents}
        resolutions={data.publicResolutions}
      />

      {/* Transparency Footer */}
      <TransparencyFooter />
    </div>
  )
}
