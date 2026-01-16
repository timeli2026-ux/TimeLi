'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  OnboardingData,
  ONBOARDING_STEPS,
  DEFAULT_ONBOARDING_DATA,
} from './types'

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
        // TODO: Implement onboarding submission in Plan 02/03
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
        <CardContent className="min-h-[300px] flex items-center justify-center">
          {/* Placeholder content for each step - will be replaced in Plans 02/03 */}
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

// Placeholder step content component - will be replaced with real components in Plans 02/03
interface StepContentProps {
  step: number
  formData: OnboardingData
  setFormData: React.Dispatch<React.SetStateAction<OnboardingData>>
}

function StepContent({ step }: StepContentProps) {
  const stepInfo = ONBOARDING_STEPS[step]

  return (
    <div className="text-center space-y-4">
      <div className="text-6xl">
        {step === 0 && '👋'}
        {step === 1 && '🌍'}
        {step === 2 && '😴'}
        {step === 3 && '🍽️'}
        {step === 4 && '🚗'}
        {step === 5 && '📅'}
        {step === 6 && '✅'}
      </div>
      <p className="text-muted-foreground">
        {stepInfo.name} step content will be implemented in Plan 02/03
      </p>
    </div>
  )
}
