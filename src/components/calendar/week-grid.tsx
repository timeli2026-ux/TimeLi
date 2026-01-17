'use client'

import { useMemo, useState, useCallback } from 'react'
import {
  getWeekDates,
  formatDayHeader,
  isSameDay,
  getTotalSlots,
  getCurrentSlotIndex,
  SLOT_DURATION_MINUTES,
  DEFAULT_DAY_START_HOUR,
  DEFAULT_DAY_END_HOUR,
} from '@/lib/calendar-utils'
import { timeToMinutes } from '@/lib/scheduling/types'
import type { ScheduleEventWithFlexibility } from '@/lib/scheduling/types'
import { cn } from '@/lib/utils'
import { TimeColumn, SLOT_HEIGHT } from './time-column'
import { CalendarEvent } from './calendar-event'
import { EventPopover } from './event-popover'

// =============================================================================
// TYPES
// =============================================================================

interface WeekGridProps {
  weekStart: Date
  events?: ScheduleEventWithFlexibility[]
  onEventClick?: (event: ScheduleEventWithFlexibility) => void
  startHour?: number
  endHour?: number
  className?: string
}

// =============================================================================
// EVENT POSITIONING HELPERS
// =============================================================================

/**
 * Calculate top offset in pixels for an event based on its start time
 */
function calculateEventTop(
  startTime: string,
  dayStartHour: number
): number {
  const startMinutes = timeToMinutes(startTime)
  const dayStartMinutes = dayStartHour * 60
  const minutesFromDayStart = startMinutes - dayStartMinutes
  return (minutesFromDayStart / SLOT_DURATION_MINUTES) * SLOT_HEIGHT
}

/**
 * Calculate height in pixels for an event based on its duration
 */
function calculateEventHeight(durationMinutes: number): number {
  return (durationMinutes / SLOT_DURATION_MINUTES) * SLOT_HEIGHT
}

/**
 * Group events by day of week
 */
function groupEventsByDay(
  events: ScheduleEventWithFlexibility[]
): Map<number, ScheduleEventWithFlexibility[]> {
  const groups = new Map<number, ScheduleEventWithFlexibility[]>()

  // Initialize all days (0-6, where 0=Sunday, 6=Saturday)
  for (let i = 0; i <= 6; i++) {
    groups.set(i, [])
  }

  // Group events by their day
  events.forEach((event) => {
    const dayEvents = groups.get(event.slot.dayOfWeek)
    if (dayEvents) {
      dayEvents.push(event)
    }
  })

  // Sort each day's events by start time
  groups.forEach((dayEvents) => {
    dayEvents.sort((a, b) => {
      const aStart = timeToMinutes(a.slot.startTime)
      const bStart = timeToMinutes(b.slot.startTime)
      return aStart - bStart
    })
  })

  return groups
}

/**
 * Convert calendar day index (0-6 for Mon-Sun) to JS day of week (0-6 for Sun-Sat)
 */
function calendarDayToJsDay(calendarIndex: number): number {
  // Calendar: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
  // JS: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  return calendarIndex === 6 ? 0 : calendarIndex + 1
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * WeekGrid component - displays a 7-day calendar grid with 15-minute time slots
 *
 * Structure:
 * - Header row: 7 day columns with day name + date
 * - Grid area: 7 columns, each with 15-min slot rows
 * - TimeColumn on the left side
 * - Events positioned absolutely within their day column
 * - Current time indicator when viewing current week
 */
export function WeekGrid({
  weekStart,
  events = [],
  onEventClick,
  startHour = DEFAULT_DAY_START_HOUR,
  endHour = DEFAULT_DAY_END_HOUR,
  className,
}: WeekGridProps) {
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart])
  const today = useMemo(() => new Date(), [])
  const totalSlots = getTotalSlots(startHour, endHour)
  const slotsPerHour = 60 / SLOT_DURATION_MINUTES

  // Track which popover is open
  const [openEventId, setOpenEventId] = useState<string | null>(null)

  // Handle popover state
  const handlePopoverChange = useCallback(
    (eventId: string, isOpen: boolean) => {
      setOpenEventId(isOpen ? eventId : null)
    },
    []
  )

  // Check if we're viewing the current week (for current time indicator)
  const isCurrentWeek = useMemo(() => {
    return weekDates.some((date) => isSameDay(date, today))
  }, [weekDates, today])

  // Get current slot index for time indicator
  const currentSlotIndex = useMemo(() => {
    if (!isCurrentWeek) return -1
    return getCurrentSlotIndex(startHour, endHour)
  }, [isCurrentWeek, startHour, endHour])

  // Get today's column index (0-6 for Mon-Sun)
  const todayColumnIndex = useMemo(() => {
    if (!isCurrentWeek) return -1
    return weekDates.findIndex((date) => isSameDay(date, today))
  }, [weekDates, today, isCurrentWeek])

  // Group events by day
  const eventsByDay = useMemo(() => groupEventsByDay(events), [events])

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header row with day names and dates */}
      <div className="flex border-b border-border">
        {/* Empty cell for time column alignment */}
        <div className="w-[60px] flex-shrink-0 border-r border-border" />

        {/* Day headers */}
        {weekDates.map((date, index) => {
          const header = formatDayHeader(date)
          const isToday = isCurrentWeek && isSameDay(date, today)

          return (
            <div
              key={`header-${index}`}
              className={cn(
                'flex-1 h-12 flex flex-col items-center justify-center border-r border-border last:border-r-0',
                isToday && 'bg-accent/10'
              )}
            >
              <span className="text-xs text-muted-foreground">{header.day}</span>
              <span
                className={cn(
                  'text-sm font-medium',
                  isToday && 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center'
                )}
              >
                {header.date}
              </span>
            </div>
          )
        })}
      </div>

      {/* Scrollable grid area */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex">
          {/* Time column */}
          <TimeColumn startHour={startHour} endHour={endHour} />

          {/* Day columns */}
          <div className="flex-1 flex relative">
            {/* Current time indicator */}
            {isCurrentWeek && currentSlotIndex >= 0 && todayColumnIndex >= 0 && (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top: `${currentSlotIndex * SLOT_HEIGHT}px` }}
              >
                <div className="flex">
                  {/* Spacer for columns before today */}
                  {todayColumnIndex > 0 && (
                    <div
                      style={{
                        width: `${(todayColumnIndex / 7) * 100}%`,
                      }}
                    />
                  )}
                  {/* Red line for current time */}
                  <div
                    className="relative"
                    style={{ width: `${(1 / 7) * 100}%` }}
                  >
                    <div className="absolute left-0 right-0 flex items-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full -ml-1" />
                      <div className="flex-1 h-0.5 bg-red-500" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Day columns grid */}
            {weekDates.map((date, dayIndex) => {
              const isToday = isCurrentWeek && isSameDay(date, today)
              const jsDayOfWeek = calendarDayToJsDay(dayIndex)
              const dayEvents = eventsByDay.get(jsDayOfWeek) ?? []

              return (
                <div
                  key={`day-${dayIndex}`}
                  className={cn(
                    'flex-1 border-r border-border last:border-r-0 relative',
                    isToday && 'bg-accent/10'
                  )}
                >
                  {/* Time slots (background grid) */}
                  {Array.from({ length: totalSlots }).map((_, slotIndex) => {
                    const isHourBoundary = slotIndex > 0 && slotIndex % slotsPerHour === 0

                    return (
                      <div
                        key={`slot-${dayIndex}-${slotIndex}`}
                        className={cn(
                          'border-b hover:bg-accent/5 transition-colors',
                          isHourBoundary
                            ? 'border-border/50'
                            : 'border-border/20'
                        )}
                        style={{ height: `${SLOT_HEIGHT}px` }}
                      />
                    )
                  })}

                  {/* Events layer (absolutely positioned) */}
                  <div className="absolute inset-0 pointer-events-none">
                    {dayEvents.map((event, eventIndex) => {
                      const top = calculateEventTop(event.slot.startTime, startHour)
                      const height = calculateEventHeight(event.slot.durationMinutes)

                      // Ensure event is visible within view bounds
                      if (top < 0 || top >= totalSlots * SLOT_HEIGHT) return null

                      return (
                        <div
                          key={event.id}
                          className="pointer-events-auto"
                          style={{
                            position: 'absolute',
                            top: `${top}px`,
                            height: `${height}px`,
                            left: '2px',
                            right: '2px',
                            zIndex: 10 + eventIndex,
                          }}
                        >
                          <EventPopover
                            event={event}
                            open={openEventId === event.id}
                            onOpenChange={(isOpen) => handlePopoverChange(event.id, isOpen)}
                          >
                            <CalendarEvent
                              event={event}
                              onClick={() => {
                                setOpenEventId(event.id)
                                onEventClick?.(event)
                              }}
                              className="h-full"
                            />
                          </EventPopover>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
