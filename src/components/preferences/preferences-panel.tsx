'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SchedulePreferencesForm, type PreferencesFormData } from './schedule-preferences-form'

// =============================================================================
// TYPES
// =============================================================================

type LoadingState = 'loading' | 'error' | 'success'

// =============================================================================
// SKELETON COMPONENT
// =============================================================================

function PreferencesFormSkeleton() {
  return (
    <div className="space-y-6">
      {/* Sleep Schedule Card Skeleton */}
      <Card>
        <CardContent className="py-6">
          <div className="space-y-4">
            <div className="h-6 bg-muted rounded w-1/4 animate-pulse" />
            <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
                <div className="h-10 bg-muted rounded animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
                <div className="h-10 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Energy Profile Card Skeleton */}
      <Card>
        <CardContent className="py-6">
          <div className="space-y-4">
            <div className="h-6 bg-muted rounded w-1/4 animate-pulse" />
            <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
            <div className="space-y-3 mt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-4 w-4 bg-muted rounded-full animate-pulse" />
                  <div className="h-12 bg-muted rounded flex-1 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meals Card Skeleton */}
      <Card>
        <CardContent className="py-6">
          <div className="space-y-4">
            <div className="h-6 bg-muted rounded w-1/4 animate-pulse" />
            <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Commute Card Skeleton */}
      <Card>
        <CardContent className="py-6">
          <div className="space-y-4">
            <div className="h-6 bg-muted rounded w-1/4 animate-pulse" />
            <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Buffer Card Skeleton */}
      <Card>
        <CardContent className="py-6">
          <div className="space-y-4">
            <div className="h-6 bg-muted rounded w-1/4 animate-pulse" />
            <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
            <div className="h-8 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PreferencesPanel() {
  const [loadingState, setLoadingState] = useState<LoadingState>('loading')
  const [preferences, setPreferences] = useState<PreferencesFormData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    setLoadingState('loading')
    setErrorMessage('')

    try {
      const response = await fetch('/api/preferences')

      if (!response.ok) {
        if (response.status === 404) {
          setErrorMessage('No preferences found. Please complete onboarding first.')
        } else {
          setErrorMessage('Failed to load preferences. Please try again.')
        }
        setLoadingState('error')
        return
      }

      const data = await response.json()
      setPreferences(data)
      setLoadingState('success')
    } catch (error) {
      console.error('Error fetching preferences:', error)
      setErrorMessage('Failed to connect to the server. Please try again.')
      setLoadingState('error')
    }
  }, [])

  // Fetch on mount
  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  // Handle form submission
  const handleSubmit = async (data: PreferencesFormData) => {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save preferences')
      }

      const updatedPreferences = await response.json()
      setPreferences(updatedPreferences)
      toast.success('Preferences saved successfully')
    } catch (error) {
      console.error('Error saving preferences:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save preferences')
      throw error // Re-throw to let the form know submission failed
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (loadingState === 'loading') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading preferences...</span>
        </div>
        <PreferencesFormSkeleton />
      </div>
    )
  }

  // Error state
  if (loadingState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <p className="text-destructive">{errorMessage}</p>
        <Button onClick={fetchPreferences} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    )
  }

  // Success state with form
  if (loadingState === 'success' && preferences) {
    return (
      <SchedulePreferencesForm
        initialData={preferences}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    )
  }

  return null
}
