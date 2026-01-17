'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WeekGrid } from '@/components/calendar/week-grid'
import {
  getWeekStart,
  formatWeekRange,
  addWeeks,
  isSameDay,
} from '@/lib/calendar-utils'

// Maximum weeks user can navigate into the future
const MAX_FUTURE_WEEKS = 4

export default function CalendarPage() {
  // Get current week's Monday as the baseline
  const currentWeekStart = useMemo(() => getWeekStart(new Date()), [])

  // State for the currently displayed week
  const [weekStart, setWeekStart] = useState(() => currentWeekStart)

  // Loading state placeholder for future schedule fetching
  const [isLoading, setIsLoading] = useState(false)

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

  // Placeholder for fetching schedule on week change
  useEffect(() => {
    // TODO: Fetch schedule from API when week changes
    console.log('Week changed to:', weekStart.toISOString())
    setIsLoading(true)
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 200)
    return () => clearTimeout(timer)
  }, [weekStart])

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
        ) : (
          <WeekGrid weekStart={weekStart} />
        )}
      </div>
    </div>
  )
}

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
      {/* Grid skeleton */}
      <div className="flex-1 bg-muted/20" />
    </div>
  )
}
