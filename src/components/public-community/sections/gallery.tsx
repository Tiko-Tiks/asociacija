'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { X } from 'lucide-react'

interface CommunityGalleryProps {
  gallery: Array<{
    id: string
    url: string
    category: string
    created_at: string
    project_title: string | null
  }>
}

/**
 * Gallery Section
 * 
 * Photos from events / activities:
 * - Albums by theme or date
 * - Grid layout
 * - Click to enlarge
 * 
 * Limitations (intentional):
 * - Images only
 * - No video in pilot
 * - No social embeds
 */
export function CommunityGallery({ gallery }: CommunityGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  if (gallery.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-slate-900">Galerija</h2>
        <div className="rounded-lg border bg-slate-50 p-8 text-center">
          <p className="text-slate-600">
            Galerijos nuotraukų dar nėra. Nuotraukos bus pridėtos netrukus.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-slate-900">Galerija</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {gallery.map((item) => (
          <Card
            key={item.id}
            className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedImage(item.url)}
          >
            <CardContent className="p-0">
              <div className="relative aspect-square">
                <Image
                  src={item.url}
                  alt={item.project_title || 'Galerijos nuotrauka'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Image Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Nuotrauka</DialogTitle>
            <DialogDescription>
              {gallery.find((item) => item.url === selectedImage)?.project_title || ''}
            </DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <div className="relative w-full aspect-video">
              <Image
                src={selectedImage}
                alt="Didelė nuotrauka"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

