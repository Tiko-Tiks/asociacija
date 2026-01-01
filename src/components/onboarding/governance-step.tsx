"use client"

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { submitGovernanceAnswers } from '@/app/actions/governance-submission'
import { getActiveGovernanceQuestions, type GovernanceQuestion } from '@/app/actions/governance-questions'
import { getGovernanceConfig } from '@/app/actions/governance-config'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, FileText } from 'lucide-react'

interface GovernanceStepProps {
  orgId: string
  onComplete: () => void
  allowUpdateForActive?: boolean
}

export function GovernanceStep({ orgId, onComplete, allowUpdateForActive = false }: GovernanceStepProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [questions, setQuestions] = useState<GovernanceQuestion[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [currentSection, setCurrentSection] = useState(0)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [validationErrors, setValidationErrors] = useState<Record<number, string[]>>({})

  // Load questions and existing answers from DB
  useEffect(() => {
    const loadQuestions = async () => {
      setLoadingQuestions(true)
      try {
        const [questionsData, existingAnswers] = await Promise.all([
          getActiveGovernanceQuestions(),
          getGovernanceConfig(orgId),
        ])
        
        setQuestions(questionsData)
        
        // Initialize form data with existing answers or default values
        const initialData: Record<string, any> = {}
        questionsData.forEach((q) => {
          // If existing answer exists, use it
          if (existingAnswers && existingAnswers[q.question_key] !== undefined) {
            initialData[q.question_key] = existingAnswers[q.question_key]
          } else {
            // Otherwise use default value
            if (q.question_type === 'checkbox') {
              initialData[q.question_key] = false
            } else if (q.question_type === 'number' || q.question_type === 'text') {
              initialData[q.question_key] = ''
            } else if (q.question_type === 'date') {
              initialData[q.question_key] = ''
            } else {
              initialData[q.question_key] = ''
            }
          }
        })
        setFormData(initialData)
      } catch (error) {
        console.error('Error loading questions:', error)
        toast({
          title: 'Klaida',
          description: 'Nepavyko įkelti klausimų',
          variant: 'destructive',
        })
      } finally {
        setLoadingQuestions(false)
      }
    }
    loadQuestions()
  }, [orgId, toast])

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

  // Check if a question should be visible (based on depends_on)
  const isQuestionVisible = useCallback(
    (question: GovernanceQuestion): boolean => {
      if (!question.depends_on) return true

      const dependsValue = formData[question.depends_on]
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

  // Validate current section
  const validateSection = useCallback((): string[] => {
    const errors: string[] = []

    currentSectionQuestions.forEach((question) => {
      if (!isQuestionVisible(question)) return

      if (question.is_required) {
        const value = formData[question.question_key]
        if (question.question_type === 'checkbox') {
          // For checkbox, if it depends on another checkbox being true, it's required when visible
          if (question.depends_on && question.depends_value === 'true') {
            // This is a conditional required field - only required if parent is checked
            if (formData[question.depends_on] === true && value !== true && value !== '') {
              errors.push(question.question_key)
            }
          } else if (value !== true) {
            errors.push(question.question_key)
          }
        } else if (question.question_type === 'number' || question.question_type === 'date') {
          // Number/Date is required if it's empty or invalid
          // But only if it's conditionally visible and parent is checked
          if (question.depends_on && question.depends_value === 'true') {
            if (formData[question.depends_on] === true && (!value || value.toString().trim() === '')) {
              errors.push(question.question_key)
            }
          } else if (!value || value.toString().trim() === '') {
            errors.push(question.question_key)
          }
        } else {
          // Radio/text is required if empty
          if (!value || value.toString().trim() === '') {
            errors.push(question.question_key)
          }
        }
      }
    })

    return errors
  }, [currentSectionQuestions, formData, isQuestionVisible])

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
      // Convert form data to proper types before submitting
      // Include ALL questions, even if empty (for required validation)
      const processedData: Record<string, any> = {}
      questions.forEach((q) => {
        const value = formData[q.question_key]
        
        // Convert to proper type based on question type
        if (q.question_type === 'number') {
          // Convert string to number if needed
          if (value === undefined || value === null || value === '') {
            // Skip empty values for number type (will be caught by validation)
            return
          }
          if (typeof value === 'string' && value.trim() !== '') {
            const numValue = Number(value)
            if (!isNaN(numValue)) {
              processedData[q.question_key] = numValue
            } else {
              // Invalid number - skip it, validation will catch it
              return
            }
          } else if (typeof value === 'number') {
            processedData[q.question_key] = value
          }
        } else if (q.question_type === 'checkbox') {
          // Always include checkbox (even if false)
          processedData[q.question_key] = Boolean(value)
        } else if (q.question_type === 'date') {
          // Date - include if not empty, store as ISO date string
          if (value !== undefined && value !== null && value !== '') {
            processedData[q.question_key] = String(value)
          }
        } else {
          // radio, text - include if not empty
          if (value !== undefined && value !== null && value !== '') {
            processedData[q.question_key] = String(value)
          }
        }
      })
      
      console.log('Submitting governance answers:', {
        orgId,
        processedData,
        originalFormData: formData,
      })
      
      const result = await submitGovernanceAnswers(orgId, processedData, allowUpdateForActive)

      if (result.success) {
        toast({
          title: 'Sėkmė!',
          description: 'Valdymo atsakymai sėkmingai pateikti',
        })
        onComplete()
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
                
                // Clear dependent fields if unchecking
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
          <div className="space-y-2">
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
            {question.depends_on && (
              <p className="text-xs text-slate-500">
                Rodo tik jei &quot;{questions.find((q) => q.question_key === question.depends_on)?.question_text}&quot; yra pažymėta
              </p>
            )}
          </div>
        )}

        {question.question_type === 'date' && (
          <div className="space-y-2">
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
            {question.depends_on && (
              <p className="text-xs text-slate-500">
                Rodo tik jei &quot;{questions.find((q) => q.question_key === question.depends_on)?.question_text}&quot; yra pažymėta
              </p>
            )}
          </div>
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-xl">1. Valdymo klausimai</CardTitle>
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

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
            disabled={currentSection === 0}
          >
            Atgal
          </Button>
          <div className="flex gap-2">
            {currentSection < sections.length - 1 ? (
              <Button onClick={handleNext} variant="default" className="min-w-[120px]">
                Kitas
              </Button>
            ) : (
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
            )}
          </div>
        </div>

        {/* Help Text */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>Patarimas:</strong> Galite grįžti ir pakeisti atsakymus bet kuriuo metu iki
            pateikimo. Visi laukai nėra privalomi, bet rekomenduojame užpildyti visus, kad sistema
            veiktų optimaliai.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
