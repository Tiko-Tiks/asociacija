'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle, AlertTriangle, ArrowLeft } from 'lucide-react'
import {
  validateOrgCompliance,
  markOrgComplianceOk,
  type ComplianceValidation,
  type ComplianceIssue,
} from '@/app/actions/governance-compliance'
import { getActiveGovernanceQuestions, type GovernanceQuestion } from '@/app/actions/governance-questions'
import { GovernanceStep } from '@/components/onboarding/governance-step'
// Note: Governance form is available via governance page

interface GovernanceFixPageClientProps {
  orgId: string
  orgSlug: string
  compliance: {
    status: string
    schema_version_no: number | null
    last_validated_at: string | null
    issues: ComplianceIssue[]
  } | null
  validation: ComplianceValidation | null
}

export function GovernanceFixPageClient({
  orgId,
  orgSlug,
  compliance,
  validation: initialValidation,
}: GovernanceFixPageClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [validation, setValidation] = useState<ComplianceValidation | null>(initialValidation)
  const [loading, setLoading] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [questions, setQuestions] = useState<Map<string, GovernanceQuestion>>(new Map())
  const [formKey, setFormKey] = useState(0) // Key to force form reload

  // Load questions on mount
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const qs = await getActiveGovernanceQuestions()
        const questionsMap = new Map<string, GovernanceQuestion>()
        qs.forEach((q) => {
          questionsMap.set(q.question_key, q)
        })
        setQuestions(questionsMap)
      } catch (error) {
        console.error('Error loading questions:', error)
      }
    }
    loadQuestions()
  }, [])

  const handleRevalidate = async () => {
    setLoading(true)
    try {
      const result = await validateOrgCompliance(orgId)
      setValidation(result)
      toast({
        title: 'Patikra atlikta',
        description: 'Nustatymai patikrinti',
      })
    } catch (error) {
      console.error('Error validating:', error)
      toast({
        title: 'Klaida',
        description: 'Nepavyko patikrinti nustatymų',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getQuestionText = (questionKey: string): string => {
    const question = questions.get(questionKey)
    return question?.question_text || questionKey
  }

  const handleMarkOk = async () => {
    if (!validation) return

    setFixing(true)
    try {
      const result = await markOrgComplianceOk(orgId, validation.schema_version_no)
      if (result.success) {
        toast({
          title: 'Sėkmė',
          description: 'Nustatymai pažymėti kaip teisingi',
        })
        router.refresh()
        router.push(`/dashboard/${orgSlug}`)
      } else {
        toast({
          title: 'Klaida',
          description: result.error || 'Nepavyko pažymėti',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error marking OK:', error)
      toast({
        title: 'Klaida',
        description: 'Įvyko netikėta klaida',
        variant: 'destructive',
      })
    } finally {
      setFixing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OK':
        return <Badge className="bg-green-100 text-green-800">Gerai</Badge>
      case 'NEEDS_UPDATE':
        return <Badge variant="destructive">Reikia atnaujinti</Badge>
      case 'INVALID':
        return <Badge variant="destructive">Netinkama</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handleGovernanceComplete = async () => {
    // Wait a bit for the database to update
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Revalidate after fixing
    setLoading(true)
    try {
      // Force a fresh validation - call it multiple times to ensure it updates
      let result = await validateOrgCompliance(orgId)
      console.log('Validation result after submit (first attempt):', result)
      
      // If still has issues, wait a bit more and try again
      if (result && result.status !== 'OK') {
        await new Promise(resolve => setTimeout(resolve, 1000))
        result = await validateOrgCompliance(orgId)
        console.log('Validation result after submit (second attempt):', result)
      }
      
      if (result) {
        setValidation(result)
        
        // Force form reload to show updated data
        setFormKey(prev => prev + 1)
        
        // If status is OK, refresh the page
        if (result.status === 'OK') {
          toast({
            title: 'Sėkmė',
            description: 'Visi nustatymai atnaujinti ir patvirtinti',
          })
          // Refresh the page to show updated status
          setTimeout(() => {
            router.refresh()
            router.push(`/dashboard/${orgSlug}`)
          }, 1500)
        } else {
          // Still has issues - show what's missing
          const missingCount = result.missing_required?.length || 0
          const invalidCount = result.invalid_types?.length || 0
          toast({
            title: 'Duomenys išsaugoti',
            description: missingCount > 0 || invalidCount > 0
              ? `Išsaugota. Vis dar trūksta: ${missingCount} klausimų, netinkamų: ${invalidCount}`
              : 'Nustatymai atnaujinti. Patikrinkite, ar viskas gerai.',
          })
          // Force page refresh to reload data
          router.refresh()
        }
      } else {
        toast({
          title: 'Klaida',
          description: 'Nepavyko patikrinti nustatymų po išsaugojimo',
          variant: 'destructive',
        })
        // Force page refresh anyway
        router.refresh()
      }
    } catch (error) {
      console.error('Error validating after submit:', error)
      toast({
        title: 'Klaida',
        description: 'Nepavyko patikrinti nustatymų',
        variant: 'destructive',
      })
      // Force page refresh anyway
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Grįžti
            </Button>
            <h1 className="text-3xl font-bold text-slate-900">Nustatymų patikra</h1>
            <p className="text-slate-600 mt-2">
              Patikrinkite ir pataisykite trūkstamus ar netinkamus nustatymus
            </p>
          </div>
          <Button
            onClick={handleRevalidate}
            disabled={loading}
            variant="outline"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Tikrinama...
              </>
            ) : (
              'Patikrinti'
            )}
          </Button>
        </div>

        {/* Status Card */}
        {validation && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Compliance būsena</CardTitle>
                {getStatusBadge(validation.status)}
              </div>
              <CardDescription>
                Schema versija: {validation.schema_version_no}
                {validation.details.org_version && (
                  <span className="ml-2">
                    (Jūsų versija: {validation.details.org_version})
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {validation.status === 'OK' ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle>Viskas gerai</AlertTitle>
                  <AlertDescription>
                    Visi nustatymai atitinka reikalavimus
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {/* Missing Required */}
                  {validation.missing_required.length > 0 && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>Trūksta privalomų atsakymų</AlertTitle>
                      <AlertDescription>
                        <p className="mb-3 font-medium">Reikia užpildyti šiuos klausimus:</p>
                        <ul className="list-disc list-inside mt-2 space-y-2">
                          {validation.missing_required.map((key) => (
                            <li key={key} className="text-sm">
                              {getQuestionText(key)}
                            </li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Invalid Types */}
                  {validation.invalid_types.length > 0 && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>Netinkami tipai arba reikšmės</AlertTitle>
                      <AlertDescription>
                        <p className="mb-3 font-medium">Šie klausimai turi netinkamas reikšmes:</p>
                        <ul className="list-disc list-inside mt-2 space-y-3">
                          {validation.invalid_types.map((item, idx) => {
                            // Format expected value for display
                            let expectedText = item.expected
                            if (expectedText.startsWith('one of: ')) {
                              expectedText = expectedText.replace('one of: ', '')
                              const options = expectedText.split(', ').map(opt => opt.trim())
                              expectedText = options.join(', ')
                            }
                            
                            return (
                              <li key={idx} className="text-sm">
                                <div className="font-medium mb-1">{getQuestionText(item.question_key)}</div>
                                <div className="ml-4 text-xs text-slate-600 space-y-1">
                                  <div>
                                    <span className="font-medium">Tikėtasi:</span> {expectedText}
                                  </div>
                                  <div>
                                    <span className="font-medium">Gauta:</span> {item.value || item.actual_type}
                                  </div>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Inactive Answered */}
                  {validation.inactive_answered.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertTitle>Įspėjimai</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc list-inside mt-2 space-y-2">
                          {validation.inactive_answered.map((key) => (
                            <li key={key} className="text-sm">{getQuestionText(key)}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Version Mismatch */}
                  {validation.details.version_mismatch && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertTitle>Schema versija pasikeitė</AlertTitle>
                      <AlertDescription>
                        Klausimynas buvo atnaujintas. Prašome peržiūrėti nustatymus.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}


        {/* Governance Form - Show if there are issues to fix */}
        {validation && (validation.status === 'INVALID' || validation.status === 'NEEDS_UPDATE') && (
          <Card>
            <CardHeader>
              <CardTitle>Pataisyti nustatymus</CardTitle>
              <CardDescription>
                Užpildykite trūkstamus arba pataisykite netinkamus atsakymus
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GovernanceStep
                key={formKey}
                orgId={orgId}
                onComplete={handleGovernanceComplete}
                allowUpdateForActive={true}
              />
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {validation && validation.status === 'OK' && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Button
                  onClick={handleMarkOk}
                  disabled={fixing}
                  className="flex-1"
                >
                  {fixing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Pažymima...
                    </>
                  ) : (
                    'Pažymėti kaip patvirtintą'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard/${orgSlug}`)}
                >
                  Grįžti į dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

