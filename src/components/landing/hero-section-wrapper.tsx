import { getLandingPageContent } from '@/app/actions/admin/branduolys-content'
import { HeroSection } from './hero-section'

/**
 * Server Component Wrapper for HeroSection
 * Fetches content from database and passes to client component
 */
export async function HeroSectionWrapper() {
  const content = await getLandingPageContent()

  return <HeroSection title={content.heroTitle} subtitle={content.heroSubtitle} />
}

