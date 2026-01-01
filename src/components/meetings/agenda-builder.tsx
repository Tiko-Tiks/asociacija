'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, FileText } from 'lucide-react'
import {
  addAgendaItem,
  updateAgendaItem,
  deleteAgendaItem,
  getAgendaItems,
  type AgendaItem,
} from '@/app/actions/meetings'
import { listResolutions, type Resolution } from '@/app/actions/resolutions'
import { useToast } from '@/components/ui/use-toast'

interface AgendaBuilderProps {
  meetingId: string
  orgId: string
  isDraft: boolean
}

export function AgendaBuilder({ meetingId, orgId, isDraft }: AgendaBuilderProps) {
  const { toast } = useToast()
  const [items, setItems] = useState<AgendaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null)
  const [resolutions, setResolutions] = useState<Resolution[]>([])

  // Form state
  const [itemNo, setItemNo] = useState(1)
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [details, setDetails] = useState('')
  const [resolutionId, setResolutionId] = useState<string>('')

  useEffect(() => {
    loadAgenda()
    loadResolutions()
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

  const loadResolutions = async () => {
    try {
      const data = await listResolutions(orgId)
      // Filter for DRAFT/PROPOSED resolutions that can be linked
      const draftResolutions = data.filter(
        (r) => r.status === 'DRAFT' || r.status === 'PROPOSED'
      )
      setResolutions(draftResolutions)
    } catch (error) {
      console.error('Error loading resolutions:', error)
    }
  }

  const handleAdd = () => {
    setEditingItem(null)
    setItemNo(items.length + 1)
    setTitle('')
    setSummary('')
    setDetails('')
    setResolutionId('none')
    setEditDialogOpen(true)
  }

  const handleEdit = (item: AgendaItem) => {
    setEditingItem(item)
    setItemNo(item.item_no)
    setTitle(item.title)
    setSummary(item.summary || '')
    setDetails(item.details || '')
    setResolutionId(item.resolution_id || 'none')
    setEditDialogOpen(true)
  }

  const handleDelete = async (itemId: string) => {
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

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: 'Klaida',
        description: 'Pavadinimas yra privalomas',
        variant: 'destructive',
      })
      return
    }

    // Convert "none" to empty string for resolutionId
    const finalResolutionId = resolutionId === 'none' || resolutionId === '' ? null : resolutionId

    if (editingItem) {
      // Update
      const result = await updateAgendaItem(editingItem.id, {
        itemNo,
        title,
        summary: summary || undefined,
        details: details || undefined,
        resolutionId: finalResolutionId,
      })

      if (result.success) {
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
      // Add
      const result = await addAgendaItem(
        meetingId,
        itemNo,
        title,
        summary || undefined,
        details || undefined,
        finalResolutionId || undefined
      )

      if (result.success) {
        toast({
          title: 'Klausimas pridėtas',
          description: 'Darbotvarkės klausimas sėkmingai pridėtas',
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
        {isDraft && (
          <Button onClick={handleAdd} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Pridėti klausimą
          </Button>
        )}
      </div>

      {items.length === 0 ? (
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
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{item.item_no}</Badge>
                      <CardTitle className="text-base">{item.title}</CardTitle>
                    </div>
                    {item.summary && (
                      <p className="text-sm text-gray-600 mt-2">{item.summary}</p>
                    )}
                    {item.resolution_id && (
                      <Badge variant="secondary" className="mt-2">
                        <FileText className="h-3 w-3 mr-1" />
                        Susietas nutarimas
                      </Badge>
                    )}
                  </div>
                  {isDraft && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              {item.details && (
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.details}</p>
                </CardContent>
              )}
            </Card>
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
            <div className="space-y-2">
              <Label htmlFor="item_no">Numeris *</Label>
              <Input
                id="item_no"
                type="number"
                min="1"
                value={itemNo}
                onChange={(e) => setItemNo(parseInt(e.target.value) || 1)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Pavadinimas *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Pvz: Finansinės ataskaitos patvirtinimas"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Trumpas aprašymas</Label>
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Trumpas klausimo aprašymas"
                rows={2}
              />
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

            <div className="space-y-2">
              <Label htmlFor="resolution">Susieti su nutarimu (neprivaloma)</Label>
              <Select 
                value={resolutionId || 'none'} 
                onValueChange={(value) => setResolutionId(value === 'none' ? 'none' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pasirinkite nutarimą" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nėra</SelectItem>
                  {resolutions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.title} ({r.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

