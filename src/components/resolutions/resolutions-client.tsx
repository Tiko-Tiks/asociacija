"use client"

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { ResolutionCard } from './resolution-card'
import { CreateResolutionModal } from './create-resolution-modal'
import { Resolution } from '@/app/actions/resolutions'

interface ResolutionsClientProps {
  resolutions: Resolution[]
  orgId: string
  isOwner: boolean
  isBoard?: boolean
}

export function ResolutionsClient({
  resolutions,
  orgId,
  isOwner,
  isBoard = false,
}: ResolutionsClientProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Filter resolutions by status
  const drafts = resolutions.filter(
    (r) => r.status === 'DRAFT' || r.status === 'PROPOSED'
  )
  const approved = resolutions.filter((r) => r.status === 'APPROVED')
  const rejected = resolutions.filter((r) => r.status === 'REJECTED')

  return (
    <>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Sprendimai</h1>
            <p className="mt-1 text-sm text-slate-600">
              Valdymo sprendimų centras
            </p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            Sukurti sprendimą
          </Button>
        </div>

        <Tabs defaultValue="drafts" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="drafts">
              Juodraščiai ({drafts.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Patvirtinti ({approved.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Atmesti ({rejected.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drafts" className="mt-6">
            {drafts.length === 0 ? (
              <div className="rounded-md border bg-slate-50 p-8 text-center">
                <p className="text-muted-foreground">Juodraščių nėra</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {drafts.map((resolution) => (
                  <ResolutionCard
                    key={resolution.id}
                    resolution={resolution}
                    orgId={orgId}
                    isOwner={isOwner}
                    isBoard={isBoard}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="mt-6">
            {approved.length === 0 ? (
              <div className="rounded-md border bg-slate-50 p-8 text-center">
                <p className="text-muted-foreground">Patvirtintų sprendimų nėra</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {approved.map((resolution) => (
                  <ResolutionCard
                    key={resolution.id}
                    resolution={resolution}
                    orgId={orgId}
                    isOwner={isOwner}
                    isBoard={isBoard}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="mt-6">
            {rejected.length === 0 ? (
              <div className="rounded-md border bg-slate-50 p-8 text-center">
                <p className="text-muted-foreground">Atmestų sprendimų nėra</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rejected.map((resolution) => (
                  <ResolutionCard
                    key={resolution.id}
                    resolution={resolution}
                    orgId={orgId}
                    isOwner={isOwner}
                    isBoard={isBoard}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CreateResolutionModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        orgId={orgId}
      />
    </>
  )
}

