// Backtracking CSP Scheduler with Habit Stacking
// Phase 5: Scheduling Engine - Plan 01
// Implements constraint satisfaction with cognitive science principles

import {
  SchedulerInput,
  SchedulerResult,
  ScheduleEvent,
  WeekSchedule,
  GoalWithMetadata,
  TimeSlot,
  UnscheduledGoal,
  SchedulerStats,
  timeToMinutes,
  minutesToTime,
  generateEventId,
  DAYS_IN_WEEK,
  DEFAULT_DAY_START_HOUR,
  DEFAULT_DAY_END_HOUR,
} from './types'

import {
  buildBlockedSlots,
  getAllAvailableSlots,
  findAllValidSlots,
  canPlaceEvent,
  countValidPlacements,
  calculateRecoveryBuffer,
  createFixedEvents,
  createSlotAfter,
  createSlotBefore,
} from './constraints'

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_BACKTRACKS = 1000 // Prevent infinite search

// =============================================================================
// MAIN SCHEDULER FUNCTION
// =============================================================================

/**
 * Generate a weekly schedule using backtracking CSP
 *
 * Algorithm:
 * 1. Build blocked slots from preferences
 * 2. Initialize schedule with fixed events
 * 3. Schedule anchored goals FIRST (habit stacking)
 * 4. Sort remaining goals by MRV heuristic
 * 5. Apply deadline priority boost
 * 6. Use backtracking CSP solver for regular goals
 * 7. Calculate stats and return
 */
export function generateSchedule(input: SchedulerInput): SchedulerResult {
  // 1. Build blocked slots from preferences (with weekend sleep support)
  const blockedSlots = buildBlockedSlots(input)

  // 2. Initialize schedule with fixed events (meals, sleep, commitments, commute)
  const fixedEvents = createFixedEvents(input, blockedSlots)

  // 3. Get available slots for each day
  const availableByDay = getAllAvailableSlots(blockedSlots)

  // 4. Separate anchored goals from regular goals
  const { anchoredGoals, regularGoals } = partitionGoals(input.goals)

  // 5. Schedule anchored goals FIRST (habit stacking)
  const { events: anchoredEvents, unscheduled: anchoredUnscheduled } = scheduleAnchoredGoals(
    anchoredGoals,
    input.commitments,
    fixedEvents,
    availableByDay,
    input.preferences.bufferMinutes
  )

  // 6. Combine fixed and anchored events
  const baseEvents = [...fixedEvents, ...anchoredEvents]

  // 7. Sort remaining goals by MRV heuristic (most constrained first)
  const sortedGoals = sortByConstraintTightness(regularGoals, availableByDay, baseEvents, input.preferences.bufferMinutes)

  // 8. Add deadline-based priority boost
  const prioritizedGoals = applyDeadlinePriority(sortedGoals, input.weekStart)

  // 9. Use backtracking CSP solver for regular goals
  const backtrackCount = { count: 0 }
  const { scheduledEvents, unscheduled: regularUnscheduled } = backtrackSolveWithPartial(
    prioritizedGoals,
    availableByDay,
    baseEvents,
    input.preferences.bufferMinutes,
    backtrackCount
  )

  // 10. Build final schedule
  const allEvents = [...baseEvents, ...scheduledEvents]
  const schedule: WeekSchedule = {
    events: allEvents,
    weekStart: input.weekStart,
    generatedAt: new Date(),
  }

  // 11. Calculate stats
  const stats = calculateStats(schedule, availableByDay, backtrackCount.count)

  // 12. Combine unscheduled goals
  const unscheduledGoals = [...anchoredUnscheduled, ...regularUnscheduled]

  return {
    schedule,
    unscheduledGoals,
    stats,
  }
}

// =============================================================================
// GOAL PARTITIONING
// =============================================================================

/**
 * Separate goals into anchored and regular
 */
function partitionGoals(goals: GoalWithMetadata[]): {
  anchoredGoals: GoalWithMetadata[]
  regularGoals: GoalWithMetadata[]
} {
  const anchoredGoals: GoalWithMetadata[] = []
  const regularGoals: GoalWithMetadata[] = []

  for (const goal of goals) {
    if (goal.anchor && (goal.anchor.type === 'after_event' || goal.anchor.type === 'before_event')) {
      anchoredGoals.push(goal)
    } else {
      regularGoals.push(goal)
    }
  }

  return { anchoredGoals, regularGoals }
}

// =============================================================================
// HABIT STACKING (ANCHORED GOALS)
// =============================================================================

/**
 * Schedule goals anchored to fixed events
 * Implementation intentions research shows 40% faster habit formation
 */
function scheduleAnchoredGoals(
  anchoredGoals: GoalWithMetadata[],
  commitments: SchedulerInput['commitments'],
  existingEvents: ScheduleEvent[],
  availableByDay: Map<number, TimeSlot[]>,
  baseBuffer: number
): { events: ScheduleEvent[]; unscheduled: UnscheduledGoal[] } {
  const events: ScheduleEvent[] = []
  const unscheduled: UnscheduledGoal[] = []
  const allEvents = [...existingEvents]

  for (const goal of anchoredGoals) {
    if (!goal.anchor) continue

    // Find all instances of anchor event in the week
    const anchorInstances = commitments.filter((c) => c.id === goal.anchor!.anchorId)

    const sessionsNeeded = calculateSessionsNeeded(goal)
    let sessionsScheduled = 0

    for (const anchor of anchorInstances) {
      if (sessionsScheduled >= sessionsNeeded) break

      // Calculate recovery buffer for this goal
      const buffer = calculateRecoveryBuffer(goal, baseBuffer)

      // Calculate slot immediately after/before anchor
      const slot =
        goal.anchor.type === 'after_event'
          ? createSlotAfter(anchor, goal.anchor.bufferMinutes, goal.sessionStrategy.preferredDuration)
          : createSlotBefore(anchor, goal.anchor.bufferMinutes, goal.sessionStrategy.preferredDuration)

      // Check if slot is valid (within available time and no conflicts)
      const dayAvailable = availableByDay.get(slot.dayOfWeek) || []
      const isInAvailable = dayAvailable.some((avail) => {
        const availStart = timeToMinutes(avail.startTime)
        const availEnd = timeToMinutes(avail.endTime)
        const slotStart = timeToMinutes(slot.startTime)
        const slotEnd = timeToMinutes(slot.endTime)
        return slotStart >= availStart && slotEnd <= availEnd
      })

      if (isInAvailable && canPlaceEvent(slot, allEvents, buffer)) {
        const event: ScheduleEvent = {
          id: generateEventId(),
          type: 'goal',
          title: goal.title,
          slot,
          goalId: goal.id,
          realmId: goal.realmId,
          isLocked: false,
          cognitiveLoad: goal.cognitiveLoad,
          isAnchoredSession: true,
        }
        events.push(event)
        allEvents.push(event)
        sessionsScheduled++
      }
    }

    if (sessionsScheduled < sessionsNeeded) {
      unscheduled.push({
        goalId: goal.id,
        title: goal.title,
        reason: 'Anchor event unavailable or conflicts detected',
        sessionsRequested: sessionsNeeded,
        sessionsScheduled,
      })
    }
  }

  return { events, unscheduled }
}

// =============================================================================
// MRV HEURISTIC
// =============================================================================

/**
 * Sort goals by constraint tightness (Most Restricted Variable first)
 * Goals with fewer valid placements are scheduled first
 * This helps backtracking find failures faster
 */
function sortByConstraintTightness(
  goals: GoalWithMetadata[],
  availableByDay: Map<number, TimeSlot[]>,
  existingEvents: ScheduleEvent[],
  bufferMinutes: number
): GoalWithMetadata[] {
  return [...goals].sort((a, b) => {
    const aOptions = countValidPlacements(a, availableByDay, existingEvents, bufferMinutes)
    const bOptions = countValidPlacements(b, availableByDay, existingEvents, bufferMinutes)
    return aOptions - bOptions // Fewer options = more constrained = schedule first
  })
}

// =============================================================================
// DEADLINE PRIORITY
// =============================================================================

/**
 * Apply deadline-based priority boost
 * Goals with upcoming deadlines get scheduled earlier
 */
function applyDeadlinePriority(goals: GoalWithMetadata[], weekStart: Date): GoalWithMetadata[] {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  return [...goals].sort((a, b) => {
    // Hard deadlines this week get highest priority
    const aUrgent = isUrgentDeadline(a, weekStart, weekEnd)
    const bUrgent = isUrgentDeadline(b, weekStart, weekEnd)

    if (aUrgent && !bUrgent) return -1
    if (!aUrgent && bUrgent) return 1

    // Otherwise maintain MRV order
    return 0
  })
}

/**
 * Check if a goal has an urgent deadline
 */
function isUrgentDeadline(goal: GoalWithMetadata, weekStart: Date, weekEnd: Date): boolean {
  if (!goal.deadline || goal.deadlineType === 'none') return false

  const deadline = goal.deadline
  return deadline >= weekStart && deadline <= weekEnd && goal.deadlineType === 'hard'
}

// =============================================================================
// BACKTRACKING CSP SOLVER
// =============================================================================

/**
 * Backtracking solver that returns partial solution when complete solution not found
 */
function backtrackSolveWithPartial(
  goals: GoalWithMetadata[],
  availableByDay: Map<number, TimeSlot[]>,
  existingEvents: ScheduleEvent[],
  bufferMinutes: number,
  backtrackCount: { count: number }
): { scheduledEvents: ScheduleEvent[]; unscheduled: UnscheduledGoal[] } {
  const allScheduledEvents: ScheduleEvent[] = []
  const unscheduled: UnscheduledGoal[] = []
  const currentEvents = [...existingEvents]

  // Try to schedule each goal
  for (const goal of goals) {
    const sessionsNeeded = calculateSessionsNeeded(goal)
    const buffer = calculateRecoveryBuffer(goal, bufferMinutes)

    // Try to schedule all sessions for this goal using backtracking
    const result = backtrackScheduleGoal(
      goal,
      sessionsNeeded,
      availableByDay,
      currentEvents,
      buffer,
      backtrackCount
    )

    if (result.events.length > 0) {
      allScheduledEvents.push(...result.events)
      currentEvents.push(...result.events)
    }

    if (result.events.length < sessionsNeeded) {
      unscheduled.push({
        goalId: goal.id,
        title: goal.title,
        reason: result.events.length === 0
          ? 'No valid time slots available'
          : 'Insufficient time slots for all sessions',
        sessionsRequested: sessionsNeeded,
        sessionsScheduled: result.events.length,
      })
    }
  }

  return { scheduledEvents: allScheduledEvents, unscheduled }
}

/**
 * Backtracking solver for a single goal's sessions
 * Tries to distribute sessions across different days (spaced practice)
 */
function backtrackScheduleGoal(
  goal: GoalWithMetadata,
  sessionsNeeded: number,
  availableByDay: Map<number, TimeSlot[]>,
  existingEvents: ScheduleEvent[],
  bufferMinutes: number,
  backtrackCount: { count: number }
): { events: ScheduleEvent[] } {
  const events: ScheduleEvent[] = []

  // Try to spread sessions across different days for spaced practice
  const daysUsed = new Set<number>()

  for (let sessionIndex = 0; sessionIndex < sessionsNeeded; sessionIndex++) {
    if (backtrackCount.count >= MAX_BACKTRACKS) break

    // Find best slot for this session
    const slot = findBestSlot(
      goal,
      availableByDay,
      [...existingEvents, ...events],
      bufferMinutes,
      daysUsed,
      backtrackCount
    )

    if (slot) {
      const event: ScheduleEvent = {
        id: generateEventId(),
        type: 'goal',
        title: goal.title,
        slot,
        goalId: goal.id,
        realmId: goal.realmId,
        isLocked: false,
        cognitiveLoad: goal.cognitiveLoad,
        isAnchoredSession: false,
      }
      events.push(event)
      daysUsed.add(slot.dayOfWeek)
    }
  }

  return { events }
}

/**
 * Find the best slot for a goal session
 * Prefers days not yet used (spaced practice)
 */
function findBestSlot(
  goal: GoalWithMetadata,
  availableByDay: Map<number, TimeSlot[]>,
  existingEvents: ScheduleEvent[],
  bufferMinutes: number,
  daysUsed: Set<number>,
  backtrackCount: { count: number }
): TimeSlot | null {
  const sessionDuration = goal.sessionStrategy.preferredDuration

  // First try days not yet used (for spaced practice)
  const unusedDays = Array.from({ length: DAYS_IN_WEEK }, (_, i) => i).filter(
    (d) => !daysUsed.has(d)
  )
  const usedDays = Array.from(daysUsed)

  // Try unused days first, then used days
  const daysToTry = [...unusedDays, ...usedDays]

  for (const day of daysToTry) {
    backtrackCount.count++
    if (backtrackCount.count >= MAX_BACKTRACKS) return null

    const dayAvailable = availableByDay.get(day) || []
    const validSlots = findAllValidSlots(
      sessionDuration,
      dayAvailable,
      existingEvents,
      bufferMinutes,
      day
    )

    if (validSlots.length > 0) {
      // Return first valid slot for this day
      // (Could be enhanced to prefer energy-aligned slots in Plan 02)
      return validSlots[0]
    }
  }

  return null
}

/**
 * Full backtracking solve that finds complete solution
 * Returns null if no valid assignment exists
 * Used for testing backtracking correctness
 */
export function backtrackSolveFull(
  remainingGoals: GoalWithMetadata[],
  availableByDay: Map<number, TimeSlot[]>,
  assignments: ScheduleEvent[],
  bufferMinutes: number,
  backtrackCount: { count: number }
): ScheduleEvent[] | null {
  if (remainingGoals.length === 0) {
    return assignments // All goals scheduled successfully
  }

  if (backtrackCount.count++ > MAX_BACKTRACKS) {
    return null // Exceeded search budget
  }

  const goal = remainingGoals[0]
  const sessionsNeeded = calculateSessionsNeeded(goal)
  const buffer = calculateRecoveryBuffer(goal, bufferMinutes)

  // Get all valid placements for this goal's sessions
  const validPlacements = findAllValidPlacementsForGoal(
    goal,
    sessionsNeeded,
    availableByDay,
    assignments,
    buffer
  )

  // Try each placement combination
  for (const placement of validPlacements) {
    backtrackCount.count++
    if (backtrackCount.count > MAX_BACKTRACKS) return null

    const newEvents = placementToEvents(goal, placement)
    const newAssignments = [...assignments, ...newEvents]

    const result = backtrackSolveFull(
      remainingGoals.slice(1),
      availableByDay,
      newAssignments,
      bufferMinutes,
      backtrackCount
    )

    if (result !== null) return result
  }

  return null // Backtrack - no valid placement for this goal
}

/**
 * Find all valid placement combinations for a goal's sessions
 */
function findAllValidPlacementsForGoal(
  goal: GoalWithMetadata,
  sessionsNeeded: number,
  availableByDay: Map<number, TimeSlot[]>,
  existingEvents: ScheduleEvent[],
  bufferMinutes: number
): TimeSlot[][] {
  // Get all valid slots across all days
  const allValidSlots: TimeSlot[] = []
  for (let day = 0; day < DAYS_IN_WEEK; day++) {
    const dayAvailable = availableByDay.get(day) || []
    const validSlots = findAllValidSlots(
      goal.sessionStrategy.preferredDuration,
      dayAvailable,
      existingEvents,
      bufferMinutes,
      day
    )
    allValidSlots.push(...validSlots)
  }

  // Generate combinations of sessionsNeeded slots
  // For efficiency, limit combinations and prefer spreading across days
  return generateSlotCombinations(allValidSlots, sessionsNeeded, existingEvents, bufferMinutes)
}

/**
 * Generate valid combinations of slots for multiple sessions
 * Prefers spreading sessions across different days (spaced practice)
 */
function generateSlotCombinations(
  allSlots: TimeSlot[],
  count: number,
  existingEvents: ScheduleEvent[],
  bufferMinutes: number
): TimeSlot[][] {
  if (count === 0) return [[]]
  if (allSlots.length === 0) return []

  const combinations: TimeSlot[][] = []
  const MAX_COMBINATIONS = 100 // Limit for efficiency

  // Group slots by day for diversity preference
  const slotsByDay = new Map<number, TimeSlot[]>()
  for (const slot of allSlots) {
    const day = slot.dayOfWeek
    if (!slotsByDay.has(day)) slotsByDay.set(day, [])
    slotsByDay.get(day)!.push(slot)
  }

  // Generate combinations preferring different days
  function backtrack(current: TimeSlot[], startIdx: number, daysUsed: Set<number>) {
    if (combinations.length >= MAX_COMBINATIONS) return
    if (current.length === count) {
      combinations.push([...current])
      return
    }

    // First try slots from unused days
    for (let i = startIdx; i < allSlots.length; i++) {
      const slot = allSlots[i]

      // Skip if this slot would conflict with already selected slots
      const conflicts = current.some((s) => {
        if (s.dayOfWeek !== slot.dayOfWeek) return false
        const sStart = timeToMinutes(s.startTime)
        const sEnd = timeToMinutes(s.endTime)
        const slotStart = timeToMinutes(slot.startTime)
        const slotEnd = timeToMinutes(slot.endTime)
        return slotStart < sEnd + bufferMinutes && slotEnd + bufferMinutes > sStart
      })

      if (!conflicts) {
        const newDaysUsed = new Set(daysUsed)
        newDaysUsed.add(slot.dayOfWeek)
        current.push(slot)
        backtrack(current, i + 1, newDaysUsed)
        current.pop()
      }
    }
  }

  backtrack([], 0, new Set())
  return combinations
}

/**
 * Convert slot placement to schedule events
 */
function placementToEvents(goal: GoalWithMetadata, slots: TimeSlot[]): ScheduleEvent[] {
  return slots.map((slot) => ({
    id: generateEventId(),
    type: 'goal' as const,
    title: goal.title,
    slot,
    goalId: goal.id,
    realmId: goal.realmId,
    isLocked: false,
    cognitiveLoad: goal.cognitiveLoad,
    isAnchoredSession: false,
  }))
}

// =============================================================================
// SESSION CALCULATION
// =============================================================================

/**
 * Calculate number of sessions needed for a goal based on hours per week
 */
export function calculateSessionsNeeded(goal: GoalWithMetadata): number {
  const totalMinutes = goal.hoursPerWeek * 60
  const sessionDuration = goal.sessionStrategy.preferredDuration
  return Math.ceil(totalMinutes / sessionDuration)
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Calculate schedule statistics
 */
function calculateStats(
  schedule: WeekSchedule,
  availableByDay: Map<number, TimeSlot[]>,
  backtracksUsed: number
): SchedulerStats {
  // Calculate total available minutes
  let totalAvailableMinutes = 0
  for (let day = 0; day < DAYS_IN_WEEK; day++) {
    const dayAvailable = availableByDay.get(day) || []
    for (const slot of dayAvailable) {
      totalAvailableMinutes += slot.durationMinutes
    }
  }

  // Calculate scheduled minutes
  let scheduledMinutes = 0
  let goalMinutes = 0
  for (const event of schedule.events) {
    scheduledMinutes += event.slot.durationMinutes
    if (event.type === 'goal') {
      goalMinutes += event.slot.durationMinutes
    }
  }

  const utilizationPercent = totalAvailableMinutes > 0
    ? Math.round((goalMinutes / totalAvailableMinutes) * 100)
    : 0

  return {
    totalAvailableMinutes,
    scheduledMinutes,
    goalMinutes,
    utilizationPercent,
    backtracksUsed,
  }
}
