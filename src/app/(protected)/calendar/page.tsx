'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar, CalendarX, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { WeekGrid } from '@/components/calendar/week-grid'
import { CompletionModal, type CompletionStatus } from '@/components/calendar/completion-modal'
import { RecalibrateDialog, type RecalibrateScope } from '@/components/calendar/recalibrate-dialog'
import { DashboardSidebar } from '@/components/calendar/dashboard-sidebar'
import { Chatbox } from '@/components/calendar/chatbox'
import { UsageIndicator } from '@/components/calendar/usage-indicator'
import type { ScheduleEventWithFlexibility, TimeSlot, SchedulerStats } from '@/lib/scheduling/types'
import {
  getWeekStart,
  formatWeekRange,
  addWeeks,
  isSameDay,
} from '@/lib/calendar-utils'

// Maximum weeks user can navigate into the future
const MAX_FUTURE_WEEKS = 4

/**
 * Format a Date to YYYY-MM-DD string
 */
function formatDateToString(date: Date): string {
  return date.toISOString().split('T')[0]
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function CalendarPage() {
  // Get current week's Monday as the baseline
  const currentWeekStart = useMemo(() => getWeekStart(new Date()), [])

  // State for the currently displayed week
  const [weekStart, setWeekStart] = useState(() => currentWeekStart)

  // Loading state for schedule fetching
  const [isLoading, setIsLoading] = useState(true)

  // Schedule events from API
  const [events, setEvents] = useState<ScheduleEventWithFlexibility[]>([])

  // Whether a schedule exists for the current week
  const [scheduleExists, setScheduleExists] = useState(false)

  // Error state
  const [error, setError] = useState<string | null>(null)

  // Schedule stats from API
  const [scheduleStats, setScheduleStats] = useState<SchedulerStats | undefined>(undefined)

  // Track completed events locally for dashboard updates
  const [completedEventIds, setCompletedEventIds] = useState<Set<string>>(new Set())

  // Completion modal state
  const [completionEvent, setCompletionEvent] = useState<ScheduleEventWithFlexibility | null>(null)

  // Recalibrate dialog state
  const [showRecalibrate, setShowRecalibrate] = useState(false)
  const [isRecalibrating, setIsRecalibrating] = useState(false)

  // Calculate navigation bounds
  const canGoBack = useMemo(() => {
    // Cannot go before current week
    return weekStart.getTime() > currentWeekStart.getTime()
  }, [weekStart, currentWeekStart])

  const canGoForward = useMemo(() => {
    // Cannot go more than MAX_FUTURE_WEEKS ahead
    const maxWeek = addWeeks(currentWeekStart, MAX_FUTURE_WEEKS)
    return weekStart.getTime() < maxWeek.getTime()
  }, [weekStart, currentWeekStart])

  const isCurrentWeek = useMemo(() => {
    return isSameDay(weekStart, currentWeekStart)
  }, [weekStart, currentWeekStart])

  // Navigation handlers
  const goToPreviousWeek = useCallback(() => {
    if (canGoBack) {
      setWeekStart((prev) => addWeeks(prev, -1))
    }
  }, [canGoBack])

  const goToNextWeek = useCallback(() => {
    if (canGoForward) {
      setWeekStart((prev) => addWeeks(prev, 1))
    }
  }, [canGoForward])

  const goToToday = useCallback(() => {
    setWeekStart(currentWeekStart)
  }, [currentWeekStart])

  // Load schedule from API
  const loadSchedule = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const weekStartStr = formatDateToString(weekStart)

    try {
      const response = await fetch(`/api/schedule/${weekStartStr}`)

      if (!response.ok) {
        if (response.status === 401) {
          setError('Please log in to view your schedule')
        } else {
          setError('Failed to load schedule')
        }
        setEvents([])
        setScheduleExists(false)
        return
      }

      const data = await response.json()

      if (data.exists && data.schedule?.events) {
        setEvents(data.schedule.events)
        setScheduleExists(true)
        setScheduleStats(data.schedule.stats)
      } else {
        setEvents([])
        setScheduleExists(false)
        setScheduleStats(undefined)
      }
    } catch {
      setError('Network error - please try again')
      setEvents([])
      setScheduleExists(false)
    } finally {
      setIsLoading(false)
    }
  }, [weekStart])

  // Load schedule on mount and week change
  useEffect(() => {
    loadSchedule()
  }, [loadSchedule])

  // Handle event click
  const handleEventClick = useCallback((event: ScheduleEventWithFlexibility) => {
    console.log('Event clicked:', event.title)
  }, [])

  // Handle event move (drag/drop)
  const handleEventMove = useCallback(async (eventId: string, newSlot: TimeSlot) => {
    // Find the event being moved
    const eventToMove = events.find((e) => e.id === eventId)
    if (!eventToMove) return

    // Don't allow moving locked events
    if (eventToMove.isLocked) {
      toast.error('Cannot move locked events')
      return
    }

    // Store original state for potential rollback
    const originalEvents = [...events]

    // Optimistic update
    const updatedEvents = events.map((e) =>
      e.id === eventId
        ? { ...e, slot: newSlot }
        : e
    )
    setEvents(updatedEvents)

    // Format time for toast
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':')
      const hour = parseInt(hours, 10)
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      const period = hour < 12 ? 'AM' : 'PM'
      return `${displayHour}:${minutes} ${period}`
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    toast.success(`Event moved to ${dayNames[newSlot.dayOfWeek]} at ${formatTime(newSlot.startTime)}`)

    // Call API to persist the change
    const weekStartStr = formatDateToString(weekStart)
    try {
      const response = await fetch('/api/schedule/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, newSlot, weekStart: weekStartStr }),
      })

      if (!response.ok) {
        // Revert on error
        setEvents(originalEvents)
        const error = await response.json()
        toast.error(error.error || 'Failed to move event')
      }
    } catch {
      // Revert on network error
      setEvents(originalEvents)
      toast.error('Network error - event not moved')
    }
  }, [events])

  // Handle mark complete action
  const handleMarkComplete = useCallback((event: ScheduleEventWithFlexibility) => {
    setCompletionEvent(event)
  }, [])

  // Handle completion submission
  const handleCompletion = useCallback(async (status: CompletionStatus, notes?: string) => {
    if (!completionEvent) return

    // Show toast based on status
    const statusLabels: Record<CompletionStatus, string> = {
      completed: 'completed',
      partial: 'partially completed',
      skipped: 'skipped',
    }
    toast.success(`Marked as ${statusLabels[status]}`)

    // Update local state to reflect completion (for dashboard updates)
    if (status === 'completed' || status === 'partial') {
      setCompletedEventIds(prev => new Set(prev).add(completionEvent.id))
    }

    // Call API to persist the completion
    const weekStartStr = formatDateToString(weekStart)
    try {
      const response = await fetch('/api/schedule/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: completionEvent.id,
          status,
          notes,
          weekStart: weekStartStr,
          goalId: completionEvent.goalId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || 'Failed to log completion')
      }
    } catch {
      toast.error('Network error - completion not logged')
    }
  }, [completionEvent, weekStart])

  // Generate initial schedule
  const handleGenerateSchedule = useCallback(async () => {
    setIsRecalibrating(true)
    setError(null)

    const weekStartStr = formatDateToString(weekStart)
    try {
      const response = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart: weekStartStr }),
      })

      if (response.status === 409) {
        const data = await response.json()
        toast.error(data.message || 'Schedule is infeasible - some goals cannot fit')
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 400 && errorData.error?.includes('onboarding')) {
          setError('Complete onboarding first to generate your schedule')
        } else {
          toast.error(errorData.error || 'Failed to generate schedule')
        }
        return
      }

      const data = await response.json()

      if (data.schedule?.events) {
        setEvents(data.schedule.events)
        setScheduleExists(true)
        setScheduleStats(data.stats)
        toast.success('Schedule generated!')
      }
    } catch {
      toast.error('Network error - please try again')
    } finally {
      setIsRecalibrating(false)
    }
  }, [weekStart])

  // Handle recalibration
  const handleRecalibrate = useCallback(async (scope: RecalibrateScope, feedback?: string) => {
    setIsRecalibrating(true)
    setShowRecalibrate(false)

    const weekStartStr = formatDateToString(weekStart)
    try {
      const response = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart: weekStartStr, scope, feedback }),
      })

      if (response.status === 409) {
        // Infeasibility - schedule cannot fit all goals
        const data = await response.json()
        toast.error(data.message || 'Schedule is infeasible - some goals cannot fit')
        return
      }

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || 'Failed to regenerate schedule')
        return
      }

      const data = await response.json()

      // Update events with the new schedule
      if (data.schedule?.events) {
        setEvents(data.schedule.events)
        setScheduleExists(true)
        setScheduleStats(data.stats)
        toast.success('Schedule regenerated')
      }
    } catch {
      toast.error('Network error - schedule not regenerated')
    } finally {
      setIsRecalibrating(false)
    }
  }, [weekStart])

  return (
    <div className="flex h-full">
      {/* Left Sidebar: Dashboard */}
      {scheduleExists && !isLoading && (
        <DashboardSidebar
          events={events}
          stats={scheduleStats}
          completedEventIds={completedEventIds}
          className="hidden lg:flex flex-shrink-0"
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with navigation */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold">
              Week of {formatWeekRange(weekStart)}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Usage indicator - shows trial status or usage */}
            <UsageIndicator />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRecalibrate(true)}
              disabled={isRecalibrating || !scheduleExists}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRecalibrating ? 'animate-spin' : ''}`} />
              Recalibrate
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              disabled={isCurrentWeek}
            >
              Today
            </Button>

            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={goToPreviousWeek}
                disabled={!canGoBack}
                aria-label="Previous week"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={goToNextWeek}
                disabled={!canGoForward}
                aria-label="Next week"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <CalendarSkeleton />
          ) : error ? (
            <ErrorState message={error} />
          ) : !scheduleExists ? (
            <EmptyState onGenerate={handleGenerateSchedule} isGenerating={isRecalibrating} />
          ) : (
            <WeekGrid
              weekStart={weekStart}
              events={events}
              onEventClick={handleEventClick}
              onEventMove={handleEventMove}
              onMarkComplete={handleMarkComplete}
              isLoading={isRecalibrating}
            />
          )}
        </div>
      </div>

      {/* Right Sidebar: Chatbox */}
      {scheduleExists && !isLoading && (
        <Chatbox
          weekStart={weekStart}
          onScheduleChange={loadSchedule}
          className="hidden lg:flex w-72 flex-col border-l bg-muted/30 flex-shrink-0"
        />
      )}

      {/* Completion Modal */}
      {completionEvent && (
        <CompletionModal
          event={completionEvent}
          open={!!completionEvent}
          onOpenChange={(open) => {
            if (!open) setCompletionEvent(null)
          }}
          onComplete={handleCompletion}
        />
      )}

      {/* Recalibrate Dialog */}
      <RecalibrateDialog
        open={showRecalibrate}
        onOpenChange={setShowRecalibrate}
        onConfirm={handleRecalibrate}
      />
    </div>
  )
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

/**
 * Loading skeleton for calendar grid
 */
function CalendarSkeleton() {
  return (
    <div className="h-full flex flex-col animate-pulse">
      {/* Header skeleton */}
      <div className="flex border-b border-border">
        <div className="w-[60px] h-12 bg-muted/50" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-1 h-12 border-l border-border bg-muted/30" />
        ))}
      </div>
      {/* Grid skeleton with event placeholders */}
      <div className="flex-1 flex">
        <div className="w-[60px] bg-muted/20" />
        <div className="flex-1 flex">
          {Array.from({ length: 7 }).map((_, dayIndex) => (
            <div key={dayIndex} className="flex-1 border-l border-border relative">
              {/* Random event placeholders */}
              {dayIndex < 5 && (
                <>
                  <div
                    className="absolute left-1 right-1 bg-muted/40 rounded"
                    style={{
                      top: `${50 + dayIndex * 20}px`,
                      height: '48px',
                    }}
                  />
                  {dayIndex % 2 === 0 && (
                    <div
                      className="absolute left-1 right-1 bg-muted/30 rounded"
                      style={{
                        top: `${150 + dayIndex * 30}px`,
                        height: '64px',
                      }}
                    />
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// ERROR STATE
// =============================================================================

/**
 * Error state when schedule fails to load
 */
function ErrorState({ message }: { message: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <CalendarX className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-lg font-medium mb-2">Unable to load schedule</h2>
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
    </div>
  )
}

// =============================================================================
// EMPTY STATE
// =============================================================================

/**
 * Empty state when no schedule exists - with generate button
 */
function EmptyState({
  onGenerate,
  isGenerating,
}: {
  onGenerate: () => void
  isGenerating: boolean
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
      <h2 className="text-lg font-medium mb-2">No schedule yet</h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Generate a schedule based on your goals and preferences.
      </p>
      <Button onClick={onGenerate} disabled={isGenerating}>
        {isGenerating ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            Generate Schedule
          </>
        )}
      </Button>
    </div>
  )
}
