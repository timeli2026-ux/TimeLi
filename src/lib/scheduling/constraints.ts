// Constraint checking functions for scheduling engine
// Phase 5: Scheduling Engine - Plan 01
// Supports variable sleep, intensity-based recovery, and habit stacking

import {
  TimeSlot,
  ScheduleEvent,
  SchedulerInput,
  GoalWithMetadata,
  UserPreferences,
  FixedCommitment,
  timeToMinutes,
  minutesToTime,
  isWeekend,
  alignToGrid,
  SLOT_DURATION_MINUTES,
  DEFAULT_DAY_START_HOUR,
  DEFAULT_DAY_END_HOUR,
  DAYS_IN_WEEK,
  generateEventId,
} from './types'

// =============================================================================
// BLOCKED SLOTS BUILDING
// =============================================================================

/**
 * Build all blocked time slots from user preferences and commitments
 * Handles variable weekend sleep schedules
 */
export function buildBlockedSlots(input: SchedulerInput): TimeSlot[] {
  const { preferences, commitments } = input
  const blockedSlots: TimeSlot[] = []

  // Add sleep slots for each day
  for (let day = 0; day < DAYS_IN_WEEK; day++) {
    const sleepSlots = buildSleepSlots(preferences, day)
    blockedSlots.push(...sleepSlots)
  }

  // Add meal slots for each day (if enabled)
  for (let day = 0; day < DAYS_IN_WEEK; day++) {
    const mealSlots = buildMealSlots(preferences, day)
    blockedSlots.push(...mealSlots)
  }

  // Add commute slots for weekdays only
  for (let day = 1; day <= 5; day++) {
    // Monday-Friday
    const commuteSlots = buildCommuteSlots(preferences, day)
    blockedSlots.push(...commuteSlots)
  }

  // Add fixed commitments
  for (const commitment of commitments) {
    blockedSlots.push({
      dayOfWeek: commitment.dayOfWeek,
      startTime: commitment.startTime,
      endTime: commitment.endTime,
      durationMinutes: timeToMinutes(commitment.endTime) - timeToMinutes(commitment.startTime),
    })
  }

  return blockedSlots
}

/**
 * Build sleep slots for a specific day
 * Uses weekend times on Sat/Sun if provided
 */
function buildSleepSlots(preferences: UserPreferences, dayOfWeek: number): TimeSlot[] {
  const slots: TimeSlot[] = []

  // Determine which sleep times to use
  const useWeekendTimes =
    isWeekend(dayOfWeek) && preferences.weekendSleepStart && preferences.weekendSleepEnd

  const sleepStart = useWeekendTimes ? preferences.weekendSleepStart! : preferences.sleepStart
  const sleepEnd = useWeekendTimes ? preferences.weekendSleepEnd! : preferences.sleepEnd

  const startMinutes = timeToMinutes(sleepStart)
  const endMinutes = timeToMinutes(sleepEnd)

  // Sleep typically spans midnight (e.g., 23:00 to 07:00)
  // We need to block the evening portion on the current day
  // and the morning portion on the next day

  // Evening sleep block (on current day, from sleep start to midnight)
  if (startMinutes > endMinutes) {
    // Overnight sleep
    const eveningDuration = 24 * 60 - startMinutes
    slots.push({
      dayOfWeek,
      startTime: sleepStart,
      endTime: '23:59',
      durationMinutes: eveningDuration,
    })
  }

  // Morning sleep block (from midnight to wake time)
  // This blocks time in the morning of the specified day
  if (endMinutes > 0) {
    slots.push({
      dayOfWeek,
      startTime: '00:00',
      endTime: sleepEnd,
      durationMinutes: endMinutes,
    })
  }

  return slots
}

/**
 * Build meal slots for a specific day
 */
function buildMealSlots(preferences: UserPreferences, dayOfWeek: number): TimeSlot[] {
  const slots: TimeSlot[] = []

  // Breakfast
  if (preferences.mealBreakfastStart && preferences.mealBreakfastDuration) {
    const start = timeToMinutes(preferences.mealBreakfastStart)
    slots.push({
      dayOfWeek,
      startTime: preferences.mealBreakfastStart,
      endTime: minutesToTime(start + preferences.mealBreakfastDuration),
      durationMinutes: preferences.mealBreakfastDuration,
    })
  }

  // Lunch
  if (preferences.mealLunchStart && preferences.mealLunchDuration) {
    const start = timeToMinutes(preferences.mealLunchStart)
    slots.push({
      dayOfWeek,
      startTime: preferences.mealLunchStart,
      endTime: minutesToTime(start + preferences.mealLunchDuration),
      durationMinutes: preferences.mealLunchDuration,
    })
  }

  // Dinner
  if (preferences.mealDinnerStart && preferences.mealDinnerDuration) {
    const start = timeToMinutes(preferences.mealDinnerStart)
    slots.push({
      dayOfWeek,
      startTime: preferences.mealDinnerStart,
      endTime: minutesToTime(start + preferences.mealDinnerDuration),
      durationMinutes: preferences.mealDinnerDuration,
    })
  }

  return slots
}

/**
 * Build commute slots for a specific day
 */
function buildCommuteSlots(preferences: UserPreferences, dayOfWeek: number): TimeSlot[] {
  const slots: TimeSlot[] = []

  // Morning commute
  if (preferences.commuteMorningStart && preferences.commuteMorningDuration) {
    const start = timeToMinutes(preferences.commuteMorningStart)
    slots.push({
      dayOfWeek,
      startTime: preferences.commuteMorningStart,
      endTime: minutesToTime(start + preferences.commuteMorningDuration),
      durationMinutes: preferences.commuteMorningDuration,
    })
  }

  // Evening commute
  if (preferences.commuteEveningStart && preferences.commuteEveningDuration) {
    const start = timeToMinutes(preferences.commuteEveningStart)
    slots.push({
      dayOfWeek,
      startTime: preferences.commuteEveningStart,
      endTime: minutesToTime(start + preferences.commuteEveningDuration),
      durationMinutes: preferences.commuteEveningDuration,
    })
  }

  return slots
}

// =============================================================================
// AVAILABLE SLOTS CALCULATION
// =============================================================================

/**
 * Get available time slots for a specific day
 * Returns array of continuous available periods
 */
export function getAvailableSlots(blockedSlots: TimeSlot[], dayOfWeek: number): TimeSlot[] {
  // Filter blocked slots for this day
  const dayBlockedSlots = blockedSlots
    .filter((s) => s.dayOfWeek === dayOfWeek)
    .map((s) => ({
      start: timeToMinutes(s.startTime),
      end: timeToMinutes(s.endTime),
    }))
    .sort((a, b) => a.start - b.start)

  // Merge overlapping blocked periods
  const mergedBlocked = mergeIntervals(dayBlockedSlots)

  // Calculate available slots between blocked periods
  const availableSlots: TimeSlot[] = []
  const dayStart = DEFAULT_DAY_START_HOUR * 60 // 6:00 AM
  const dayEnd = DEFAULT_DAY_END_HOUR * 60 // 11:00 PM

  let currentStart = dayStart

  for (const blocked of mergedBlocked) {
    // Skip blocks that are entirely before our day window
    if (blocked.end <= dayStart) continue

    // Stop if we've reached the end of the day
    if (blocked.start >= dayEnd) break

    // Clip blocked period to day window
    const blockStart = Math.max(blocked.start, dayStart)
    const blockEnd = Math.min(blocked.end, dayEnd)

    // Add available slot before this blocked period
    if (currentStart < blockStart) {
      const duration = blockStart - currentStart
      if (duration >= SLOT_DURATION_MINUTES) {
        availableSlots.push({
          dayOfWeek,
          startTime: minutesToTime(currentStart),
          endTime: minutesToTime(blockStart),
          durationMinutes: duration,
        })
      }
    }

    currentStart = Math.max(currentStart, blockEnd)
  }

  // Add any remaining available time at end of day
  if (currentStart < dayEnd) {
    const duration = dayEnd - currentStart
    if (duration >= SLOT_DURATION_MINUTES) {
      availableSlots.push({
        dayOfWeek,
        startTime: minutesToTime(currentStart),
        endTime: minutesToTime(dayEnd),
        durationMinutes: duration,
      })
    }
  }

  return availableSlots
}

/**
 * Merge overlapping intervals
 */
function mergeIntervals(intervals: Array<{ start: number; end: number }>): Array<{
  start: number
  end: number
}> {
  if (intervals.length === 0) return []

  const sorted = [...intervals].sort((a, b) => a.start - b.start)
  const merged: Array<{ start: number; end: number }> = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1]
    const current = sorted[i]

    if (current.start <= last.end) {
      // Overlapping - merge
      last.end = Math.max(last.end, current.end)
    } else {
      // Non-overlapping - add new
      merged.push(current)
    }
  }

  return merged
}

/**
 * Get all available slots for the entire week
 */
export function getAllAvailableSlots(blockedSlots: TimeSlot[]): Map<number, TimeSlot[]> {
  const availableByDay = new Map<number, TimeSlot[]>()

  for (let day = 0; day < DAYS_IN_WEEK; day++) {
    availableByDay.set(day, getAvailableSlots(blockedSlots, day))
  }

  return availableByDay
}

// =============================================================================
// RECOVERY BUFFER CALCULATION
// =============================================================================

/**
 * Calculate recovery buffer based on goal intensity
 * Higher intensity activities need longer recovery
 *
 * Formula: base buffer + (intensity - 1) * 5 minutes
 * - Level 1 (light): base buffer only
 * - Level 5 (intense): base buffer + 20 minutes
 */
export function calculateRecoveryBuffer(goal: GoalWithMetadata, baseBuffer: number): number {
  const intensityBonus = (goal.intensityLevel - 1) * 5
  return baseBuffer + intensityBonus
}

// =============================================================================
// EVENT PLACEMENT VALIDATION
// =============================================================================

/**
 * Check if an event can be placed at a given slot
 * Validates no overlaps and respects buffer time
 */
export function canPlaceEvent(
  slot: TimeSlot,
  existingEvents: ScheduleEvent[],
  bufferMinutes: number
): boolean {
  const slotStart = timeToMinutes(slot.startTime)
  const slotEnd = timeToMinutes(slot.endTime)

  for (const event of existingEvents) {
    if (event.slot.dayOfWeek !== slot.dayOfWeek) continue

    const eventStart = timeToMinutes(event.slot.startTime)
    const eventEnd = timeToMinutes(event.slot.endTime)

    // Check for overlap (including buffer)
    const bufferedEventStart = eventStart - bufferMinutes
    const bufferedEventEnd = eventEnd + bufferMinutes

    if (slotStart < bufferedEventEnd && slotEnd > bufferedEventStart) {
      return false
    }
  }

  return true
}

/**
 * Check if a slot fits within an available time window
 */
export function slotFitsInAvailable(slot: TimeSlot, availableSlots: TimeSlot[]): boolean {
  const slotStart = timeToMinutes(slot.startTime)
  const slotEnd = timeToMinutes(slot.endTime)

  for (const available of availableSlots) {
    if (available.dayOfWeek !== slot.dayOfWeek) continue

    const availStart = timeToMinutes(available.startTime)
    const availEnd = timeToMinutes(available.endTime)

    if (slotStart >= availStart && slotEnd <= availEnd) {
      return true
    }
  }

  return false
}

// =============================================================================
// VALID SLOT FINDING
// =============================================================================

/**
 * Find all valid slots that can fit a goal session
 * Returns ALL slots (not just first) for backtracking algorithm
 */
export function findAllValidSlots(
  goalDurationMinutes: number,
  availableSlots: TimeSlot[],
  existingEvents: ScheduleEvent[],
  bufferMinutes: number,
  dayOfWeek?: number
): TimeSlot[] {
  const validSlots: TimeSlot[] = []
  const alignedDuration = alignToGrid(goalDurationMinutes) || SLOT_DURATION_MINUTES

  // Filter available slots by day if specified
  const slotsToCheck = dayOfWeek !== undefined ? availableSlots.filter((s) => s.dayOfWeek === dayOfWeek) : availableSlots

  for (const available of slotsToCheck) {
    const availStart = timeToMinutes(available.startTime)
    const availEnd = timeToMinutes(available.endTime)

    // Try each possible starting position within this available window
    for (let startMinutes = availStart; startMinutes + alignedDuration <= availEnd; startMinutes += SLOT_DURATION_MINUTES) {
      const candidateSlot: TimeSlot = {
        dayOfWeek: available.dayOfWeek,
        startTime: minutesToTime(startMinutes),
        endTime: minutesToTime(startMinutes + alignedDuration),
        durationMinutes: alignedDuration,
      }

      if (canPlaceEvent(candidateSlot, existingEvents, bufferMinutes)) {
        validSlots.push(candidateSlot)
      }
    }
  }

  return validSlots
}

/**
 * Find all valid slots across all days
 */
export function findAllValidSlotsAllDays(
  goalDurationMinutes: number,
  availableByDay: Map<number, TimeSlot[]>,
  existingEvents: ScheduleEvent[],
  bufferMinutes: number
): Map<number, TimeSlot[]> {
  const validByDay = new Map<number, TimeSlot[]>()

  for (let day = 0; day < DAYS_IN_WEEK; day++) {
    const dayAvailable = availableByDay.get(day) || []
    const validSlots = findAllValidSlots(goalDurationMinutes, dayAvailable, existingEvents, bufferMinutes, day)
    validByDay.set(day, validSlots)
  }

  return validByDay
}

// =============================================================================
// MRV HEURISTIC SUPPORT
// =============================================================================

/**
 * Count how many valid placements exist for a goal
 * Used for MRV heuristic (most constrained variable first)
 */
export function countValidPlacements(
  goal: GoalWithMetadata,
  availableByDay: Map<number, TimeSlot[]>,
  existingEvents: ScheduleEvent[],
  bufferMinutes: number
): number {
  const sessionDuration = goal.sessionStrategy.preferredDuration
  let totalPlacements = 0

  for (let day = 0; day < DAYS_IN_WEEK; day++) {
    const dayAvailable = availableByDay.get(day) || []
    const validSlots = findAllValidSlots(sessionDuration, dayAvailable, existingEvents, bufferMinutes, day)
    totalPlacements += validSlots.length
  }

  return totalPlacements
}

// =============================================================================
// FIXED EVENT CREATION
// =============================================================================

/**
 * Create fixed events from user preferences and commitments
 * These are locked events that cannot be moved
 */
export function createFixedEvents(input: SchedulerInput, blockedSlots: TimeSlot[]): ScheduleEvent[] {
  const events: ScheduleEvent[] = []

  // Add fixed commitments
  for (const commitment of input.commitments) {
    events.push({
      id: generateEventId(),
      type: 'fixed',
      title: commitment.title,
      slot: {
        dayOfWeek: commitment.dayOfWeek,
        startTime: commitment.startTime,
        endTime: commitment.endTime,
        durationMinutes: timeToMinutes(commitment.endTime) - timeToMinutes(commitment.startTime),
      },
      isLocked: true,
    })
  }

  // Add meal events
  const { preferences } = input
  for (let day = 0; day < DAYS_IN_WEEK; day++) {
    if (preferences.mealBreakfastStart && preferences.mealBreakfastDuration) {
      const start = timeToMinutes(preferences.mealBreakfastStart)
      events.push({
        id: generateEventId(),
        type: 'meal',
        title: 'Breakfast',
        slot: {
          dayOfWeek: day,
          startTime: preferences.mealBreakfastStart,
          endTime: minutesToTime(start + preferences.mealBreakfastDuration),
          durationMinutes: preferences.mealBreakfastDuration,
        },
        isLocked: true,
      })
    }

    if (preferences.mealLunchStart && preferences.mealLunchDuration) {
      const start = timeToMinutes(preferences.mealLunchStart)
      events.push({
        id: generateEventId(),
        type: 'meal',
        title: 'Lunch',
        slot: {
          dayOfWeek: day,
          startTime: preferences.mealLunchStart,
          endTime: minutesToTime(start + preferences.mealLunchDuration),
          durationMinutes: preferences.mealLunchDuration,
        },
        isLocked: true,
      })
    }

    if (preferences.mealDinnerStart && preferences.mealDinnerDuration) {
      const start = timeToMinutes(preferences.mealDinnerStart)
      events.push({
        id: generateEventId(),
        type: 'meal',
        title: 'Dinner',
        slot: {
          dayOfWeek: day,
          startTime: preferences.mealDinnerStart,
          endTime: minutesToTime(start + preferences.mealDinnerDuration),
          durationMinutes: preferences.mealDinnerDuration,
        },
        isLocked: true,
      })
    }
  }

  // Add commute events (weekdays only)
  for (let day = 1; day <= 5; day++) {
    if (preferences.commuteMorningStart && preferences.commuteMorningDuration) {
      const start = timeToMinutes(preferences.commuteMorningStart)
      events.push({
        id: generateEventId(),
        type: 'commute',
        title: 'Morning Commute',
        slot: {
          dayOfWeek: day,
          startTime: preferences.commuteMorningStart,
          endTime: minutesToTime(start + preferences.commuteMorningDuration),
          durationMinutes: preferences.commuteMorningDuration,
        },
        isLocked: true,
      })
    }

    if (preferences.commuteEveningStart && preferences.commuteEveningDuration) {
      const start = timeToMinutes(preferences.commuteEveningStart)
      events.push({
        id: generateEventId(),
        type: 'commute',
        title: 'Evening Commute',
        slot: {
          dayOfWeek: day,
          startTime: preferences.commuteEveningStart,
          endTime: minutesToTime(start + preferences.commuteEveningDuration),
          durationMinutes: preferences.commuteEveningDuration,
        },
        isLocked: true,
      })
    }
  }

  return events
}

// =============================================================================
// HABIT STACKING SUPPORT
// =============================================================================

/**
 * Create a slot immediately after an anchor event
 * Used for habit stacking (implementation intentions)
 */
export function createSlotAfter(
  anchorCommitment: FixedCommitment,
  bufferMinutes: number,
  durationMinutes: number
): TimeSlot {
  const anchorEnd = timeToMinutes(anchorCommitment.endTime)
  const slotStart = alignToGrid(anchorEnd + bufferMinutes)
  const alignedDuration = alignToGrid(durationMinutes) || SLOT_DURATION_MINUTES

  return {
    dayOfWeek: anchorCommitment.dayOfWeek,
    startTime: minutesToTime(slotStart),
    endTime: minutesToTime(slotStart + alignedDuration),
    durationMinutes: alignedDuration,
  }
}

/**
 * Create a slot immediately before an anchor event
 */
export function createSlotBefore(
  anchorCommitment: FixedCommitment,
  bufferMinutes: number,
  durationMinutes: number
): TimeSlot {
  const anchorStart = timeToMinutes(anchorCommitment.startTime)
  const alignedDuration = alignToGrid(durationMinutes) || SLOT_DURATION_MINUTES
  const slotEnd = alignToGrid(anchorStart - bufferMinutes)
  const slotStart = slotEnd - alignedDuration

  return {
    dayOfWeek: anchorCommitment.dayOfWeek,
    startTime: minutesToTime(slotStart),
    endTime: minutesToTime(slotEnd),
    durationMinutes: alignedDuration,
  }
}
