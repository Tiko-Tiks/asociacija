import Image from 'next/image'

interface HeroSectionProps {
  title?: string
  subtitle?: string
}

/**
 * Hero Section - Institutional Design
 * 
 * Optimized: Removed CTA buttons from hero section.
 * Navigation is now handled in the header (top right corner).
 * 
 * Hero focuses on branding and value proposition only.
 * Content can be managed via admin panel.
 */
export function HeroSection({ title, subtitle }: HeroSectionProps) {
  // Use provided content or fallback to defaults
  const displayTitle = title || 'Bendruomenių Branduolys'
  const displaySubtitle = subtitle || 'Lietuvos bendruomenių valdymo platforma'

  return (
    <section className="bg-gradient-to-b from-slate-50 to-white py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
          {/* Logo */}
          <div className="flex flex-col items-center space-y-4">
            <Image
              src="/logo.svg"
              alt="Lietuvos Bendruomenių Branduolys"
              width={120}
              height={120}
              className="h-24 w-24 md:h-32 md:w-32"
              priority
            />
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900">
                {displayTitle.toUpperCase()}
              </h1>
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-slate-700 leading-relaxed max-w-3xl">
            {displaySubtitle}
          </p>
        </div>
      </div>
    </section>
  )
}

