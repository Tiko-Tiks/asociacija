import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight, MapPin, CheckCircle2 } from 'lucide-react'
import { PublicOrganization } from '@/app/actions/public-registry'

interface RegistrySectionProps {
  organizations: PublicOrganization[]
}

/**
 * Accredited Nodes Registry Section
 * 
 * Public grid/list of active communities.
 * Shows:
 * - Name of Community
 * - Status Badge (Pilot/Active)
 * - Municipality (if available)
 * - Link to profile page
 */
export function RegistrySection({ organizations }: RegistrySectionProps) {
  if (organizations.length === 0) {
    return (
      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Akredituotos Bendruomenės
            </h2>
          </div>
          <div className="rounded-lg border bg-slate-50 p-8 text-center max-w-2xl mx-auto">
            <p className="text-slate-600">
              Akredituotų bendruomenių sąrašas bus atnaujintas netrukus.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-gradient-to-b from-white to-slate-50 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Akredituotos Bendruomenės
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Bendruomenės, naudojančios Bendruomenių Branduolys platformą
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {organizations.map((org) => (
            <Card key={org.id} className="hover:shadow-lg transition-shadow border-2">
              <CardHeader>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <CardTitle className="text-xl flex-1">{org.name}</CardTitle>
                  {org.status === 'PILOT' && (
                    <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200 shrink-0">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Pilotinė
                    </Badge>
                  )}
                  {org.status === 'ACTIVE' && (
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 shrink-0">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Aktyvus
                    </Badge>
                  )}
                </div>
                {/* Municipality field removed - not in schema v15.1 */}
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/c/${org.slug}`}>
                    Peržiūrėti profilį
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

