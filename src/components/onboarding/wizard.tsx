'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  OnboardingData,
  ONBOARDING_STEPS,
  DEFAULT_ONBOARDING_DATA,
} from './types'
import { TimezoneStep } from './steps/timezone-step'
import { SleepStep } from './steps/sleep-step'
import { MealsStep } from './steps/meals-step'
import { BufferStep } from './steps/buffer-step'

interface WizardProps {
  initialStep?: number
}

export function OnboardingWizard({ initialStep = 0 }: WizardProps) {
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [formData, setFormData] = useState<OnboardingData>(DEFAULT_ONBOARDING_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1
  const currentStepInfo = ONBOARDING_STEPS[currentStep]

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleNext = async () => {
    if (isLastStep) {
      // Submit onboarding data
      setIsSubmitting(true)
      try {
        // TODO: Implement onboarding submission in Plan 03
        console.log('Submitting onboarding data:', formData)
        // After successful submission, redirect to dashboard
      } catch (error) {
        console.error('Error submitting onboarding:', error)
      } finally {
        setIsSubmitting(false)
      }
    } else {
      setCurrentStep((prev) => prev + 1)
    }
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
          <StepContent step={currentStep} formData={formData} setFormData={setFormData} />
        </CardContent>

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
}

function StepContent({ step, formData, setFormData }: StepContentProps) {
  const stepInfo = ONBOARDING_STEPS[step]

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
        meals={{
          breakfast: {
            start: formData.mealBreakfastStart,
            duration: formData.mealBreakfastDuration,
          },
          lunch: {
            start: formData.mealLunchStart,
            duration: formData.mealLunchDuration,
          },
          dinner: {
            start: formData.mealDinnerStart,
            duration: formData.mealDinnerDuration,
          },
        }}
        onChange={(meals) =>
          setFormData((prev) => ({
            ...prev,
            mealBreakfastStart: meals.breakfast.start,
            mealBreakfastDuration: meals.breakfast.duration,
            mealLunchStart: meals.lunch.start,
            mealLunchDuration: meals.lunch.duration,
            mealDinnerStart: meals.dinner.start,
            mealDinnerDuration: meals.dinner.duration,
          }))
        }
      />
    )
  }

  // Step 4: Buffer
  if (step === 4) {
    return (
      <BufferStep
        bufferMinutes={formData.bufferMinutes}
        onChange={(bufferMinutes) => setFormData((prev) => ({ ...prev, bufferMinutes }))}
      />
    )
  }

  // Steps 5-7: Placeholders for Plan 03
  return (
    <div className="text-center space-y-4">
      <p className="text-muted-foreground">
        {stepInfo.name} step content will be implemented in Plan 03
      </p>
    </div>
  )
}
