// Flexibility classification for schedule events
// Phase 5: Scheduling Engine - Plan 03
// Purpose: Help users understand what events can be moved and how easily

import {
  TimeSlot,
  ScheduleEvent,
  SchedulerInput,
  GoalWithMetadata,
  WeekSchedule,
  FlexibilityLevel,
  FlexibilityInfo,
  ScheduleEventWithFlexibility,
  ScheduleEventType,
  timeToMinutes,
  minutesToTime,
  DAYS_IN_WEEK,
} from './types'

import {
  buildBlockedSlots,
  getAllAvailableSlots,
  findAllValidSlots,
  canPlaceEvent,
} from './constraints'

// =============================================================================
// LOCKED EVENT EXPLANATIONS
// =============================================================================

/**
 * Get explanation for why a locked event cannot be moved
 */
function getLockedExplanation(type: ScheduleEventType): string {
  switch (type) {
    case 'sleep':
      return 'Sleep schedule is fixed'
    case 'meal':
      return 'Meal times are fixed'
    case 'fixed':
      return 'Fixed commitment cannot be moved'
    case 'commute':
      return 'Commute times are fixed'
    case 'buffer':
      return 'Buffer time is automatic'
    default:
      return 'This event is locked'
  }
}

// =============================================================================
// ALTERNATIVE SLOT COUNTING
// =============================================================================

/**
 * Count how many valid alternative slots exist for a goal session
 */
function countValidAlternatives(
  goal: GoalWithMetadata,
  currentSlot: TimeSlot,
  availableByDay: Map<number, TimeSlot[]>,
  existingEvents: ScheduleEvent[],
  bufferMinutes: number
): number {
  let count = 0
  const requiredDuration = goal.sessionStrategy.preferredDuration

  // Filter out the event at current slot from existing events
  const otherEvents = existingEvents.filter(e => {
    return !(e.slot.dayOfWeek === currentSlot.dayOfWeek &&
             e.slot.startTime === currentSlot.startTime &&
             e.slot.endTime === currentSlot.endTime)
  })

  for (let day = 0; day < DAYS_IN_WEEK; day++) {
    const daySlots = availableByDay.get(day) || []
    const validSlots = findAllValidSlots(
      requiredDuration,
      daySlots,
      otherEvents,
      bufferMinutes,
      day
    )

    for (const slot of validSlots) {
      // Skip current slot
      if (slot.dayOfWeek === currentSlot.dayOfWeek &&
          slot.startTime === currentSlot.startTime) {
        continue
      }

      // Check if this slot doesn't conflict with other events
      if (canPlaceEvent(slot, otherEvents, bufferMinutes)) {
        count++
      }
    }
  }

  return count
}

// =============================================================================
// MAIN CLASSIFICATION FUNCTION
// =============================================================================

/**
 * Classify the flexibility of a schedule event
 * Returns information about how easily the event can be rescheduled
 */
export function classifyFlexibility(
  event: ScheduleEvent,
  schedule: WeekSchedule,
  input: SchedulerInput
): FlexibilityInfo {
  // Fixed events (meals, sleep, commitments, commute) are always low flexibility
  if (event.isLocked) {
    return {
      level: 'low',
      alternativeSlots: 0,
      explanation: getLockedExplanation(event.type),
      canReschedule: false
    }
  }

  // Goal events: calculate alternatives
  const goal = input.goals.find(g => g.id === event.goalId)
  if (!goal) {
    return {
      level: 'medium',
      alternativeSlots: 0,
      explanation: 'Unknown goal',
      canReschedule: true
    }
  }

  // If anchored, flexibility is constrained
  if (event.isAnchoredSession) {
    return {
      level: 'low',
      alternativeSlots: 0,
      explanation: 'Habit-stacked to fixed event for consistency',
      canReschedule: false // Would break habit chain
    }
  }

  // Build available slots for the week
  const blockedSlots = buildBlockedSlots(input)
  const availableByDay = getAllAvailableSlots(blockedSlots)

  // Count alternative valid slots
  const validAlternatives = countValidAlternatives(
    goal,
    event.slot,
    availableByDay,
    schedule.events,
    input.preferences.bufferMinutes
  )

  // Classify based on alternatives
  if (validAlternatives <= 2) {
    return {
      level: 'low',
      alternativeSlots: validAlternatives,
      explanation: validAlternatives === 0
        ? 'No alternative time slots available this week'
        : `Only ${validAlternatives} other time slot${validAlternatives !== 1 ? 's' : ''} available this week`,
      canReschedule: validAlternatives > 0
    }
  }

  if (validAlternatives <= 5) {
    return {
      level: 'medium',
      alternativeSlots: validAlternatives,
      explanation: `${validAlternatives} alternative slots possible`,
      canReschedule: true
    }
  }

  return {
    level: 'high',
    alternativeSlots: validAlternatives,
    explanation: `Highly flexible - ${validAlternatives}+ alternative slots`,
    canReschedule: true
  }
}

// =============================================================================
// SCHEDULE ENHANCEMENT
// =============================================================================

/**
 * Add flexibility information to all events in a schedule
 */
export function addFlexibilityToSchedule(
  schedule: WeekSchedule,
  input: SchedulerInput
): WeekSchedule {
  const eventsWithFlexibility: ScheduleEventWithFlexibility[] = schedule.events.map(event => ({
    ...event,
    flexibility: classifyFlexibility(event, schedule, input)
  }))

  return {
    ...schedule,
    events: eventsWithFlexibility
  }
}

/**
 * Get flexibility summary for a schedule
 */
export function getFlexibilitySummary(
  schedule: WeekSchedule,
  input: SchedulerInput
): { low: number; medium: number; high: number; totalGoals: number } {
  const goalEvents = schedule.events.filter(e => e.type === 'goal')
  const summary = { low: 0, medium: 0, high: 0, totalGoals: goalEvents.length }

  for (const event of goalEvents) {
    const flexibility = classifyFlexibility(event, schedule, input)
    summary[flexibility.level]++
  }

  return summary
}

/**
 * Find the most flexible events that could be rescheduled
 * Useful for suggesting which events to move when there's a conflict
 */
export function findMostFlexibleEvents(
  schedule: WeekSchedule,
  input: SchedulerInput,
  limit: number = 3
): Array<{ event: ScheduleEvent; flexibility: FlexibilityInfo }> {
  const goalEvents = schedule.events.filter(e => e.type === 'goal')

  const withFlexibility = goalEvents.map(event => ({
    event,
    flexibility: classifyFlexibility(event, schedule, input)
  }))

  // Sort by flexibility (high first, then by number of alternatives)
  return withFlexibility
    .filter(item => item.flexibility.canReschedule)
    .sort((a, b) => {
      const levelOrder: Record<FlexibilityLevel, number> = { high: 3, medium: 2, low: 1 }
      const levelDiff = levelOrder[b.flexibility.level] - levelOrder[a.flexibility.level]
      if (levelDiff !== 0) return levelDiff
      return b.flexibility.alternativeSlots - a.flexibility.alternativeSlots
    })
    .slice(0, limit)
}
