'use client'

import { Lock, Clock, Calendar, HelpCircle, CheckCircle, ArrowRightLeft } from 'lucide-react'
import type { ScheduleEventWithFlexibility } from '@/lib/scheduling/types'
import { getDayName } from '@/lib/scheduling/types'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// =============================================================================
// FLEXIBILITY BADGE COLORS
// =============================================================================

const FLEXIBILITY_BADGE_STYLES: Record<string, string> = {
  high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

// =============================================================================
// COMPONENT
// =============================================================================

interface EventPopoverProps {
  event: ScheduleEventWithFlexibility
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

/**
 * EventPopover component - shows event details on click
 *
 * Sections:
 * 1. Header - Event title, time range, day
 * 2. Event Type Badge - Fixed badge or realm name
 * 3. Rationale Section - Why this time? (goal events only)
 * 4. Flexibility Section - Flexibility level and alternatives (goal events only)
 * 5. Actions - Mark Complete, Reschedule (placeholders)
 */
export function EventPopover({ event, open, onOpenChange, children }: EventPopoverProps) {
  const isGoal = event.type === 'goal'
  const timeRange = `${formatTimeDisplay(event.slot.startTime)} - ${formatTimeDisplay(event.slot.endTime)}`
  const dayName = getDayName(event.slot.dayOfWeek)

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" sideOffset={4}>
        {/* Header Section */}
        <div className="p-3 border-b border-border">
          <h3 className="font-semibold text-sm leading-tight">{event.title}</h3>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{timeRange}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{dayName}</span>
            </div>
          </div>
        </div>

        {/* Event Type Badge Section */}
        <div className="px-3 py-2 border-b border-border">
          {event.isLocked || !isGoal ? (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs">
              <Lock className="h-3 w-3" />
              <span>Fixed</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
              {event.realmId ? capitalizeFirst(event.realmId) : 'Goal'}
            </div>
          )}
        </div>

        {/* Rationale Section (goal events only) */}
        {isGoal && event.rationale && (
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <HelpCircle className="h-3 w-3" />
              <span>Why this time?</span>
            </div>
            <p className="text-xs leading-relaxed">{event.rationale.primary}</p>
            {event.rationale.secondary && (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {event.rationale.secondary}
              </p>
            )}
            {event.rationale.factors && event.rationale.factors.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {event.rationale.factors.map((factor, index) => (
                  <span
                    key={index}
                    className="inline-flex px-1.5 py-0.5 rounded text-xs bg-accent text-accent-foreground"
                  >
                    {factor}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Flexibility Section (goal events only) */}
        {isGoal && event.flexibility && (
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium',
                  FLEXIBILITY_BADGE_STYLES[event.flexibility.level] ??
                    FLEXIBILITY_BADGE_STYLES.medium
                )}
              >
                {capitalizeFirst(event.flexibility.level)} Flexibility
              </span>
              {event.flexibility.alternativeSlots > 0 && (
                <span className="text-xs text-muted-foreground">
                  {event.flexibility.alternativeSlots} alternative{' '}
                  {event.flexibility.alternativeSlots === 1 ? 'slot' : 'slots'}
                </span>
              )}
            </div>
            {event.flexibility.explanation && (
              <p className="text-xs text-muted-foreground mt-1.5">
                {event.flexibility.explanation}
              </p>
            )}
          </div>
        )}

        {/* Actions Section (placeholders for Plan 06-03) */}
        <div className="p-2 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1.5" disabled>
            <CheckCircle className="h-3.5 w-3.5" />
            Mark Complete
          </Button>
          {isGoal && (
            <Button variant="outline" size="sm" className="flex-1 gap-1.5" disabled>
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Reschedule
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format HH:mm time to display format (e.g., "9:00 AM")
 */
function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours, 10)
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  const period = hour < 12 ? 'AM' : 'PM'
  return `${displayHour}:${minutes} ${period}`
}

/**
 * Capitalize first letter of a string
 */
function capitalizeFirst(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
