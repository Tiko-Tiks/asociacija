'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Package, Loader2, Plus, X } from 'lucide-react'

interface PledgeInKindFormProps {
  onSubmit: (items: any[], note: string | null) => Promise<void>
}

interface InKindItem {
  name: string
  qty: string
  unit: string
  notes: string
}

export function PledgeInKindForm({ onSubmit }: PledgeInKindFormProps) {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<InKindItem[]>([{ name: '', qty: '', unit: '', notes: '' }])
  const [note, setNote] = useState('')

  const addItem = () => {
    setItems([...items, { name: '', qty: '', unit: '', notes: '' }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof InKindItem, value: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validItems = items.filter((item) => item.name.trim() && item.qty.trim())
    if (validItems.length === 0) {
      return
    }

    setLoading(true)
    try {
      await onSubmit(validItems, note || null)
      setItems([{ name: '', qty: '', unit: '', notes: '' }])
      setNote('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Siūlyti daiktinę paramą
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Label>Daiktas #{index + 1}</Label>
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor={`name-${index}`}>Pavadinimas *</Label>
                  <Input
                    id={`name-${index}`}
                    value={item.name}
                    onChange={(e) => updateItem(index, 'name', e.target.value)}
                    placeholder="Mediena"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`qty-${index}`}>Kiekis *</Label>
                  <Input
                    id={`qty-${index}`}
                    value={item.qty}
                    onChange={(e) => updateItem(index, 'qty', e.target.value)}
                    placeholder="10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor={`unit-${index}`}>Matavimo vienetas</Label>
                  <Input
                    id={`unit-${index}`}
                    value={item.unit}
                    onChange={(e) => updateItem(index, 'unit', e.target.value)}
                    placeholder="m², kg, vnt."
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`notes-${index}`}>Pastabos</Label>
                  <Input
                    id={`notes-${index}`}
                    value={item.notes}
                    onChange={(e) => updateItem(index, 'notes', e.target.value)}
                    placeholder="Papildoma informacija"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addItem} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            Pridėti daiktą
          </Button>

          <div className="space-y-2">
            <Label htmlFor="note">Bendra pastaba (neprivaloma)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Papildoma informacija..."
              rows={2}
              disabled={loading}
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Vykdoma...
              </>
            ) : (
              <>
                <Package className="h-4 w-4 mr-2" />
                Siūlyti paramą
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

