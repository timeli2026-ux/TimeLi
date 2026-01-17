'use client'

import { getTimeSlots, SLOT_DURATION_MINUTES } from '@/lib/calendar-utils'
import { cn } from '@/lib/utils'

// Height for each 15-minute slot in pixels
const SLOT_HEIGHT = 16 // 16px per 15-min slot = 64px per hour

interface TimeColumnProps {
  startHour?: number
  endHour?: number
  className?: string
}

/**
 * TimeColumn component - displays hour labels on the left side of the calendar grid
 *
 * Structure:
 * - Fixed width column (~60px)
 * - Hour labels (6 AM, 7 AM, ...) at each hour mark
 * - Each hour has 4 x 15-minute slots
 */
export function TimeColumn({
  startHour = 6,
  endHour = 23,
  className,
}: TimeColumnProps) {
  const timeSlots = getTimeSlots(startHour, endHour)
  const slotsPerHour = 60 / SLOT_DURATION_MINUTES // 4 slots per hour

  return (
    <div
      className={cn(
        'sticky left-0 z-10 bg-background border-r border-border w-[60px] flex-shrink-0',
        className
      )}
    >
      {/* Empty header cell to align with day headers */}
      <div className="h-12 border-b border-border" />

      {/* Hour labels */}
      <div className="relative">
        {timeSlots.map((label, index) => (
          <div
            key={`hour-${startHour + index}`}
            className="relative"
            style={{ height: `${SLOT_HEIGHT * slotsPerHour}px` }}
          >
            {/* Hour label positioned at the top of each hour block */}
            <span
              className="absolute -top-2 right-2 text-xs text-muted-foreground"
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Export slot height for use in WeekGrid
export { SLOT_HEIGHT }
