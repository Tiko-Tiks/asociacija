"use client"

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { submitPreOnboardingGovernance, type BoardMember } from '@/app/actions/pre-onboarding-governance'
import { getActiveGovernanceQuestions, type GovernanceQuestion } from '@/app/actions/governance-questions'
import { getPreOnboardingGovernance } from '@/app/actions/pre-onboarding-governance'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, FileText, Plus, X, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface GovernanceFormProps {
  orgSlug: string
  orgName: string
}

export function GovernanceForm({ orgSlug, orgName }: GovernanceFormProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [questions, setQuestions] = useState<GovernanceQuestion[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [currentSection, setCurrentSection] = useState(0)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [validationErrors, setValidationErrors] = useState<Record<number, string[]>>({})
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([])
  const [showBoardMembers, setShowBoardMembers] = useState(false)

  // Load questions and existing answers
  useEffect(() => {
    const loadData = async () => {
      setLoadingQuestions(true)
      try {
        const [questionsData, existingData] = await Promise.all([
          getActiveGovernanceQuestions(),
          getPreOnboardingGovernance(orgSlug),
        ])
        
        setQuestions(questionsData)
        
        // Initialize form data
        const initialData: Record<string, any> = {}
        questionsData.forEach((q) => {
          if (existingData.success && existingData.answers?.[q.question_key] !== undefined) {
            initialData[q.question_key] = existingData.answers[q.question_key]
          } else {
            if (q.question_type === 'checkbox') {
              initialData[q.question_key] = false
            } else {
              initialData[q.question_key] = ''
            }
          }
        })
        setFormData(initialData)
        
        // Load board members if exist
        if (existingData.success && existingData.boardMembers) {
          setBoardMembers(existingData.boardMembers)
          setShowBoardMembers(existingData.boardMembers.length > 0)
        }
      } catch (error) {
        console.error('Error loading data:', error)
        toast({
          title: 'Klaida',
          description: 'Nepavyko įkelti duomenų',
          variant: 'destructive',
        })
      } finally {
        setLoadingQuestions(false)
      }
    }
    loadData()
  }, [orgSlug, toast])

  // Get unique sections
  const sections = useMemo(() => {
    const uniqueSections = Array.from(new Set(questions.map((q) => q.section)))
    return uniqueSections.sort((a, b) => {
      const orderA = questions.find((q) => q.section === a)?.section_order || 0
      const orderB = questions.find((q) => q.section === b)?.section_order || 0
      return orderA - orderB
    })
  }, [questions])

  // Get questions for current section
  const currentSectionQuestions = useMemo(() => {
    if (sections.length === 0) return []
    const sectionName = sections[currentSection]
    return questions
      .filter((q) => q.section === sectionName)
      .sort((a, b) => a.section_order - b.section_order)
  }, [questions, sections, currentSection])

  // Check if question should be visible
  const isQuestionVisible = useCallback(
    (question: GovernanceQuestion): boolean => {
      if (!question.depends_on) return true

      const dependsValue = formData[question.depends_on]
      
      // Special handling for board_member_count
      if (question.question_key === 'board_member_count') {
        const govBodyType = formData['governing_body_type']
        return govBodyType && govBodyType !== 'nera'
      }
      
      // Special handling for board term questions
      if (question.question_key === 'board_term_same_as_chairman' ||
          question.question_key === 'board_term_start' ||
          question.question_key === 'board_term_years') {
        const govBodyType = formData['governing_body_type']
        if (govBodyType === 'nera') return false
        if (question.depends_on === 'board_term_same_as_chairman') {
          return dependsValue === false || dependsValue === 'false'
        }
      }
      
      if (question.depends_value === 'true') {
        return dependsValue === true
      }
      if (question.depends_value === 'false') {
        return dependsValue === false
      }
      return dependsValue === question.depends_value
    },
    [formData]
  )

  // Check if question is required
  const isQuestionRequired = useCallback(
    (question: GovernanceQuestion): boolean => {
      if (!isQuestionVisible(question)) return false
      if (question.depends_on) return true
      return question.is_required
    },
    [isQuestionVisible]
  )

  // Validate current section
  const validateSection = useCallback((): string[] => {
    const errors: string[] = []

    currentSectionQuestions.forEach((question) => {
      if (!isQuestionVisible(question)) return
      const required = isQuestionRequired(question)
      if (!required) return

      const value = formData[question.question_key]
      
      if (question.question_type === 'checkbox') {
        // Checkboxes are optional unless they control other fields
        if (!questions.some(q => q.depends_on === question.question_key)) {
          return
        }
      } else if (question.question_type === 'number' || question.question_type === 'date') {
        if (!value || value.toString().trim() === '') {
          errors.push(question.question_key)
        }
      } else {
        if (!value || value.toString().trim() === '') {
          errors.push(question.question_key)
        }
      }
    })

    return errors
  }, [currentSectionQuestions, formData, isQuestionVisible, isQuestionRequired, questions])

  const getFieldError = (fieldName: string): boolean => {
    return validationErrors[currentSection]?.includes(fieldName) || false
  }

  const canProceed = useMemo(() => {
    if (sections.length === 0) return false
    const errors = validateSection()
    return errors.length === 0
  }, [sections.length, validateSection])

  const handleNext = () => {
    const errors = validateSection()
    if (errors.length > 0) {
      setValidationErrors({ ...validationErrors, [currentSection]: errors })
      setTimeout(() => {
        const firstError = document.querySelector('[data-field-error="true"]')
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
      return
    }

    const newErrors = { ...validationErrors }
    delete newErrors[currentSection]
    setValidationErrors(newErrors)

    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Process form data
      const processedData: Record<string, any> = {}
      questions.forEach((q) => {
        const value = formData[q.question_key]
        
        if (q.question_type === 'number') {
          if (value === undefined || value === null || value === '') return
          if (typeof value === 'string' && value.trim() !== '') {
            const numValue = Number(value)
            if (!isNaN(numValue)) {
              processedData[q.question_key] = numValue
            }
          } else if (typeof value === 'number') {
            processedData[q.question_key] = value
          }
        } else if (q.question_type === 'checkbox') {
          processedData[q.question_key] = Boolean(value)
        } else if (q.question_type === 'date') {
          if (value !== undefined && value !== null && value !== '') {
            processedData[q.question_key] = String(value)
          }
        } else {
          if (value !== undefined && value !== null && value !== '') {
            processedData[q.question_key] = String(value)
          }
        }
      })
      
      const result = await submitPreOnboardingGovernance(orgSlug, {
        answers: processedData,
        boardMembers: boardMembers.length > 0 ? boardMembers : undefined,
        aiReviewed: false, // AI assistance not implemented in V2 (governance-locked)
      })

      if (result.success) {
        toast({
          title: 'Sėkmė!',
          description: 'Valdymo atsakymai sėkmingai pateikti. Administracija peržiūrės jūsų prašymą.',
        })
        // Refresh page to show updated status
        router.refresh()
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko pateikti atsakymų',
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
      setLoading(false)
    }
  }

  // Check if board members section should be shown
  useEffect(() => {
    const boardMemberCount = formData['board_member_count']
    const governingBodyType = formData['governing_body_type']
    
    if (boardMemberCount && Number(boardMemberCount) > 0 && governingBodyType && governingBodyType !== 'nera') {
      setShowBoardMembers(true)
      // Initialize board members array if needed
      if (boardMembers.length === 0) {
        setBoardMembers([{ full_name: '', email: '', term_start: '', term_end: '' }])
      }
    } else {
      setShowBoardMembers(false)
      setBoardMembers([])
    }
  }, [formData['board_member_count'], formData['governing_body_type']])

  const addBoardMember = () => {
    setBoardMembers([...boardMembers, { full_name: '', email: '', term_start: '', term_end: '' }])
  }

  const removeBoardMember = (index: number) => {
    setBoardMembers(boardMembers.filter((_, i) => i !== index))
  }

  const updateBoardMember = (index: number, field: keyof BoardMember, value: string) => {
    const updated = [...boardMembers]
    updated[index] = { ...updated[index], [field]: value }
    setBoardMembers(updated)
  }

  const renderQuestion = (question: GovernanceQuestion) => {
    if (!isQuestionVisible(question)) return null

    const hasError = getFieldError(question.question_key)
    const value = formData[question.question_key]

    return (
      <div
        key={question.question_key}
        data-field-error={hasError}
        className={`space-y-3 ${hasError ? 'p-4 border border-red-300 rounded-lg bg-red-50' : ''}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Label
              htmlFor={question.question_key}
              className={`text-base font-semibold ${hasError ? 'text-red-600' : 'text-slate-900'}`}
            >
              {question.question_text}
              {question.is_required && (
                <span className="text-red-600 ml-1">*</span>
              )}
            </Label>
            {hasError && (
              <p className="text-xs text-red-600 mt-1">Šis laukas yra privalomas</p>
            )}
          </div>
        </div>

        {question.question_type === 'radio' && question.options && (
          <RadioGroup
            name={question.question_key}
            value={value || ''}
            onValueChange={(newValue) => {
              setFormData({ ...formData, [question.question_key]: newValue })
              if (validationErrors[currentSection]) {
                setValidationErrors({
                  ...validationErrors,
                  [currentSection]: validationErrors[currentSection].filter(
                    (e) => e !== question.question_key
                  ),
                })
              }
            }}
          >
            {question.options.map((option) => (
              <div
                key={option.value}
                className={`flex items-center space-x-2 p-3 rounded-lg border hover:bg-slate-50 ${
                  hasError ? 'border-red-300 bg-red-50' : ''
                }`}
              >
                <RadioGroupItem value={option.value} id={`${question.question_key}-${option.value}`} />
                <Label
                  htmlFor={`${question.question_key}-${option.value}`}
                  className="flex-1 cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {question.question_type === 'checkbox' && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={question.question_key}
              checked={value === true}
              onCheckedChange={(checked) => {
                const newValue = checked === true
                const updatedData: Record<string, any> = { ...formData, [question.question_key]: newValue }
                
                if (!newValue) {
                  questions
                    .filter((q) => q.depends_on === question.question_key && q.depends_value === 'true')
                    .forEach((depQ) => {
                      if (depQ.question_type === 'checkbox') {
                        updatedData[depQ.question_key] = false
                      } else {
                        updatedData[depQ.question_key] = ''
                      }
                    })
                }
                
                setFormData(updatedData)
                if (validationErrors[currentSection]) {
                  setValidationErrors({
                    ...validationErrors,
                    [currentSection]: validationErrors[currentSection].filter(
                      (e) => e !== question.question_key
                    ),
                  })
                }
              }}
            />
            <Label htmlFor={question.question_key} className="cursor-pointer">
              {question.question_text}
            </Label>
          </div>
        )}

        {question.question_type === 'text' && (
          <Input
            id={question.question_key}
            value={value || ''}
            onChange={(e) => {
              setFormData({ ...formData, [question.question_key]: e.target.value })
              if (validationErrors[currentSection]) {
                setValidationErrors({
                  ...validationErrors,
                  [currentSection]: validationErrors[currentSection].filter(
                    (e) => e !== question.question_key
                  ),
                })
              }
            }}
            className={hasError ? 'border-red-500' : ''}
            placeholder="Įveskite tekstą..."
          />
        )}

        {question.question_type === 'number' && (
          <Input
            id={question.question_key}
            type="number"
            value={value || ''}
            onChange={(e) => {
              setFormData({ ...formData, [question.question_key]: e.target.value })
              if (validationErrors[currentSection]) {
                setValidationErrors({
                  ...validationErrors,
                  [currentSection]: validationErrors[currentSection].filter(
                    (e) => e !== question.question_key
                  ),
                })
              }
            }}
            className={hasError ? 'border-red-500' : ''}
            placeholder="Įveskite skaičių..."
            min={question.validation_rules?.min}
            max={question.validation_rules?.max}
          />
        )}

        {question.question_type === 'date' && (
          <Input
            id={question.question_key}
            type="date"
            value={value || ''}
            onChange={(e) => {
              setFormData({ ...formData, [question.question_key]: e.target.value })
              if (validationErrors[currentSection]) {
                setValidationErrors({
                  ...validationErrors,
                  [currentSection]: validationErrors[currentSection].filter(
                    (e) => e !== question.question_key
                  ),
                })
              }
            }}
            className={hasError ? 'border-red-500' : ''}
          />
        )}
      </div>
    )
  }

  if (loadingQuestions) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto" />
          <p className="text-slate-600 mt-4">Įkeliami klausimai...</p>
        </CardContent>
      </Card>
    )
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-slate-600">Klausimai dar nėra sukonfigūruoti. Susisiekite su administratoriumi.</p>
        </CardContent>
      </Card>
    )
  }

  const currentSectionName = sections[currentSection] || ''
  const isLastSection = currentSection === sections.length - 1

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">Valdymo klausimai</CardTitle>
            <CardDescription>
              Užpildykite pagrindinius valdymo parametrus jūsų bendruomenei
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2">
          {sections.map((section, index) => (
            <button
              key={section}
              onClick={() => setCurrentSection(index)}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                currentSection === index
                  ? 'bg-blue-600 text-white'
                  : currentSection > index
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {/* Current Section */}
        <div className="space-y-6 animate-in fade-in-50 duration-300">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">{currentSectionName}</h2>
          {currentSectionQuestions.map((question) => renderQuestion(question))}
        </div>

        {/* Board Members Section (shown after governance questions if applicable) */}
        {isLastSection && showBoardMembers && (
          <div className="space-y-4 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Valdybos nariai</h3>
                <p className="text-sm text-slate-600">
                  Pridėkite valdybos narių informaciją (pagal įstatus)
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBoardMember}
              >
                <Plus className="h-4 w-4 mr-2" />
                Pridėti narį
              </Button>
            </div>

            {boardMembers.map((member, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-semibold text-slate-900">Narys {index + 1}</h4>
                    {boardMembers.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBoardMember(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`board-member-${index}-name`}>
                        Vardas, pavardė <span className="text-red-600">*</span>
                      </Label>
                      <Input
                        id={`board-member-${index}-name`}
                        value={member.full_name}
                        onChange={(e) => updateBoardMember(index, 'full_name', e.target.value)}
                        placeholder="Vardas, pavardė"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`board-member-${index}-email`}>
                        El. paštas (nebūtina)
                      </Label>
                      <Input
                        id={`board-member-${index}-email`}
                        type="email"
                        value={member.email || ''}
                        onChange={(e) => updateBoardMember(index, 'email', e.target.value)}
                        placeholder="el@pastas.lt"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`board-member-${index}-term-start`}>
                        Kadencijos pradžia (nebūtina)
                      </Label>
                      <Input
                        id={`board-member-${index}-term-start`}
                        type="date"
                        value={member.term_start || ''}
                        onChange={(e) => updateBoardMember(index, 'term_start', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`board-member-${index}-term-end`}>
                        Kadencijos pabaiga (nebūtina)
                      </Label>
                      <Input
                        id={`board-member-${index}-term-end`}
                        type="date"
                        value={member.term_end || ''}
                        onChange={(e) => updateBoardMember(index, 'term_end', e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <strong>Pastaba:</strong> Valdybos nariai bus sukurti tik po administracijos patvirtinimo.
                  Dabar jūs tik pateikiate informaciją peržiūrai.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
            disabled={currentSection === 0}
          >
            Atgal
          </Button>
          {isLastSection ? (
            <Button
              onClick={handleSubmit}
              disabled={loading || !canProceed}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Pateikiama...
                </>
              ) : (
                'Pateikti'
              )}
            </Button>
          ) : (
            <Button onClick={handleNext} variant="default" className="min-w-[120px]" disabled={!canProceed}>
              Kitas
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>Patarimas:</strong> Užpildykite visus privalomus laukus. Po pateikimo administracija peržiūrės
            jūsų prašymą ir patvirtins registraciją.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
