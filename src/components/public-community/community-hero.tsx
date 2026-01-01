import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { MapPin, CheckCircle2 } from 'lucide-react'

interface CommunityHeroProps {
  name: string
  description: string | null
  logoUrl: string | null
  status: string | null
  location: string | null
}

/**
 * Hero / Header Block for Public Community Page
 * 
 * Displays:
 * - Community logo (or name as fallback)
 * - Community name
 * - Short tagline/description
 * - Status badge (if active/pilot)
 * - Location (if available)
 */
export function CommunityHero({
  name,
  description,
  logoUrl,
  status,
  location,
}: CommunityHeroProps) {
  return (
    <section className="bg-gradient-to-b from-blue-50 to-white py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Logo or Name */}
          {logoUrl ? (
            <div className="relative h-32 w-32 md:h-40 md:w-40 rounded-lg overflow-hidden border-4 border-white shadow-lg">
              <Image
                src={logoUrl}
                alt={`${name} logotipas`}
                fill
                className="object-cover"
                priority
              />
            </div>
          ) : (
            <div className="h-32 w-32 md:h-40 md:w-40 rounded-lg bg-blue-100 flex items-center justify-center border-4 border-white shadow-lg">
              <h1 className="text-4xl md:text-5xl font-bold text-blue-700">
                {name.charAt(0).toUpperCase()}
              </h1>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900">
              {name}
            </h1>

            {/* Tagline / Description */}
            {description && (
              <p className="text-lg md:text-xl text-slate-600 max-w-2xl">
                {description}
              </p>
            )}

            {/* Status and Location */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {status === 'ACTIVE' && (
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Aktyvi bendruomenė
                </Badge>
              )}
              {status === 'PILOT' && (
                <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Pilotinė
                </Badge>
              )}
              {location && (
                <Badge variant="outline" className="bg-white">
                  <MapPin className="mr-1 h-3 w-3" />
                  {location}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

