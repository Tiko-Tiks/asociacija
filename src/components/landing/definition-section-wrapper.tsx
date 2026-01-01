import { getLandingPageContent } from '@/app/actions/admin/branduolys-content'
import { DefinitionSection } from './definition-section'

/**
 * Server Component Wrapper for DefinitionSection
 * Fetches content from database and passes to client component
 */
export async function DefinitionSectionWrapper() {
  const content = await getLandingPageContent()

  return (
    <DefinitionSection
      title={content.definitionTitle}
      content={content.definitionContent}
    />
  )
}

