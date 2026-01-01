'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

interface CommunityNavigationProps {
  defaultTab?: string
}

/**
 * Internal Navigation for Public Community Page
 * 
 * Tabs navigation for sections:
 * - Apie mus
 * - Naujienos
 * - Galerija
 * - Dokumentai
 * - Kontaktai
 */
export function CommunityNavigation({ defaultTab = 'about' }: CommunityNavigationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab') || defaultTab

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'about') {
      params.delete('tab')
    } else {
      params.set('tab', value)
    }
    router.push(`?${params.toString()}`, { scroll: false })
    
    // Scroll to top of content
    const contentElement = document.getElementById('community-content')
    if (contentElement) {
      contentElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="sticky top-0 z-30 bg-white border-b shadow-sm">
      <div className="container mx-auto px-4">
        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full justify-start h-auto p-1 bg-transparent">
            <TabsTrigger 
              value="about" 
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              Apie mus
            </TabsTrigger>
            <TabsTrigger 
              value="news"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              Naujienos
            </TabsTrigger>
            <TabsTrigger 
              value="gallery"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              Galerija
            </TabsTrigger>
            <TabsTrigger 
              value="documents"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              Dokumentai
            </TabsTrigger>
            <TabsTrigger 
              value="contact"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              Kontaktai
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}

