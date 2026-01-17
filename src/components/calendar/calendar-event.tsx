'use client'

import { Lock } from 'lucide-react'
import type { ScheduleEventWithFlexibility } from '@/lib/scheduling/types'
import { cn } from '@/lib/utils'

// =============================================================================
// REALM COLOR MAPPING
// =============================================================================

/**
 * Color mapping for different realm IDs
 * Provides visual distinction for AI-scheduled goal events
 */
const REALM_COLORS: Record<string, string> = {
  // Default fallback
  default: 'bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-100',
  // Realm-specific colors
  health: 'bg-green-100 border-green-300 text-green-900 dark:bg-green-900/30 dark:border-green-700 dark:text-green-100',
  career: 'bg-purple-100 border-purple-300 text-purple-900 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-100',
  learning: 'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-100',
  relationships: 'bg-pink-100 border-pink-300 text-pink-900 dark:bg-pink-900/30 dark:border-pink-700 dark:text-pink-100',
  creativity: 'bg-orange-100 border-orange-300 text-orange-900 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-100',
  finance: 'bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-100',
  personal: 'bg-cyan-100 border-cyan-300 text-cyan-900 dark:bg-cyan-900/30 dark:border-cyan-700 dark:text-cyan-100',
  spiritual: 'bg-violet-100 border-violet-300 text-violet-900 dark:bg-violet-900/30 dark:border-violet-700 dark:text-violet-100',
}

/**
 * Get the color classes for a realm ID
 */
export function getRealmColor(realmId?: string): string {
  if (!realmId) return REALM_COLORS.default
  return REALM_COLORS[realmId.toLowerCase()] ?? REALM_COLORS.default
}

// =============================================================================
// FLEXIBILITY DOT COLORS
// =============================================================================

const FLEXIBILITY_DOT_COLORS: Record<string, string> = {
  high: 'bg-green-500',
  medium: 'bg-yellow-500',
  low: 'bg-red-500',
}

// =============================================================================
// LOCKED EVENT STYLES
// =============================================================================

const LOCKED_EVENT_STYLES = 'bg-muted border-muted-foreground/30 text-muted-foreground'

// =============================================================================
// COMPONENT
// =============================================================================

interface CalendarEventProps {
  event: ScheduleEventWithFlexibility
  onClick?: () => void
  className?: string
}

/**
 * CalendarEvent component - displays a single event on the calendar
 *
 * Styling varies by event type:
 * - Locked events (fixed, meal, sleep, commute): Gray with lock icon
 * - Goal events: Colored by realm with flexibility indicator
 */
export function CalendarEvent({ event, onClick, className }: CalendarEventProps) {
  const isLocked = event.isLocked || event.type !== 'goal'
  const isGoal = event.type === 'goal'

  // Determine event colors
  const eventColors = isLocked
    ? LOCKED_EVENT_STYLES
    : getRealmColor(event.realmId)

  // Get flexibility dot color for goal events
  const flexibilityDotColor = isGoal && event.flexibility
    ? FLEXIBILITY_DOT_COLORS[event.flexibility.level] ?? FLEXIBILITY_DOT_COLORS.medium
    : null

  // Format time range for display
  const timeRange = `${formatTime(event.slot.startTime)} - ${formatTime(event.slot.endTime)}`

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
      className={cn(
        // Base styles
        'absolute left-0.5 right-0.5 rounded-md border px-1.5 py-0.5',
        'flex flex-col overflow-hidden',
        'transition-all duration-150',
        // Cursor based on event type
        isGoal ? 'cursor-grab hover:shadow-md' : 'cursor-default',
        // Event colors
        eventColors,
        className
      )}
    >
      {/* Top row: Title + indicator */}
      <div className="flex items-start justify-between gap-1 min-h-0">
        <span className="text-xs font-medium truncate flex-1 leading-tight">
          {event.title}
        </span>

        {/* Indicator: Lock for locked events, flexibility dot for goals */}
        <div className="flex-shrink-0 mt-0.5">
          {isLocked ? (
            <Lock className="h-3 w-3 opacity-60" />
          ) : flexibilityDotColor ? (
            <div
              className={cn('h-2 w-2 rounded-full', flexibilityDotColor)}
              title={`Flexibility: ${event.flexibility?.level ?? 'unknown'}`}
            />
          ) : null}
        </div>
      </div>

      {/* Time range - only show if enough height */}
      <span className="text-xs text-inherit opacity-75 truncate leading-tight">
        {timeRange}
      </span>

      {/* Rationale badge for goal events - only show if enough height and rationale exists */}
      {isGoal && event.rationale && event.slot.durationMinutes >= 45 && (
        <div className="mt-auto pt-0.5">
          <span className="text-xs opacity-60 truncate block leading-tight">
            {event.rationale.primary}
          </span>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format HH:mm time to display format (e.g., "9:00" or "10:30")
 */
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours, 10)
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  const period = hour < 12 ? 'AM' : 'PM'
  return `${displayHour}:${minutes} ${period}`
}

// =============================================================================
// EXPORT COLOR UTILITY
// =============================================================================

export { REALM_COLORS, FLEXIBILITY_DOT_COLORS }
