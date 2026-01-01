'use client'

import { useSearchParams } from 'next/navigation'
import { CommunityAbout } from './sections/about'
import { CommunityNews } from './sections/news'
import { CommunityGallery } from './sections/gallery'
import { CommunityDocuments } from './sections/documents'
import { CommunityContact } from './sections/contact'

interface CommunityContentProps {
  orgId: string
  orgName: string
  description: string | null
  contactEmail: string | null
  contactPerson: string | null
  news: Array<{
    id: string
    title: string
    content: string
    published_at: string
    created_at: string
  }>
  gallery: Array<{
    id: string
    url: string
    category: string
    created_at: string
    project_title: string | null
  }>
  documents: Array<{
    id: string
    title: string
    url: string
    document_type: string
    created_at: string
  }>
  projects: Array<{
    id: string
    title: string
    description: string | null
    status: string
    media_items: Array<{
      id: string
      url: string
      category: string
      created_at: string
    }>
  }>
}

/**
 * Main Content Area for Public Community Page
 * 
 * Renders different sections based on active tab
 */
export function CommunityContent({
  orgId,
  orgName,
  description,
  contactEmail,
  contactPerson,
  news,
  gallery,
  documents,
  projects,
}: CommunityContentProps) {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'about'

  return (
    <div id="community-content" className="container mx-auto px-4 py-8">
      {activeTab === 'about' && (
        <CommunityAbout
          name={orgName}
          description={description}
          projects={projects}
        />
      )}

      {activeTab === 'news' && (
        <CommunityNews news={news} />
      )}

      {activeTab === 'gallery' && (
        <CommunityGallery gallery={gallery} />
      )}

      {activeTab === 'documents' && (
        <CommunityDocuments documents={documents} />
      )}

      {activeTab === 'contact' && (
        <CommunityContact
          name={orgName}
          email={contactEmail}
          contactPerson={contactPerson}
        />
      )}
    </div>
  )
}

