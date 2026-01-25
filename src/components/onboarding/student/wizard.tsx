'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  StudentOnboardingData,
  CourseInput,
  AssignmentInput,
  STUDENT_ONBOARDING_STEPS,
  DEFAULT_STUDENT_ONBOARDING_DATA,
  DEFAULT_COURSE_COLOR,
  getCurrentSemester,
} from './types'
import { BasicsStep } from './steps/basics-step'
import { ClassesStep } from './steps/classes-step'

interface StudentWizardProps {
  initialStep?: number
}

export function StudentOnboardingWizard({ initialStep = 0 }: StudentWizardProps) {
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [formData, setFormData] = useState<StudentOnboardingData>(DEFAULT_STUDENT_ONBOARDING_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === STUDENT_ONBOARDING_STEPS.length - 1
  const currentStepInfo = STUDENT_ONBOARDING_STEPS[currentStep]

  // Navigation handlers
  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1)
      setError(null)
    }
  }

  const handleNext = async () => {
    setError(null)

    // Validation for Classes step - require at least one course
    if (currentStep === 1 && formData.courses.length === 0) {
      setError('Please add at least one class to continue.')
      return
    }

    if (isLastStep) {
      // Submit onboarding data
      setIsSubmitting(true)
      try {
        const response = await fetch('/api/onboarding/student/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timezone: formData.timezone,
            sleepStart: formData.sleepStart,
            sleepEnd: formData.sleepEnd,
            courses: formData.courses,
            assignments: formData.assignments,
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

  // Course handlers
  const handleAddCourse = (course: Omit<CourseInput, 'id'>) => {
    const newCourse: CourseInput = {
      ...course,
      id: crypto.randomUUID(),
    }
    setFormData((prev) => ({
      ...prev,
      courses: [...prev.courses, newCourse],
    }))
  }

  const handleRemoveCourse = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      courses: prev.courses.filter((c) => c.id !== id),
      // Also remove assignments linked to this course
      assignments: prev.assignments.filter((a) => a.courseId !== id),
    }))
  }

  // Assignment handlers (for future steps)
  const handleAddAssignment = (assignment: Omit<AssignmentInput, 'id'>) => {
    const newAssignment: AssignmentInput = {
      ...assignment,
      id: crypto.randomUUID(),
    }
    setFormData((prev) => ({
      ...prev,
      assignments: [...prev.assignments, newAssignment],
    }))
  }

  const handleRemoveAssignment = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      assignments: prev.assignments.filter((a) => a.id !== id),
    }))
  }

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        // Basics: Timezone + Sleep
        return (
          <BasicsStep
            timezone={formData.timezone}
            sleepStart={formData.sleepStart}
            sleepEnd={formData.sleepEnd}
            onTimezoneChange={(timezone) => setFormData((prev) => ({ ...prev, timezone }))}
            onSleepStartChange={(sleepStart) => setFormData((prev) => ({ ...prev, sleepStart }))}
            onSleepEndChange={(sleepEnd) => setFormData((prev) => ({ ...prev, sleepEnd }))}
          />
        )

      case 1:
        // Classes: Add courses
        return (
          <ClassesStep
            courses={formData.courses}
            onAddCourse={handleAddCourse}
            onRemoveCourse={handleRemoveCourse}
            semester={getCurrentSemester()}
          />
        )

      case 2:
        // Assignments: Placeholder for Plan 02
        return (
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold">Add Your Assignments</h2>
            <p className="text-muted-foreground max-w-md">
              This step is coming soon. For now, you can skip ahead.
            </p>
          </div>
        )

      case 3:
        // Generate: Placeholder for Plan 02
        return (
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold">Generate Your Schedule</h2>
            <p className="text-muted-foreground max-w-md">
              This step is coming soon. For now, click Complete to finish.
            </p>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        {/* Step Indicator */}
        <CardHeader className="border-b">
          <div className="flex items-center justify-center gap-2 mb-4">
            {STUDENT_ONBOARDING_STEPS.map((step) => (
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
          {renderStepContent()}
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
            {currentStep + 1} of {STUDENT_ONBOARDING_STEPS.length}
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
