"use client"

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, MoreVertical, Eye, Edit, Trash2, Gavel } from 'lucide-react'
import { CreateResolutionModal } from './create-resolution-modal'
import { Resolution } from '@/app/actions/resolutions'
import { useRouter } from 'next/navigation'
import { formatDateLT } from '@/lib/utils'

interface ResolutionsClientProps {
  resolutions: Resolution[]
  orgId: string
  orgSlug: string
  isOwner: boolean
  isBoard?: boolean
}

export function ResolutionsClient({
  resolutions,
  orgId,
  orgSlug,
  isOwner,
  isBoard = false,
}: ResolutionsClientProps) {
  const router = useRouter()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const canCreate = isOwner || isBoard

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
          {canCreate && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Plus className="mr-2 h-4 w-4" />
              Sukurti sprendimą
            </Button>
          )}
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
              <div className="border rounded-lg p-8 text-center text-muted-foreground">
                Juodraščių nėra
              </div>
            ) : (
              <div className="border rounded-lg divide-y bg-white">
                {drafts.map((resolution) => (
                  <div
                    key={resolution.id}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/dashboard/${orgSlug}/resolutions/${resolution.id}`)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium text-slate-900 truncate">
                            {resolution.title}
                          </h4>
                          <Badge variant={resolution.status === 'DRAFT' ? 'outline' : 'default'}>
                            {resolution.status === 'DRAFT' ? 'Juodraštis' : 'Pateiktas'}
                          </Badge>
                        </div>
                        {resolution.content && (
                          <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                            {resolution.content}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                          <span>
                            Sukurta: {formatDateLT(resolution.created_at, 'medium')}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Atidaryti meniu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/${orgSlug}/resolutions/${resolution.id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Peržiūrėti
                        </DropdownMenuItem>
                        {(isOwner || isBoard) && resolution.status === 'DRAFT' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/${orgSlug}/resolutions/${resolution.id}`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Redaguoti
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="mt-6">
            {approved.length === 0 ? (
              <div className="border rounded-lg p-8 text-center text-muted-foreground">
                Patvirtintų sprendimų nėra
              </div>
            ) : (
              <div className="border rounded-lg divide-y bg-white">
                {approved.map((resolution) => (
                  <div
                    key={resolution.id}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/dashboard/${orgSlug}/resolutions/${resolution.id}`)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium text-slate-900 truncate">
                            {resolution.title}
                          </h4>
                          <Badge variant="default" className="bg-green-50 text-green-700 border-green-200">
                            <Gavel className="h-3 w-3 mr-1" />
                            Patvirtintas
                          </Badge>
                        </div>
                        {resolution.content && (
                          <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                            {resolution.content}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                          {resolution.adopted_at && (
                            <span>
                              Patvirtinta: {formatDateLT(resolution.adopted_at, 'medium')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Atidaryti meniu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/${orgSlug}/resolutions/${resolution.id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Peržiūrėti
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="mt-6">
            {rejected.length === 0 ? (
              <div className="border rounded-lg p-8 text-center text-muted-foreground">
                Atmestų sprendimų nėra
              </div>
            ) : (
              <div className="border rounded-lg divide-y bg-white">
                {rejected.map((resolution) => (
                  <div
                    key={resolution.id}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/dashboard/${orgSlug}/resolutions/${resolution.id}`)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium text-slate-900 truncate">
                            {resolution.title}
                          </h4>
                          <Badge variant="destructive">
                            Atmestas
                          </Badge>
                        </div>
                        {resolution.content && (
                          <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                            {resolution.content}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                          <span>
                            Sukurta: {formatDateLT(resolution.created_at, 'medium')}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Atidaryti meniu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/${orgSlug}/resolutions/${resolution.id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Peržiūrėti
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {canCreate && (
        <CreateResolutionModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          orgId={orgId}
        />
      )}
    </>
  )
}
