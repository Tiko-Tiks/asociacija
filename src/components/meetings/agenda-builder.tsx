'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AlertCircle, Upload, X, MoreVertical, Eye } from 'lucide-react'
import { Plus, Edit, Trash2, FileText } from 'lucide-react'
import {
  addAgendaItem,
  updateAgendaItem,
  deleteAgendaItem,
  getAgendaItems,
  type AgendaItem,
} from '@/app/actions/meetings'
import { createResolution, getDraftResolutionsWithoutMeeting, type Resolution } from '@/app/actions/resolutions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { AgendaInitialSetup } from './agenda-initial-setup'
import { createClient } from '@/lib/supabase/client'
import { Checkbox } from '@/components/ui/checkbox'

interface AgendaBuilderProps {
  meetingId: string
  orgId: string
  isDraft: boolean
  membershipId?: string
}

export function AgendaBuilder({ meetingId, orgId, isDraft, membershipId }: AgendaBuilderProps) {
  const { toast } = useToast()
  const [items, setItems] = useState<AgendaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null)

  // Form state
  const [itemNo, setItemNo] = useState(1)
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  // GA HARD MODE: Visi klausimai automatiškai reikalauja balsavimų
  const [requiresVoting, setRequiresVoting] = useState(true)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  
  // Draft resolution selection
  const [draftResolutions, setDraftResolutions] = useState<Resolution[]>([])
  const [selectedResolutionId, setSelectedResolutionId] = useState<string>('new')
  const [loadingDrafts, setLoadingDrafts] = useState(false)

  useEffect(() => {
    loadAgenda()
  }, [meetingId])

  const loadAgenda = async () => {
    try {
      const data = await getAgendaItems(meetingId)
      setItems(data)
    } catch (error) {
      console.error('Error loading agenda:', error)
      toast({
        title: 'Klaida',
        description: 'Nepavyko įkelti darbotvarkės',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Load draft resolutions without meeting
  const loadDraftResolutions = async () => {
    setLoadingDrafts(true)
    try {
      const drafts = await getDraftResolutionsWithoutMeeting(orgId)
      setDraftResolutions(drafts)
    } catch (error) {
      console.error('Error loading draft resolutions:', error)
    } finally {
      setLoadingDrafts(false)
    }
  }

  const handleAdd = async () => {
    setEditingItem(null)
    // Automatiškai priskirti numerį pagal esamų klausimų kiekį
    // Jei yra klausimų, imame didžiausią numerį + 1, jei nėra - pradedame nuo 1
    const nextItemNo = items.length > 0 
      ? Math.max(...items.map(i => i.item_no)) + 1 
      : (items.length === 0 ? 1 : items.length + 1)
    setItemNo(nextItemNo)
    setTitle('')
    setDetails('')
    setRequiresVoting(true) // GA HARD MODE: Visi klausimai reikalauja balsavimo
    setSelectedFiles([])
    setSelectedResolutionId('new')
    
    // Load draft resolutions
    await loadDraftResolutions()
    
    setEditDialogOpen(true)
  }

  const handleEdit = (item: AgendaItem) => {
    // Pirmų trijų klausimų negalima redaguoti
    if (item.item_no <= 3) {
      toast({
        title: 'Klaida',
        description: 'Pirmų trijų klausimų negalima redaguoti',
        variant: 'destructive',
      })
      return
    }

    setEditingItem(item)
    setItemNo(item.item_no)
    setTitle(item.title)
    setDetails(item.details || '')
    setSelectedFiles([])
    setEditDialogOpen(true)
  }

  const handleDelete = async (itemId: string, itemNo: number) => {
    // Pirmų trijų klausimų negalima trinti
    if (itemNo <= 3) {
      toast({
        title: 'Klaida',
        description: 'Pirmų trijų klausimų negalima trinti',
        variant: 'destructive',
      })
      return
    }

    if (!confirm('Ar tikrai norite ištrinti šį klausimą?')) return

    const result = await deleteAgendaItem(itemId)
    if (result.success) {
      toast({
        title: 'Klausimas ištrintas',
        description: 'Darbotvarkės klausimas sėkmingai ištrintas',
      })
      loadAgenda()
    } else {
      toast({
        title: 'Klaida',
        description: result.error || 'Nepavyko ištrinti klausimo',
        variant: 'destructive',
      })
    }
  }

  const uploadFiles = async (agendaItemId: string) => {
    if (selectedFiles.length === 0) return

    setUploadingFiles(true)
    try {
      const supabase = createClient()
      
      for (const file of selectedFiles) {
        // Generate unique file path
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `meetings/${meetingId}/agenda/${agendaItemId}/${fileName}`

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('meeting-documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          console.error('Error uploading file:', uploadError)
          toast({
            title: 'Klaida',
            description: `Nepavyko įkelti failo ${file.name}`,
            variant: 'destructive',
          })
          continue
        }

        // Attach file metadata
        const { attachAgendaFileMetadata } = await import('@/app/actions/meetings')
        await attachAgendaFileMetadata(
          agendaItemId,
          filePath,
          file.name,
          file.type,
          file.size
        )
      }

      setSelectedFiles([])
    } catch (error) {
      console.error('Error uploading files:', error)
      toast({
        title: 'Klaida',
        description: 'Nepavyko įkelti dokumentų',
        variant: 'destructive',
      })
    } finally {
      setUploadingFiles(false)
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: 'Klaida',
        description: 'Pavadinimas yra privalomas',
        variant: 'destructive',
      })
      return
    }

    if (editingItem) {
      // Update - numeris negali būti keičiamas, naudojame originalų
      const result = await updateAgendaItem(editingItem.id, {
        itemNo: editingItem.item_no, // Naudoti originalų numerį
        title,
        details: details || undefined,
      })

      if (result.success) {
        // Upload files if any selected
        if (selectedFiles.length > 0) {
          await uploadFiles(editingItem.id)
        }
        
        toast({
          title: 'Klausimas atnaujintas',
          description: 'Darbotvarkės klausimas sėkmingai atnaujintas',
        })
        setEditDialogOpen(false)
        loadAgenda()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko atnaujinti klausimo',
          variant: 'destructive',
        })
      }
    } else {
      // Add new agenda item
      let resolutionId: string | undefined = undefined
      let finalTitle = title
      let finalDetails = details
      
      // Check if using existing draft resolution
      if (selectedResolutionId !== 'new' && selectedResolutionId) {
        // Use existing draft resolution
        resolutionId = selectedResolutionId
        
        // Get resolution details for title/details if not provided
        const selectedDraft = draftResolutions.find(r => r.id === selectedResolutionId)
        if (selectedDraft) {
          if (!title.trim()) {
            finalTitle = selectedDraft.title
          }
          if (!details?.trim()) {
            finalDetails = selectedDraft.content
          }
        }
      } else if (requiresVoting) {
        // Create new resolution
        const resolutionResult = await createResolution(
          orgId,
          finalTitle,
          finalDetails || `Balsavimas dėl: ${finalTitle}`,
          'MEMBERS', // visibility
          'PROPOSED' // status - ready for voting
        )
        
        if (!resolutionResult.success) {
          toast({
            title: 'Klaida',
            description: resolutionResult.error || 'Nepavyko sukurti nutarimo',
            variant: 'destructive',
          })
          return
        }
        
        resolutionId = resolutionResult.resolutionId
      }
      
      const result = await addAgendaItem(
        meetingId,
        itemNo,
        finalTitle,
        undefined, // summary removed
        finalDetails || undefined,
        resolutionId
      )

      if (result.success) {
        // Upload files if any selected
        // Note: We need to reload agenda to get the new item ID, then upload files
        if (selectedFiles.length > 0) {
          // Reload agenda to get the new item
          await loadAgenda()
          const updatedItems = await getAgendaItems(meetingId)
          const newItem = updatedItems.find(i => i.item_no === itemNo && i.title === title)
          if (newItem) {
            await uploadFiles(newItem.id)
          }
        }
        
        toast({
          title: 'Klausimas pridėtas',
          description: requiresVoting 
            ? 'Darbotvarkės klausimas ir balsavimas sukurti' 
            : 'Darbotvarkės klausimas sėkmingai pridėtas',
        })
        setEditDialogOpen(false)
        loadAgenda()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko pridėti klausimo',
          variant: 'destructive',
        })
      }
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Kraunama...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Darbotvarkė</h3>
        {isDraft && items.length >= 3 && (
          <Button onClick={handleAdd} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Pridėti klausimą
          </Button>
        )}
      </div>

      {/* Initial Setup - show only if no items and membershipId provided */}
      {items.length === 0 && isDraft && membershipId && (
        <AgendaInitialSetup
          meetingId={meetingId}
          orgId={orgId}
          membershipId={membershipId}
          onComplete={loadAgenda}
        />
      )}

      {items.length === 0 && (!isDraft || !membershipId) ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <p>Darbotvarkės klausimų nėra</p>
            {isDraft && (
              <Button onClick={handleAdd} variant="outline" className="mt-4">
                Pridėti pirmą klausimą
              </Button>
            )}
          </CardContent>
        </Card>
      ) : items.length > 0 && (
        <div className="border rounded-lg divide-y bg-white">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <Badge variant="outline" className="shrink-0">
                  {item.item_no}
                </Badge>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-900 truncate">
                    {item.title}
                  </h4>
                  {item.details && (
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                      {item.details}
                    </p>
                  )}
                </div>
                {item.item_no <= 3 && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    Privalomas
                  </Badge>
                )}
              </div>
              
              {isDraft && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Atidaryti meniu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {item.item_no > 3 ? (
                      <>
                        <DropdownMenuItem onClick={() => handleEdit(item)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Redaguoti
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(item.id, item.item_no)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Ištrinti
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <DropdownMenuItem disabled>
                        <span className="text-slate-500">
                          Privalomas klausimas - negalima redaguoti
                        </span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Redaguoti klausimą' : 'Pridėti klausimą'}
            </DialogTitle>
            <DialogDescription>
              Pridėkite arba redaguokite darbotvarkės klausimą
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {editingItem && (
              <div className="space-y-2">
                <Label>Numeris</Label>
                <div className="text-sm text-muted-foreground p-2 bg-slate-50 rounded border">
                  {itemNo} (numeris negali būti keičiamas)
                </div>
                {editingItem.item_no <= 3 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Pirmų trijų klausimų negalima redaguoti. Tai privalomi klausimai.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Draft resolution selector - only for new items */}
            {!editingItem && draftResolutions.length > 0 && (
              <div className="space-y-2">
                <Label>Pasirinkti esamą DRAFT rezoliuciją</Label>
                <Select value={selectedResolutionId} onValueChange={(value) => {
                  setSelectedResolutionId(value)
                  // Auto-fill title and details from selected resolution
                  if (value !== 'new') {
                    const selected = draftResolutions.find(r => r.id === value)
                    if (selected) {
                      setTitle(selected.title)
                      setDetails(selected.content)
                    }
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pasirinkite rezoliuciją..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">
                      ➕ Sukurti naują rezoliuciją
                    </SelectItem>
                    {draftResolutions.map((resolution) => (
                      <SelectItem key={resolution.id} value={resolution.id}>
                        📄 {resolution.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedResolutionId !== 'new' && (
                  <p className="text-xs text-blue-600">
                    Bus naudojama esama DRAFT rezoliucija (pvz., sukurta iš idėjos)
                  </p>
                )}
              </div>
            )}

            {!editingItem && draftResolutions.length === 0 && !loadingDrafts && (
              <Alert className="border-gray-200 bg-gray-50">
                <FileText className="h-4 w-4" />
                <AlertDescription className="text-sm text-gray-600">
                  Nėra DRAFT rezoliucijų be susirinkimo. Bus sukurta nauja rezoliucija.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Pavadinimas *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Pvz: Finansinės ataskaitos patvirtinimas"
                required
                disabled={selectedResolutionId !== 'new' && !editingItem}
              />
              {selectedResolutionId !== 'new' && !editingItem && (
                <p className="text-xs text-gray-500">
                  Pavadinimas paimtas iš pasirinktos rezoliucijos
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="details">Išsamus aprašymas</Label>
              <Textarea
                id="details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Išsamus klausimo aprašymas"
                rows={4}
              />
            </div>

            {/* GA HARD MODE: Visi klausimai automatiškai gauna balsavimus publikavimo metu */}
            {/* Checkbox pašalintas - nereikalinga komplikacija */}

            <div className="space-y-2">
              <Label htmlFor="files">Dokumentai (neprivaloma)</Label>
              <div className="space-y-2">
                <input
                  type="file"
                  id="files"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    setSelectedFiles([...selectedFiles, ...files])
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('files')?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Pridėti dokumentus
                </Button>
                {selectedFiles.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <span className="text-sm">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedFiles(selectedFiles.filter((_, i) => i !== index))
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Atšaukti
            </Button>
            <Button onClick={handleSave}>Išsaugoti</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

