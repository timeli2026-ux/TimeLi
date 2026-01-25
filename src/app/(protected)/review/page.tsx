'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CompletionSummary } from '@/components/review/completion-summary'
import { PreferenceSuggestions } from '@/components/review/preference-suggestions'
import { ChevronLeft, ChevronRight, Pencil, CalendarDays } from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

interface ProductiveTime {
  hour: number
  label: string
  count: number
}

interface RealmCompletion {
  realmId: string
  realmName: string
  completed: number
  skipped: number
  partial: number
  total: number
  completionRate: number
}

interface ReviewStats {
  totalScheduled: number
  completed: number
  skipped: number
  partial: number
  completionRate: number
}

interface ReviewData {
  stats: ReviewStats
  completionsByRealm: RealmCompletion[]
  productiveTimes: ProductiveTime[]
  weekStart: string
  notes: string | null
}

// =============================================================================
// HELPERS
// =============================================================================

function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + 6)

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' })
  const startDay = start.getDate()
  const endDay = end.getDate()
  const year = start.getFullYear()

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
}

function getPreviousWeekStart(weekStart: string): string {
  const date = new Date(weekStart + 'T00:00:00')
  date.setDate(date.getDate() - 7)
  return date.toISOString().split('T')[0]
}

function getNextWeekStart(weekStart: string): string {
  const date = new Date(weekStart + 'T00:00:00')
  date.setDate(date.getDate() + 7)
  return date.toISOString().split('T')[0]
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function ReviewPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ReviewData | null>(null)
  const [weekStart, setWeekStart] = useState<string>(() => {
    // Default to last completed week
    const now = new Date()
    const currentWeekStart = getWeekStart(now)
    const lastWeek = new Date(currentWeekStart)
    lastWeek.setDate(lastWeek.getDate() - 7)
    return lastWeek.toISOString().split('T')[0]
  })

  // Notes state
  const [notes, setNotes] = useState('')
  const [notesChanged, setNotesChanged] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)

  // Current week start for comparison (can't review current/future weeks)
  const currentWeekStart = getWeekStart(new Date())

  // Check if selected week is in the future (can't review)
  const isCurrentOrFuture = weekStart >= currentWeekStart

  // Fetch review data
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/review?weekStart=${weekStart}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch review data')
      }

      const reviewData: ReviewData = await response.json()
      setData(reviewData)
      setNotes(reviewData.notes || '')
      setNotesChanged(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Save notes (debounced auto-save on blur)
  const saveNotes = useCallback(async () => {
    if (!notesChanged) return

    setSavingNotes(true)
    try {
      const response = await fetch('/api/review/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart, notes })
      })

      if (!response.ok) {
        console.error('Failed to save notes')
      } else {
        setNotesChanged(false)
      }
    } catch (err) {
      console.error('Failed to save notes:', err)
    } finally {
      setSavingNotes(false)
    }
  }, [weekStart, notes, notesChanged])

  // Navigate weeks
  const goToPreviousWeek = () => {
    setWeekStart(getPreviousWeekStart(weekStart))
  }

  const goToNextWeek = () => {
    const next = getNextWeekStart(weekStart)
    if (next < currentWeekStart) {
      setWeekStart(next)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with week selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Weekly Review</h1>
          <p className="text-muted-foreground">
            Reflect on your progress and discover patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousWeek}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-background min-w-[200px] justify-center">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {formatWeekRange(weekStart)}
            </span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextWeek}
            disabled={getNextWeekStart(weekStart) >= currentWeekStart}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Warning for current/future weeks */}
      {isCurrentOrFuture && (
        <Card className="border-yellow-500/50 bg-yellow-50/10">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              You can only review completed weeks. Select a previous week to see your review.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {loading && !isCurrentOrFuture && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-8">
                <Skeleton className="h-24 w-24" />
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <Card className="border-destructive">
          <CardContent className="py-6">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" className="mt-4" onClick={fetchData}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Data display */}
      {!loading && !error && data && !isCurrentOrFuture && (
        <>
          {/* Empty state */}
          {data.stats.totalScheduled === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No events this week</h3>
                <p className="text-muted-foreground">
                  There were no scheduled events marked as completed, skipped, or partial for this week.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Completion Summary */}
              <CompletionSummary
                stats={data.stats}
                completionsByRealm={data.completionsByRealm}
                productiveTimes={data.productiveTimes}
              />

              {/* Suggestions */}
              <PreferenceSuggestions
                stats={data.stats}
                completionsByRealm={data.completionsByRealm}
                productiveTimes={data.productiveTimes}
              />
            </>
          )}

          {/* Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                Weekly Reflection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="What went well this week? What would you like to improve? Any notes for future reference..."
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value)
                  setNotesChanged(true)
                }}
                onBlur={saveNotes}
                className="min-h-[120px] resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  Notes auto-save when you click away
                </p>
                {savingNotes && (
                  <span className="text-xs text-muted-foreground">Saving...</span>
                )}
                {notesChanged && !savingNotes && (
                  <span className="text-xs text-muted-foreground">Unsaved changes</span>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
