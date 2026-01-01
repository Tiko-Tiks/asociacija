"use client"

import { useCallback, useRef } from 'react'
import { OnboardingStatus } from '@/app/actions/onboarding-status'
import { GovernanceStep } from './governance-step'
import { ConsentsStep } from './consents-step'
import { WaitingStep } from './waiting-step'
import { ReadinessChecklist } from './readiness-checklist'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, Circle } from 'lucide-react'

interface OnboardingWizardProps {
  status: OnboardingStatus
}

export function OnboardingWizard({ status }: OnboardingWizardProps) {
  const currentStep = status.currentStep || 1
  const isReloadingRef = useRef(false)

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
      description: 'Laukite CORE patvirtinimo',
      complete: status.step3Complete,
    },
  ]

  const handleStep1Complete = useCallback(() => {
    // Prevent multiple reloads
    if (isReloadingRef.current) {
      return
    }
    isReloadingRef.current = true
    // Refresh page to get updated status (will show step 2 after reload)
    window.location.reload()
  }, [])

  const handleStep2Complete = useCallback(() => {
    // Prevent multiple reloads
    if (isReloadingRef.current) {
      return
    }
    isReloadingRef.current = true
    // Refresh page to get updated status (will show step 3 after reload)
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
        {currentStep === 1 && (
          <GovernanceStep orgId={status.orgId} onComplete={handleStep1Complete} />
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

