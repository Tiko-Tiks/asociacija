import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogIn, Plus } from 'lucide-react'

interface CommunityHeroSectionProps {
  name: string
  slug: string
  description: string | null
}

export function CommunityHeroSection({
  name,
  slug,
  description,
}: CommunityHeroSectionProps) {
  return (
    <section className="bg-gradient-to-b from-slate-50 via-white to-slate-50 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          {/* Community Name */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900">
            {name}
          </h1>

          {/* Slug / Subdomain */}
          <p className="text-lg text-slate-600 font-mono">
            /c/{slug}
          </p>

          {/* Description */}
          {description ? (
            <p className="text-xl md:text-2xl text-slate-700 max-w-3xl mx-auto leading-relaxed">
              {description}
            </p>
          ) : (
            <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Sveiki atvykę į mūsų bendruomenės svetainę. Čia rasite informaciją apie mūsų veiklą, renginius ir sprendimus.
            </p>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button
              asChild
              size="lg"
              className="text-lg px-8 py-6 h-auto font-semibold"
            >
              <Link href={`/login?redirect=/dashboard/${slug}`}>
                <LogIn className="mr-2 h-5 w-5" />
                Prisijungti prie bendruomenės
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6 h-auto font-semibold"
            >
              <Link href="/register-community">
                <Plus className="mr-2 h-5 w-5" />
                Registruoti bendruomenę
              </Link>
            </Button>
          </div>

          {/* Helper Text */}
          <p className="text-sm text-slate-500 pt-2">
            Arba{' '}
            <Link
              href="/register-community"
              className="text-blue-600 hover:text-blue-700 underline font-medium"
            >
              registruokite savo bendruomenę
            </Link>
            {' '}ir pradėkite naudoti platformą nemokamai
          </p>
        </div>
      </div>
    </section>
  )
}

