'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar, CalendarX, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { WeekGrid } from '@/components/calendar/week-grid'
import { CompletionModal, type CompletionStatus } from '@/components/calendar/completion-modal'
import { RecalibrateDialog, type RecalibrateScope } from '@/components/calendar/recalibrate-dialog'
import type { ScheduleEventWithFlexibility, TimeSlot } from '@/lib/scheduling/types'
import {
  getWeekStart,
  formatWeekRange,
  addWeeks,
  isSameDay,
} from '@/lib/calendar-utils'

// Maximum weeks user can navigate into the future
const MAX_FUTURE_WEEKS = 4

// =============================================================================
// MOCK DATA FOR TESTING
// =============================================================================

/**
 * Generate mock schedule data for testing the calendar display
 * This will be replaced with real data from the API in Plan 06-03
 */
function generateMockEvents(): ScheduleEventWithFlexibility[] {
  return [
    // Monday - Locked events
    {
      id: 'evt_sleep_mon',
      type: 'sleep',
      title: 'Sleep',
      slot: {
        dayOfWeek: 1, // Monday
        startTime: '06:00',
        endTime: '07:00',
        durationMinutes: 60,
      },
      isLocked: true,
      flexibility: {
        level: 'low',
        alternativeSlots: 0,
        explanation: 'Fixed sleep schedule',
        canReschedule: false,
      },
    },
    {
      id: 'evt_commute_mon',
      type: 'commute',
      title: 'Morning Commute',
      slot: {
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '08:45',
        durationMinutes: 45,
      },
      isLocked: true,
      flexibility: {
        level: 'low',
        alternativeSlots: 0,
        explanation: 'Fixed commute time',
        canReschedule: false,
      },
    },
    {
      id: 'evt_meeting_mon',
      type: 'fixed',
      title: 'Team Standup',
      slot: {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '09:30',
        durationMinutes: 30,
      },
      isLocked: true,
      flexibility: {
        level: 'low',
        alternativeSlots: 0,
        explanation: 'Recurring team meeting',
        canReschedule: false,
      },
    },
    // Monday - Goal events
    {
      id: 'evt_deepwork_mon',
      type: 'goal',
      title: 'Deep Work: Project Alpha',
      slot: {
        dayOfWeek: 1,
        startTime: '10:00',
        endTime: '11:30',
        durationMinutes: 90,
      },
      goalId: 'goal_1',
      realmId: 'career',
      isLocked: false,
      cognitiveLoad: 'high',
      rationale: {
        primary: 'Peak energy after morning routine',
        secondary: 'Your chronotype shows high focus at this time',
        factors: ['Energy peak', 'Clear calendar', 'No meetings nearby'],
      },
      flexibility: {
        level: 'high',
        alternativeSlots: 6,
        explanation: 'Multiple slots available this week',
        canReschedule: true,
      },
    },
    {
      id: 'evt_lunch_mon',
      type: 'meal',
      title: 'Lunch',
      slot: {
        dayOfWeek: 1,
        startTime: '12:00',
        endTime: '12:45',
        durationMinutes: 45,
      },
      isLocked: true,
      flexibility: {
        level: 'low',
        alternativeSlots: 0,
        explanation: 'Fixed lunch time',
        canReschedule: false,
      },
    },
    {
      id: 'evt_learning_mon',
      type: 'goal',
      title: 'Learn TypeScript',
      slot: {
        dayOfWeek: 1,
        startTime: '14:00',
        endTime: '15:00',
        durationMinutes: 60,
      },
      goalId: 'goal_2',
      realmId: 'learning',
      isLocked: false,
      cognitiveLoad: 'medium',
      rationale: {
        primary: 'Low-energy slot after lunch',
        secondary: 'Reading and tutorials work well during afternoon dip',
        factors: ['Post-lunch', 'Medium cognitive load'],
      },
      flexibility: {
        level: 'medium',
        alternativeSlots: 3,
        explanation: 'A few alternative slots available',
        canReschedule: true,
      },
    },
    // Tuesday - Mix of events
    {
      id: 'evt_gym_tue',
      type: 'goal',
      title: 'Gym - Strength Training',
      slot: {
        dayOfWeek: 2,
        startTime: '07:00',
        endTime: '08:00',
        durationMinutes: 60,
      },
      goalId: 'goal_3',
      realmId: 'health',
      isLocked: false,
      cognitiveLoad: 'low',
      rationale: {
        primary: 'Morning exercise boosts energy',
        secondary: 'Physical activity before desk work improves focus',
        factors: ['Morning slot', 'Exercise-first habit'],
      },
      flexibility: {
        level: 'low',
        alternativeSlots: 1,
        explanation: 'Limited gym availability',
        canReschedule: true,
      },
    },
    {
      id: 'evt_meeting_tue',
      type: 'fixed',
      title: '1:1 with Manager',
      slot: {
        dayOfWeek: 2,
        startTime: '10:00',
        endTime: '10:30',
        durationMinutes: 30,
      },
      isLocked: true,
      flexibility: {
        level: 'low',
        alternativeSlots: 0,
        explanation: 'Recurring 1:1 meeting',
        canReschedule: false,
      },
    },
    {
      id: 'evt_creative_tue',
      type: 'goal',
      title: 'Creative Writing',
      slot: {
        dayOfWeek: 2,
        startTime: '16:00',
        endTime: '17:30',
        durationMinutes: 90,
      },
      goalId: 'goal_4',
      realmId: 'creativity',
      isLocked: false,
      cognitiveLoad: 'medium',
      rationale: {
        primary: 'Creative work in afternoon energy window',
        secondary: 'Second energy peak after mid-afternoon',
        factors: ['Energy recovery', 'Creative flow time'],
      },
      flexibility: {
        level: 'high',
        alternativeSlots: 4,
        explanation: 'Flexible goal with multiple options',
        canReschedule: true,
      },
    },
    // Wednesday
    {
      id: 'evt_finance_wed',
      type: 'goal',
      title: 'Budget Review',
      slot: {
        dayOfWeek: 3,
        startTime: '09:00',
        endTime: '09:45',
        durationMinutes: 45,
      },
      goalId: 'goal_5',
      realmId: 'finance',
      isLocked: false,
      cognitiveLoad: 'medium',
      rationale: {
        primary: 'Fresh mind for numbers',
        secondary: 'Financial tasks need focus but not creativity',
        factors: ['Morning clarity', 'Analytical time'],
      },
      flexibility: {
        level: 'medium',
        alternativeSlots: 2,
        explanation: 'Can move to similar morning slots',
        canReschedule: true,
      },
    },
    {
      id: 'evt_meditation_wed',
      type: 'goal',
      title: 'Meditation',
      slot: {
        dayOfWeek: 3,
        startTime: '12:30',
        endTime: '13:00',
        durationMinutes: 30,
      },
      goalId: 'goal_6',
      realmId: 'spiritual',
      isLocked: false,
      cognitiveLoad: 'low',
      rationale: {
        primary: 'Mid-day reset before afternoon',
        factors: ['Stress relief', 'Energy reset'],
      },
      flexibility: {
        level: 'high',
        alternativeSlots: 5,
        explanation: 'Can meditate anytime',
        canReschedule: true,
      },
    },
    // Thursday
    {
      id: 'evt_personal_thu',
      type: 'goal',
      title: 'Personal Admin',
      slot: {
        dayOfWeek: 4,
        startTime: '11:00',
        endTime: '11:45',
        durationMinutes: 45,
      },
      goalId: 'goal_7',
      realmId: 'personal',
      isLocked: false,
      cognitiveLoad: 'low',
      rationale: {
        primary: 'Light tasks before lunch',
        secondary: 'Administrative work fits low-energy slots',
        factors: ['Pre-lunch slot', 'Low mental load'],
      },
      flexibility: {
        level: 'high',
        alternativeSlots: 8,
        explanation: 'Very flexible goal',
        canReschedule: true,
      },
    },
    // Friday
    {
      id: 'evt_relationships_fri',
      type: 'goal',
      title: 'Call Mom',
      slot: {
        dayOfWeek: 5,
        startTime: '17:00',
        endTime: '17:30',
        durationMinutes: 30,
      },
      goalId: 'goal_8',
      realmId: 'relationships',
      isLocked: false,
      cognitiveLoad: 'low',
      rationale: {
        primary: 'End of week connection time',
        secondary: 'Winding down for the weekend',
        factors: ['Friday evening', 'Social time'],
      },
      flexibility: {
        level: 'medium',
        alternativeSlots: 2,
        explanation: 'Depends on availability',
        canReschedule: true,
      },
    },
  ]
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function CalendarPage() {
  // Get current week's Monday as the baseline
  const currentWeekStart = useMemo(() => getWeekStart(new Date()), [])

  // State for the currently displayed week
  const [weekStart, setWeekStart] = useState(() => currentWeekStart)

  // Loading state placeholder for future schedule fetching
  const [isLoading, setIsLoading] = useState(false)

  // Mock events - will be replaced with API data
  const [events, setEvents] = useState<ScheduleEventWithFlexibility[]>([])

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

  // Load mock events on mount and week change
  useEffect(() => {
    console.log('Week changed to:', weekStart.toISOString())
    setIsLoading(true)

    // Simulate loading with mock data
    const timer = setTimeout(() => {
      // Only show events for current week (mock data uses current week days)
      if (isSameDay(weekStart, currentWeekStart)) {
        setEvents(generateMockEvents())
      } else {
        // Empty schedule for other weeks (would be fetched from API)
        setEvents([])
      }
      setIsLoading(false)
    }, 200)

    return () => clearTimeout(timer)
  }, [weekStart, currentWeekStart])

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

    // Call API (for validation/logging, not persisted yet)
    try {
      const response = await fetch('/api/schedule/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, newSlot }),
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

    // Call API (for logging, not persisted yet)
    try {
      const response = await fetch('/api/schedule/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: completionEvent.id,
          status,
          notes,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || 'Failed to log completion')
      }
    } catch {
      toast.error('Network error - completion not logged')
    }
  }, [completionEvent])

  // Handle recalibration
  const handleRecalibrate = useCallback(async (scope: RecalibrateScope) => {
    setIsRecalibrating(true)
    setShowRecalibrate(false)

    try {
      const response = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
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
        toast.success('Schedule regenerated')
      }
    } catch {
      toast.error('Network error - schedule not regenerated')
    } finally {
      setIsRecalibrating(false)
    }
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Header with navigation */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">
            Week of {formatWeekRange(weekStart)}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRecalibrate(true)}
            disabled={isRecalibrating}
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
      <div className="flex-1 border rounded-lg overflow-hidden">
        {isLoading ? (
          <CalendarSkeleton />
        ) : events.length === 0 && !isCurrentWeek ? (
          <EmptyState />
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
// EMPTY STATE
// =============================================================================

/**
 * Empty state when no events are scheduled
 */
function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <CalendarX className="h-12 w-12 text-muted-foreground mb-4" />
      <h2 className="text-lg font-medium mb-2">No events scheduled</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Events for this week haven&apos;t been generated yet. Go to the dashboard to
        generate your schedule.
      </p>
    </div>
  )
}
