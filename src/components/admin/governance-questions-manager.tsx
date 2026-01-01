'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Loader2,
  Save,
  X,
} from 'lucide-react'
import {
  getAllGovernanceQuestions,
  createGovernanceQuestion,
  updateGovernanceQuestion,
  deleteGovernanceQuestion,
  type GovernanceQuestion,
  type CreateQuestionData,
} from '@/app/actions/admin/governance-questions'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'

export function GovernanceQuestionsManager() {
  const router = useRouter()
  const { toast } = useToast()
  const [questions, setQuestions] = useState<GovernanceQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [editingQuestion, setEditingQuestion] = useState<GovernanceQuestion | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState<CreateQuestionData>({
    question_key: '',
    question_text: '',
    question_type: 'radio',
    section: 'Narystės valdymas',
    section_order: 0,
    is_required: true,
    options: [],
    depends_on: null,
    depends_value: null,
  })

  const sections = [
    'Narystės valdymas',
    'Valdymo struktūra',
    'Susirinkimai ir balsavimas',
    'Finansai ir projektai',
  ]

  useEffect(() => {
    loadQuestions()
  }, [])

  const loadQuestions = async () => {
    setLoading(true)
    try {
      const data = await getAllGovernanceQuestions()
      setQuestions(data)
    } catch (error) {
      toast({
        title: 'Klaida',
        description: 'Nepavyko įkelti klausimų',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setFormData({
      question_key: '',
      question_text: '',
      question_type: 'radio',
      section: 'Narystės valdymas',
      section_order: questions.filter((q) => q.section === 'Narystės valdymas').length + 1,
      is_required: true,
      options: [],
      depends_on: null,
      depends_value: null,
    })
    setIsCreateDialogOpen(true)
  }

  const handleEdit = (question: GovernanceQuestion) => {
    setFormData({
      question_key: question.question_key,
      question_text: question.question_text,
      question_type: question.question_type,
      section: question.section,
      section_order: question.section_order,
      is_required: question.is_required,
      options: question.options || [],
      depends_on: question.depends_on || null,
      depends_value: question.depends_value || null,
    })
    setEditingQuestion(question)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editingQuestion) {
        const result = await updateGovernanceQuestion(editingQuestion.id, formData)
        if (result.success) {
          toast({
            title: 'Sėkmė',
            description: 'Klausimas sėkmingai atnaujintas',
          })
          setEditingQuestion(null)
          loadQuestions()
          router.refresh()
        } else {
          toast({
            title: 'Klaida',
            description: result.error || 'Nepavyko atnaujinti klausimo',
            variant: 'destructive',
          })
        }
      } else {
        const result = await createGovernanceQuestion(formData)
        if (result.success) {
          toast({
            title: 'Sėkmė',
            description: 'Klausimas sėkmingai sukurtas',
          })
          setIsCreateDialogOpen(false)
          loadQuestions()
          router.refresh()
        } else {
          toast({
            title: 'Klaida',
            description: result.error || 'Nepavyko sukurti klausimo',
            variant: 'destructive',
          })
        }
      }
    } catch (error) {
      toast({
        title: 'Klaida',
        description: 'Įvyko netikėta klaida',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Ar tikrai norite pašalinti šį klausimą?')) return

    setSaving(true)
    try {
      const result = await deleteGovernanceQuestion(id)
      if (result.success) {
        toast({
          title: 'Sėkmė',
          description: 'Klausimas sėkmingai pašalintas',
        })
        loadQuestions()
        router.refresh()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko pašalinti klausimo',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Klaida',
        description: 'Įvyko netikėta klaida',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...(formData.options || []), { value: '', label: '' }],
    })
  }

  const updateOption = (index: number, field: 'value' | 'label', value: string) => {
    const newOptions = [...(formData.options || [])]
    newOptions[index] = { ...newOptions[index], [field]: value }
    setFormData({ ...formData, options: newOptions })
  }

  const removeOption = (index: number) => {
    const newOptions = [...(formData.options || [])]
    newOptions.splice(index, 1)
    setFormData({ ...formData, options: newOptions })
  }

  const groupedQuestions = questions.reduce((acc, q) => {
    if (!acc[q.section]) {
      acc[q.section] = []
    }
    acc[q.section].push(q)
    return acc
  }, {} as Record<string, GovernanceQuestion[]>)

  if (loading) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-slate-100">Klausimyno valdymas</CardTitle>
              <p className="text-sm text-slate-400 mt-1">
                Valdykite governance klausimus, kuriuos pildo bendruomenės
              </p>
            </div>
            <Button
              onClick={handleCreate}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Pridėti klausimą
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {sections.map((section) => {
              const sectionQuestions = groupedQuestions[section] || []
              if (sectionQuestions.length === 0) return null

              return (
                <div key={section} className="space-y-2">
                  <h3 className="text-lg font-semibold text-slate-100 mb-3">{section}</h3>
                  <div className="rounded-md border border-slate-800">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-800 hover:bg-slate-900/50">
                          <TableHead className="text-slate-400 w-12">#</TableHead>
                          <TableHead className="text-slate-400">Klausimas</TableHead>
                          <TableHead className="text-slate-400">Tipas</TableHead>
                          <TableHead className="text-slate-400">Privalomas</TableHead>
                          <TableHead className="text-slate-400">Priklauso nuo</TableHead>
                          <TableHead className="text-slate-400 text-right">Veiksmai</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sectionQuestions.map((question) => (
                          <TableRow
                            key={question.id}
                            className="border-slate-800 hover:bg-slate-900/50"
                          >
                            <TableCell className="text-slate-400">
                              {question.section_order}
                            </TableCell>
                            <TableCell className="text-slate-100">
                              <div>
                                <div className="font-medium">{question.question_text}</div>
                                <div className="text-xs text-slate-500 font-mono mt-1">
                                  {question.question_key}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  question.question_type === 'radio'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : question.question_type === 'checkbox'
                                    ? 'bg-purple-500/20 text-purple-400'
                                    : 'bg-slate-700/50 text-slate-400'
                                }
                              >
                                {question.question_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {question.is_required ? (
                                <Badge className="bg-red-500/20 text-red-400">Taip</Badge>
                              ) : (
                                <Badge className="bg-slate-700/50 text-slate-400">Ne</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-slate-400 text-sm">
                              {question.depends_on ? (
                                <span>
                                  {question.depends_on} = {question.depends_value}
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(question)}
                                  className="text-slate-400 hover:text-slate-100"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(question.id)}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || !!editingQuestion}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false)
            setEditingQuestion(null)
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] bg-slate-900 border-slate-800 overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-100">
              {editingQuestion ? 'Redaguoti klausimą' : 'Pridėti naują klausimą'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Sukurkite arba redaguokite governance klausimą
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="question_key" className="text-slate-400">
                Klausimo raktas (unikali ID)
              </Label>
              <Input
                id="question_key"
                value={formData.question_key}
                onChange={(e) => setFormData({ ...formData, question_key: e.target.value })}
                className="mt-1 bg-slate-800 border-slate-700 text-slate-100"
                disabled={!!editingQuestion}
                placeholder="new_member_approval"
              />
              <p className="text-xs text-slate-500 mt-1">
                Unikalus identifikatorius (naudojamas formoje)
              </p>
            </div>

            <div>
              <Label htmlFor="question_text" className="text-slate-400">
                Klausimo tekstas
              </Label>
              <Input
                id="question_text"
                value={formData.question_text}
                onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                className="mt-1 bg-slate-800 border-slate-700 text-slate-100"
                placeholder="Kas turi teisę patvirtinti naują narį?"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="question_type" className="text-slate-400">
                  Tipas
                </Label>
                <Select
                  value={formData.question_type}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, question_type: value })
                  }
                >
                  <SelectTrigger className="mt-1 bg-slate-800 border-slate-700 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="radio">Radio (vienas pasirinkimas)</SelectItem>
                    <SelectItem value="checkbox">Checkbox (keli pasirinkimai)</SelectItem>
                    <SelectItem value="text">Tekstas</SelectItem>
                    <SelectItem value="number">Skaičius</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="section" className="text-slate-400">
                  Skyrius
                </Label>
                <Select
                  value={formData.section}
                  onValueChange={(value) => setFormData({ ...formData, section: value })}
                >
                  <SelectTrigger className="mt-1 bg-slate-800 border-slate-700 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {sections.map((section) => (
                      <SelectItem key={section} value={section}>
                        {section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="section_order" className="text-slate-400">
                  Eiliškumas skyriuje
                </Label>
                <Input
                  id="section_order"
                  type="number"
                  value={formData.section_order}
                  onChange={(e) =>
                    setFormData({ ...formData, section_order: parseInt(e.target.value) || 0 })
                  }
                  className="mt-1 bg-slate-800 border-slate-700 text-slate-100"
                />
              </div>

              <div className="flex items-center gap-2 pt-8">
                <Checkbox
                  id="is_required"
                  checked={formData.is_required}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_required: checked === true })
                  }
                />
                <Label htmlFor="is_required" className="text-slate-400 cursor-pointer">
                  Privalomas klausimas
                </Label>
              </div>
            </div>

            {/* Options for radio/checkbox */}
            {(formData.question_type === 'radio' || formData.question_type === 'checkbox') && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-slate-400">Pasirinkimai</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                    className="border-slate-700 text-slate-300"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Pridėti pasirinkimą
                  </Button>
                </div>
                <div className="space-y-2">
                  {(formData.options || []).map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Reikšmė (value)"
                        value={option.value}
                        onChange={(e) => updateOption(index, 'value', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-slate-100 font-mono"
                      />
                      <Input
                        placeholder="Etiketė (label)"
                        value={option.label}
                        onChange={(e) => updateOption(index, 'label', e.target.value)}
                        className="bg-slate-800 border-slate-700 text-slate-100"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conditional dependencies */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="depends_on" className="text-slate-400">
                  Priklauso nuo (klausimo raktas)
                </Label>
                <Input
                  id="depends_on"
                  value={formData.depends_on || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, depends_on: e.target.value || null })
                  }
                  className="mt-1 bg-slate-800 border-slate-700 text-slate-100"
                  placeholder="track_fees"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Rodo klausimą tik jei kitas klausimas turi nurodytą reikšmę
                </p>
              </div>

              <div>
                <Label htmlFor="depends_value" className="text-slate-400">
                  Reikšmė (kai rodomas)
                </Label>
                <Input
                  id="depends_value"
                  value={formData.depends_value || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, depends_value: e.target.value || null })
                  }
                  className="mt-1 bg-slate-800 border-slate-700 text-slate-100"
                  placeholder="true"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Pvz., &quot;true&quot; checkbox, &quot;auto&quot; radio
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false)
                setEditingQuestion(null)
              }}
              className="border-slate-700 text-slate-300"
            >
              Atšaukti
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.question_key || !formData.question_text}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Išsaugoma...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Išsaugoti
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

