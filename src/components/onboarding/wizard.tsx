'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  OnboardingData,
  FixedCommitment,
  InitialGoal,
  LifeRealm,
  ONBOARDING_STEPS,
  DEFAULT_ONBOARDING_DATA,
} from './types'
import { TimezoneStep } from './steps/timezone-step'
import { SleepStep } from './steps/sleep-step'
import { MealsStep } from './steps/meals-step'
import { CommuteStep } from './steps/commute-step'
import { CommitmentsStep } from './steps/commitments-step'
import { RealmsStep } from './steps/realms-step'
import { ActionsStep } from './steps/actions-step'

interface WizardProps {
  initialStep?: number
}

export function OnboardingWizard({ initialStep = 0 }: WizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [formData, setFormData] = useState<OnboardingData>(DEFAULT_ONBOARDING_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1
  const currentStepInfo = ONBOARDING_STEPS[currentStep]

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1)
      setError(null)
    }
  }

  const handleNext = async () => {
    setError(null)

    if (isLastStep) {
      // Submit onboarding data
      setIsSubmitting(true)
      try {
        const response = await fetch('/api/onboarding/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            preferences: {
              timezone: formData.timezone,
              sleepStart: formData.sleepStart,
              sleepEnd: formData.sleepEnd,
              mealsVariable: formData.mealsVariable,
              meals: formData.mealsVariable ? [] : formData.meals.filter((m) => m.enabled).map((m) => ({
                name: m.name,
                start: m.start,
                duration: m.duration,
              })),
              commuteMorningStart: formData.hasCommute ? formData.commuteMorningStart : null,
              commuteMorningDuration: formData.hasCommute ? formData.commuteMorningDuration : null,
              commuteEveningStart: formData.hasCommute ? formData.commuteEveningStart : null,
              commuteEveningDuration: formData.hasCommute ? formData.commuteEveningDuration : null,
            },
            commitments: formData.fixedCommitments.map((c) => ({
              title: c.title,
              dayOfWeek: c.dayOfWeek,
              startTime: c.startTime,
              endTime: c.endTime,
            })),
            realms: formData.realms.map((r) => ({
              id: r.id,
              name: r.name,
              icon: r.icon,
              isCustom: r.isCustom,
            })),
            actions: formData.goals.map((g) => ({
              title: g.title,
              realmId: g.realmId,
              timesPerWeek: g.timesPerWeek,
              minutesPerSession: g.minutesPerSession,
              hoursPerWeek: g.hoursPerWeek,
            })),
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to complete onboarding')
        }

        // Redirect to dashboard on success (hard redirect to ensure middleware runs)
        window.location.href = '/dashboard'
      } catch (err) {
        console.error('Error submitting onboarding:', err)
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
        setIsSubmitting(false)
      }
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  // Commitment handlers
  const handleAddCommitment = (commitment: Omit<FixedCommitment, 'id'>) => {
    const newCommitment: FixedCommitment = {
      ...commitment,
      id: crypto.randomUUID(),
    }
    setFormData((prev) => ({
      ...prev,
      fixedCommitments: [...prev.fixedCommitments, newCommitment],
    }))
  }

  const handleRemoveCommitment = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      fixedCommitments: prev.fixedCommitments.filter((c) => c.id !== id),
    }))
  }

  // Goal handlers
  const handleAddGoal = (goal: Omit<InitialGoal, 'id'>) => {
    const newGoal: InitialGoal = {
      ...goal,
      id: crypto.randomUUID(),
    }
    setFormData((prev) => ({
      ...prev,
      goals: [...prev.goals, newGoal],
    }))
  }

  const handleRemoveGoal = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== id),
    }))
  }

  // Realm handlers
  const handleAddRealm = (realm: Omit<LifeRealm, 'id'>) => {
    const newRealm: LifeRealm = {
      ...realm,
      id: crypto.randomUUID(),
    }
    setFormData((prev) => ({
      ...prev,
      realms: [...prev.realms, newRealm],
    }))
  }

  const handleRemoveRealm = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      realms: prev.realms.filter((r) => r.id !== id),
      // Also remove goals associated with this realm
      goals: prev.goals.filter((g) => g.realmId !== id),
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        {/* Step Indicator */}
        <CardHeader className="border-b">
          <div className="flex items-center justify-center gap-2 mb-4">
            {ONBOARDING_STEPS.map((step) => (
              <div
                key={step.id}
                className={`w-3 h-3 rounded-full transition-colors ${
                  step.id === currentStep
                    ? 'bg-primary'
                    : step.id < currentStep
                    ? 'bg-primary/50'
                    : 'bg-muted'
                }`}
                aria-label={`Step ${step.id + 1}: ${step.name}`}
              />
            ))}
          </div>
          <CardTitle className="text-center">
            Step {currentStep + 1}: {currentStepInfo.name}
          </CardTitle>
          <CardDescription className="text-center">
            {currentStepInfo.description}
          </CardDescription>
        </CardHeader>

        {/* Step Content */}
        <CardContent className="min-h-[300px] flex items-center justify-center py-8">
          <StepContent
            step={currentStep}
            formData={formData}
            setFormData={setFormData}
            onAddCommitment={handleAddCommitment}
            onRemoveCommitment={handleRemoveCommitment}
            onAddRealm={handleAddRealm}
            onRemoveRealm={handleRemoveRealm}
            onAddGoal={handleAddGoal}
            onRemoveGoal={handleRemoveGoal}
          />
        </CardContent>

        {/* Error Message */}
        {error && (
          <div className="px-6 pb-4">
            <p className="text-sm text-destructive text-center">{error}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center px-6 pb-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isFirstStep || isSubmitting}
          >
            Back
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentStep + 1} of {ONBOARDING_STEPS.length}
          </span>
          <Button
            onClick={handleNext}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : isLastStep ? 'Complete' : 'Next'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

// Step content component that renders the appropriate step
interface StepContentProps {
  step: number
  formData: OnboardingData
  setFormData: React.Dispatch<React.SetStateAction<OnboardingData>>
  onAddCommitment: (commitment: Omit<FixedCommitment, 'id'>) => void
  onRemoveCommitment: (id: string) => void
  onAddRealm: (realm: Omit<LifeRealm, 'id'>) => void
  onRemoveRealm: (id: string) => void
  onAddGoal: (goal: Omit<InitialGoal, 'id'>) => void
  onRemoveGoal: (id: string) => void
}

function StepContent({
  step,
  formData,
  setFormData,
  onAddCommitment,
  onRemoveCommitment,
  onAddRealm,
  onRemoveRealm,
  onAddGoal,
  onRemoveGoal,
}: StepContentProps) {
  // Step 0: Welcome
  if (step === 0) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-semibold">Welcome to TimeLi!</h2>
        <p className="text-muted-foreground max-w-md">
          Let&apos;s set up your schedule preferences. This will help us create a personalized
          weekly schedule that respects your constraints and helps you achieve your goals.
        </p>
        <p className="text-sm text-muted-foreground">
          This only takes a few minutes.
        </p>
      </div>
    )
  }

  // Step 1: Timezone
  if (step === 1) {
    return (
      <TimezoneStep
        value={formData.timezone}
        onChange={(timezone) => setFormData((prev) => ({ ...prev, timezone }))}
      />
    )
  }

  // Step 2: Sleep
  if (step === 2) {
    return (
      <SleepStep
        sleepStart={formData.sleepStart}
        sleepEnd={formData.sleepEnd}
        onSleepStartChange={(sleepStart) => setFormData((prev) => ({ ...prev, sleepStart }))}
        onSleepEndChange={(sleepEnd) => setFormData((prev) => ({ ...prev, sleepEnd }))}
      />
    )
  }

  // Step 3: Meals
  if (step === 3) {
    return (
      <MealsStep
        meals={formData.meals}
        isVariable={formData.mealsVariable}
        onChange={(meals, isVariable) =>
          setFormData((prev) => ({
            ...prev,
            meals,
            mealsVariable: isVariable,
          }))
        }
      />
    )
  }

  // Step 4: Commute
  if (step === 4) {
    return (
      <CommuteStep
        commute={{
          hasCommute: formData.hasCommute,
          morningStart: formData.commuteMorningStart,
          morningDuration: formData.commuteMorningDuration,
          eveningStart: formData.commuteEveningStart,
          eveningDuration: formData.commuteEveningDuration,
        }}
        onChange={(commute) =>
          setFormData((prev) => ({
            ...prev,
            hasCommute: commute.hasCommute,
            commuteMorningStart: commute.morningStart,
            commuteMorningDuration: commute.morningDuration,
            commuteEveningStart: commute.eveningStart,
            commuteEveningDuration: commute.eveningDuration,
          }))
        }
      />
    )
  }

  // Step 5: Fixed Commitments
  if (step === 5) {
    return (
      <CommitmentsStep
        commitments={formData.fixedCommitments}
        onAdd={onAddCommitment}
        onRemove={onRemoveCommitment}
      />
    )
  }

  // Step 6: Life Realms
  if (step === 6) {
    return (
      <RealmsStep
        realms={formData.realms}
        onAdd={onAddRealm}
        onRemove={onRemoveRealm}
      />
    )
  }

  // Step 7: Actions & Habits
  if (step === 7) {
    return (
      <ActionsStep
        realms={formData.realms}
        actions={formData.goals}
        onAdd={onAddGoal}
        onRemove={onRemoveGoal}
      />
    )
  }

  // Fallback
  return null
}
