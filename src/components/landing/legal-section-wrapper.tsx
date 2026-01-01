import { getLandingPageContent } from '@/app/actions/admin/branduolys-content'
import { LegalSection } from './legal-section'

/**
 * Server Component Wrapper for LegalSection
 * Fetches content from database and passes to client component
 */
export async function LegalSectionWrapper() {
  const content = await getLandingPageContent()

  return (
    <LegalSection
      title={content.legalBaseTitle}
      content={content.legalBaseContent}
    />
  )
}

