"use client"

import { useCallback, useRef, useState, useEffect } from 'react'
import { OnboardingStatus } from '@/app/actions/onboarding-status'
import { GovernanceStep } from './governance-step'
import { BoardMembersStep } from './board-members-step'
import { ConsentsStep } from './consents-step'
import { WaitingStep } from './waiting-step'
import { ReadinessChecklist } from './readiness-checklist'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, Circle } from 'lucide-react'
import { getGovernanceConfig } from '@/app/actions/governance-config'
import { checkBoardMembersAssigned } from '@/app/actions/board-members'
import { validateOrgCompliance } from '@/app/actions/governance-compliance'
import type { ComplianceValidation } from '@/app/actions/governance-compliance-types'

interface OnboardingWizardProps {
  status: OnboardingStatus
}

interface BoardTermData {
  boardMemberCount: number
  termStart: string
  termEnd: string
  needsBoardMembers: boolean
  boardMembersAssigned: boolean
}

export function OnboardingWizard({ status }: OnboardingWizardProps) {
  const currentStep = status.currentStep || 1
  const isReloadingRef = useRef(false)
  
  // Sub-step tracking for step 1: 'governance' | 'board-members'
  const [step1SubStep, setStep1SubStep] = useState<'governance' | 'board-members'>('governance')
  const [boardTermData, setBoardTermData] = useState<BoardTermData | null>(null)
  const [loadingBoardData, setLoadingBoardData] = useState(false)
  const [validation, setValidation] = useState<ComplianceValidation | null>(null)

  // Load board term data and validation when on step 1
  useEffect(() => {
    const loadBoardData = async () => {
      if (currentStep !== 1 || !status.orgId) return
      
      setLoadingBoardData(true)
      try {
        const [config, assignedResult, validationData] = await Promise.all([
          getGovernanceConfig(status.orgId),
          checkBoardMembersAssigned(status.orgId),
          validateOrgCompliance(status.orgId).catch(() => null) // Don't fail if validation fails
        ])
        
        // Set validation if available
        if (validationData) {
          setValidation(validationData)
        }
        
        if (config && config.board_member_count && config.board_member_count > 0) {
          // Calculate term dates
          const chairmanStart = config.chairman_term_start || new Date().toISOString().split('T')[0]
          const chairmanYears = config.chairman_term_years || 3
          const boardSameAsChairman = config.board_term_same_as_chairman !== false
          
          let termStart: string
          let termEnd: string
          
          if (boardSameAsChairman) {
            termStart = chairmanStart
            const endDate = new Date(chairmanStart)
            endDate.setFullYear(endDate.getFullYear() + chairmanYears)
            termEnd = endDate.toISOString().split('T')[0]
          } else {
            termStart = config.board_term_start || chairmanStart
            const boardYears = config.board_term_years || chairmanYears
            const endDate = new Date(termStart)
            endDate.setFullYear(endDate.getFullYear() + boardYears)
            termEnd = endDate.toISOString().split('T')[0]
          }
          
          setBoardTermData({
            boardMemberCount: config.board_member_count,
            termStart,
            termEnd,
            needsBoardMembers: config.board_member_count > 0,
            boardMembersAssigned: assignedResult.success && assignedResult.assigned
          })
          
          // If governance is done but board members not assigned, show board step
          if (status.step1Complete && config.board_member_count > 0 && 
              assignedResult.success && !assignedResult.assigned) {
            setStep1SubStep('board-members')
          }
        }
      } catch (error) {
        console.error('Error loading board data:', error)
      } finally {
        setLoadingBoardData(false)
      }
    }
    
    loadBoardData()
  }, [currentStep, status.orgId, status.step1Complete])

  // Calculate progress percentage based on completed steps
  const completedSteps = [status.step1Complete, status.step2Complete, status.step3Complete].filter(Boolean).length
  const progress = (completedSteps / 3) * 100

  const steps = [
    {
      number: 1,
      title: 'Valdymo klausimai',
      description: 'Užpildykite valdymo klausimus',
      complete: status.step1Complete,
    },
    {
      number: 2,
      title: 'Privalomi sutikimai',
      description: 'Priimkite visus reikalingus sutikimus',
      complete: status.step2Complete,
    },
    {
      number: 3,
      title: 'Laukiama patvirtinimo',
      description: 'Laukite platformos patvirtinimo',
      complete: status.step3Complete,
    },
  ]

  const handleStep1Complete = useCallback(() => {
    if (isReloadingRef.current) {
      return
    }
    isReloadingRef.current = true
    window.location.reload()
  }, [])

  const handleStep2Complete = useCallback(() => {
    if (isReloadingRef.current) {
      return
    }
    isReloadingRef.current = true
    window.location.reload()
  }, [])

  return (
    <div className="space-y-8">
      {/* Progress Indicator */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
          <span>Progresas</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />

        {/* Step Indicators */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className={`flex flex-col items-center text-center p-4 rounded-lg ${
                step.complete
                  ? 'bg-green-50 border-2 border-green-200'
                  : currentStep === step.number
                  ? 'bg-blue-50 border-2 border-blue-200'
                  : 'bg-slate-50 border-2 border-slate-200'
              }`}
            >
              <div className="mb-2">
                {step.complete ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : (
                  <Circle className="h-6 w-6 text-slate-400" />
                )}
              </div>
              <div className="text-xs font-semibold text-slate-900 mb-1">
                {step.number}. {step.title}
              </div>
              <div className="text-xs text-slate-600">{step.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="mt-8">
        {currentStep === 1 && step1SubStep === 'governance' && (
          <GovernanceStep 
            orgId={status.orgId} 
            onComplete={() => {
              // After governance is complete, check if we need board members step
              if (boardTermData?.needsBoardMembers && !boardTermData?.boardMembersAssigned) {
                setStep1SubStep('board-members')
                // Reload to get updated board data
                window.location.reload()
              } else {
                handleStep1Complete()
              }
            }}
            validation={validation}
          />
        )}
        {currentStep === 1 && step1SubStep === 'board-members' && boardTermData && (
          <BoardMembersStep
            orgId={status.orgId}
            membershipId={status.membershipId}
            boardMemberCount={boardTermData.boardMemberCount}
            termStart={boardTermData.termStart}
            termEnd={boardTermData.termEnd}
            onComplete={handleStep1Complete}
            onBack={() => setStep1SubStep('governance')}
          />
        )}
        {currentStep === 2 && (
          <ConsentsStep
            orgId={status.orgId}
            missingConsents={status.missingConsents}
            onComplete={handleStep2Complete}
          />
        )}
        {currentStep === 3 && (
          <div className="space-y-6">
            <ReadinessChecklist orgId={status.orgId} />
            <WaitingStep
              orgId={status.orgId}
              orgName={status.orgName}
              activationStatus={status.activationStatus}
            />
          </div>
        )}
      </div>
    </div>
  )
}
