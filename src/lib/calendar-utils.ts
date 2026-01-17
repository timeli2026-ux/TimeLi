// Calendar utility functions for week view display
// Phase 6: Calendar UI - Plan 01

import {
  SLOT_DURATION_MINUTES,
  DEFAULT_DAY_START_HOUR,
  DEFAULT_DAY_END_HOUR,
} from '@/lib/scheduling/types'

// =============================================================================
// TYPES
// =============================================================================

/**
 * State for calendar view
 */
export interface CalendarViewState {
  weekStart: Date
  viewStartHour: number // default 6
  viewEndHour: number // default 23
}

/**
 * Formatted day header for display
 */
export interface DayHeader {
  day: string // "Mon", "Tue", etc.
  date: string // "13", "14", etc.
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_OF_WEEK = 7

// =============================================================================
// WEEK NAVIGATION FUNCTIONS
// =============================================================================

/**
 * Get the Monday of the week for a given date
 * @param date - Any date
 * @returns Date representing Monday of that week at 00:00:00
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  // getDay() returns 0 for Sunday, 1 for Monday, etc.
  // We want Monday as week start, so:
  // - If Sunday (0), go back 6 days
  // - If Monday (1), go back 0 days
  // - If Tuesday (2), go back 1 day
  // etc.
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get array of 7 dates for a week starting from weekStart (Mon-Sun)
 * @param weekStart - Monday of the week
 * @returns Array of 7 Date objects [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
 */
export function getWeekDates(weekStart: Date): Date[] {
  const dates: Date[] = []
  for (let i = 0; i < DAYS_OF_WEEK; i++) {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    dates.push(d)
  }
  return dates
}

/**
 * Format a week range for display (e.g., "Jan 13 - Jan 19, 2026")
 * @param weekStart - Monday of the week
 * @returns Formatted string like "Jan 13 - Jan 19, 2026"
 */
export function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6) // Sunday

  const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' })
  const year = weekEnd.getFullYear()

  const startDate = weekStart.getDate()
  const endDate = weekEnd.getDate()

  // Same month
  if (startMonth === endMonth) {
    return `${startMonth} ${startDate} - ${endDate}, ${year}`
  }

  // Different months
  return `${startMonth} ${startDate} - ${endMonth} ${endDate}, ${year}`
}

/**
 * Format a date for day header display
 * @param date - Date to format
 * @returns Object with day name and date number
 */
export function formatDayHeader(date: Date): DayHeader {
  const dayOfWeek = date.getDay()
  return {
    day: DAY_NAMES[dayOfWeek],
    date: date.getDate().toString(),
  }
}

/**
 * Add weeks to a date
 * @param date - Starting date
 * @param weeks - Number of weeks to add (can be negative)
 * @returns New date with weeks added
 */
export function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + weeks * DAYS_OF_WEEK)
  return d
}

/**
 * Check if two dates are the same day (ignoring time)
 * @param a - First date
 * @param b - Second date
 * @returns True if same calendar day
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// =============================================================================
// TIME SLOT FUNCTIONS
// =============================================================================

/**
 * Get array of time slot labels for hour markers
 * @param startHour - First hour to include (e.g., 6 for 6 AM)
 * @param endHour - Last hour to include (e.g., 23 for 11 PM)
 * @returns Array of formatted hour labels (e.g., ["6 AM", "7 AM", ...])
 */
export function getTimeSlots(startHour: number, endHour: number): string[] {
  const slots: string[] = []
  for (let hour = startHour; hour <= endHour; hour++) {
    const period = hour < 12 ? 'AM' : 'PM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    slots.push(`${displayHour} ${period}`)
  }
  return slots
}

/**
 * Calculate number of 15-minute slots between start and end hours
 * @param startHour - First hour
 * @param endHour - Last hour
 * @returns Total number of 15-minute slots
 */
export function getTotalSlots(startHour: number, endHour: number): number {
  const hours = endHour - startHour + 1
  return hours * (60 / SLOT_DURATION_MINUTES)
}

/**
 * Get the current slot index for the current time
 * @param startHour - View start hour
 * @returns Slot index (0-based) or -1 if outside view hours
 */
export function getCurrentSlotIndex(startHour: number, endHour: number): number {
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  if (currentHour < startHour || currentHour > endHour) {
    return -1
  }

  const hourOffset = currentHour - startHour
  const slotInHour = Math.floor(currentMinute / SLOT_DURATION_MINUTES)
  return hourOffset * (60 / SLOT_DURATION_MINUTES) + slotInHour
}

// =============================================================================
// DEFAULTS
// =============================================================================

/**
 * Create default calendar view state for current week
 */
export function createDefaultCalendarViewState(): CalendarViewState {
  return {
    weekStart: getWeekStart(new Date()),
    viewStartHour: DEFAULT_DAY_START_HOUR,
    viewEndHour: DEFAULT_DAY_END_HOUR,
  }
}

// Re-export constants for convenience
export { SLOT_DURATION_MINUTES, DEFAULT_DAY_START_HOUR, DEFAULT_DAY_END_HOUR }
