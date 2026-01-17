// Infeasibility detection and minimum viable schedule generation
// Phase 5: Scheduling Engine - Plan 03
// Purpose: Ensure the scheduler NEVER silently drops goals

import {
  SchedulerInput,
  GoalWithMetadata,
  InfeasibilityReason,
  TradeOffOption,
  MinimumViableSchedule,
  InfeasibilitySeverity,
  InfeasibilityReport,
  WeekSchedule,
  DAYS_IN_WEEK,
  DEFAULT_DAY_START_HOUR,
  DEFAULT_DAY_END_HOUR,
} from './types'

import {
  buildBlockedSlots,
  getAllAvailableSlots,
} from './constraints'

import { generateSchedule } from './engine'

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.floor((date2.getTime() - date1.getTime()) / msPerDay)
}

/**
 * Calculate total available minutes in a week from scheduler input
 */
function calculateTotalAvailableMinutes(input: SchedulerInput): number {
  const blockedSlots = buildBlockedSlots(input)
  const availableByDay = getAllAvailableSlots(blockedSlots)

  let total = 0
  for (let day = 0; day < DAYS_IN_WEEK; day++) {
    const daySlots = availableByDay.get(day) || []
    for (const slot of daySlots) {
      total += slot.durationMinutes
    }
  }

  return total
}

/**
 * Calculate total required minutes from all goals
 */
function calculateTotalRequiredMinutes(goals: GoalWithMetadata[]): number {
  return goals.reduce((sum, g) => sum + (g.hoursPerWeek * 60), 0)
}

/**
 * Identify which goals contribute to overflow when time is insufficient
 * Returns goals sorted by lowest priority first (most likely to be dropped)
 */
function identifyOverflowGoals(
  goals: GoalWithMetadata[],
  availableMinutes: number
): GoalWithMetadata[] {
  const requiredMinutes = calculateTotalRequiredMinutes(goals)
  const overflowMinutes = requiredMinutes - availableMinutes

  if (overflowMinutes <= 0) return []

  // Sort goals by priority (hard deadline > high hours > others)
  const sortedGoals = [...goals].sort((a, b) => {
    // Hard deadlines have highest priority - keep them
    if (a.deadlineType === 'hard' && b.deadlineType !== 'hard') return -1
    if (b.deadlineType === 'hard' && a.deadlineType !== 'hard') return 1

    // Higher hours = higher priority (assumed)
    return b.hoursPerWeek - a.hoursPerWeek
  })

  // Find goals that would be dropped (lowest priority first)
  const overflowGoals: GoalWithMetadata[] = []
  let accumulatedMinutes = 0

  // Go from end (lowest priority) to identify what needs to be dropped
  for (let i = sortedGoals.length - 1; i >= 0 && accumulatedMinutes < overflowMinutes; i--) {
    const goal = sortedGoals[i]
    overflowGoals.push(goal)
    accumulatedMinutes += goal.hoursPerWeek * 60
  }

  return overflowGoals
}

// =============================================================================
// MAIN DETECTION FUNCTION
// =============================================================================

/**
 * Detect if the scheduling request is infeasible
 * Returns detailed report with reasons, trade-offs, and minimum viable schedule
 */
export function detectInfeasibility(input: SchedulerInput): InfeasibilityReport {
  const reasons: InfeasibilityReason[] = []

  // 1. Calculate total available minutes per week
  const availableMinutes = calculateTotalAvailableMinutes(input)

  // 2. Calculate total required minutes from all goals
  const requiredMinutes = calculateTotalRequiredMinutes(input.goals)

  // 3. Check overall capacity
  if (requiredMinutes > availableMinutes) {
    const overflowGoals = identifyOverflowGoals(input.goals, availableMinutes)
    for (const goal of overflowGoals) {
      reasons.push({
        type: 'insufficient_time',
        goalId: goal.id,
        goalTitle: goal.title,
        description: `Not enough available time to schedule all ${goal.hoursPerWeek} hours`,
        requiredMinutes: goal.hoursPerWeek * 60,
        availableMinutes: availableMinutes
      })
    }
  }

  // 4. Check deadline feasibility
  for (const goal of input.goals.filter(g => g.deadline && g.deadlineType === 'hard')) {
    const daysUntilDeadline = daysBetween(input.weekStart, goal.deadline!)
    const sessionsNeeded = Math.ceil(goal.hoursPerWeek * 60 / goal.sessionStrategy.preferredDuration)

    // If deadline is within the week and sessions needed exceed days
    if (daysUntilDeadline >= 0 && daysUntilDeadline < sessionsNeeded) {
      reasons.push({
        type: 'deadline_impossible',
        goalId: goal.id,
        goalTitle: goal.title,
        description: `Deadline in ${daysUntilDeadline} days but ${sessionsNeeded} sessions needed`,
        requiredMinutes: sessionsNeeded * goal.sessionStrategy.preferredDuration
      })
    }
  }

  // 5. Check anchor availability
  for (const goal of input.goals.filter(g => g.anchor)) {
    const anchorExists = input.commitments.some(c => c.id === goal.anchor!.anchorId)
    if (!anchorExists) {
      reasons.push({
        type: 'anchor_unavailable',
        goalId: goal.id,
        goalTitle: goal.title,
        description: `Anchor event not found in fixed commitments`,
        requiredMinutes: goal.hoursPerWeek * 60
      })
    }
  }

  // 6. Generate trade-offs for each reason
  const tradeOffs = generateTradeOffs(reasons, input)

  // 7. Calculate severity
  const severity = calculateSeverity(reasons, input)

  // 8. Generate minimum viable schedule
  const mvs = reasons.length > 0 ? generateMinimumViableSchedule(input, reasons) : undefined

  // 9. Generate human-readable summary
  const summary = generateSummary(reasons, severity, mvs)

  return {
    isInfeasible: reasons.length > 0,
    reasons,
    tradeOffs,
    severity,
    minimumViableSchedule: mvs,
    summary
  }
}

// =============================================================================
// TRADE-OFF GENERATION
// =============================================================================

/**
 * Generate trade-off options for infeasibility reasons
 * Uses benefit-focused language
 */
export function generateTradeOffs(
  reasons: InfeasibilityReason[],
  input: SchedulerInput
): TradeOffOption[] {
  const tradeOffs: TradeOffOption[] = []

  for (const reason of reasons) {
    const goal = input.goals.find(g => g.id === reason.goalId)!

    if (reason.type === 'insufficient_time') {
      // Option 1: Reduce duration per session
      const reducedDuration = Math.max(30, goal.sessionStrategy.preferredDuration - 15)
      const currentSessions = Math.ceil(goal.hoursPerWeek * 60 / goal.sessionStrategy.preferredDuration)
      const minutesSavedDuration = (goal.sessionStrategy.preferredDuration - reducedDuration) * currentSessions

      if (reducedDuration < goal.sessionStrategy.preferredDuration) {
        tradeOffs.push({
          id: `${reason.goalId}-reduce-duration`,
          description: `Shorten ${goal.title} sessions from ${goal.sessionStrategy.preferredDuration} to ${reducedDuration} minutes`,
          impact: `Saves ${minutesSavedDuration} minutes/week. Research shows sessions under 30 min are less effective.`,
          action: 'reduce_duration',
          goalId: goal.id,
          currentValue: goal.sessionStrategy.preferredDuration,
          suggestedValue: reducedDuration,
          minutesSaved: minutesSavedDuration
        })
      }

      // Option 2: Reduce frequency
      if (currentSessions > 1) {
        const reducedSessions = currentSessions - 1
        const newHoursPerWeek = (reducedSessions * goal.sessionStrategy.preferredDuration) / 60

        tradeOffs.push({
          id: `${reason.goalId}-reduce-frequency`,
          description: `Reduce ${goal.title} from ${currentSessions}x to ${reducedSessions}x per week`,
          impact: `Reduces weekly time from ${goal.hoursPerWeek}h to ${newHoursPerWeek.toFixed(1)}h. Spaced practice research suggests fewer, longer sessions can be equally effective.`,
          action: 'reduce_frequency',
          goalId: goal.id,
          currentValue: currentSessions,
          suggestedValue: reducedSessions,
          minutesSaved: goal.sessionStrategy.preferredDuration
        })
      }

      // Option 3: Skip goal (last resort)
      tradeOffs.push({
        id: `${reason.goalId}-skip`,
        description: `Remove ${goal.title} from this week`,
        impact: `Frees ${goal.hoursPerWeek * 60} minutes. Consider if this goal can wait.`,
        action: 'skip_goal',
        goalId: goal.id,
        minutesSaved: goal.hoursPerWeek * 60
      })
    }

    if (reason.type === 'deadline_impossible') {
      tradeOffs.push({
        id: `${reason.goalId}-extend-deadline`,
        description: `Extend deadline for ${goal.title}`,
        impact: `Allows proper spacing of sessions. Cramming is less effective than distributed practice.`,
        action: 'remove_deadline',
        goalId: goal.id,
        minutesSaved: 0 // Doesn't save time, but makes schedule possible
      })
    }

    if (reason.type === 'anchor_unavailable') {
      tradeOffs.push({
        id: `${reason.goalId}-remove-anchor`,
        description: `Remove habit anchor from ${goal.title}`,
        impact: `Allows flexible scheduling. Consider picking a new anchor event.`,
        action: 'change_anchor',
        goalId: goal.id,
        minutesSaved: 0
      })
    }
  }

  // Sort by impact: least disruptive first
  return tradeOffs.sort((a, b) => {
    const actionOrder: Record<TradeOffOption['action'], number> = {
      reduce_duration: 1,
      reduce_frequency: 2,
      remove_deadline: 3,
      change_anchor: 3,
      skip_goal: 4
    }
    return actionOrder[a.action] - actionOrder[b.action]
  })
}

// =============================================================================
// MINIMUM VIABLE SCHEDULE
// =============================================================================

/**
 * Generate a minimum viable schedule that includes as many goals as possible
 * Prioritizes goals with hard deadlines and higher hours
 */
export function generateMinimumViableSchedule(
  input: SchedulerInput,
  reasons: InfeasibilityReason[]
): MinimumViableSchedule {
  // Get goals that have issues
  const problematicGoalIds = new Set(reasons.map(r => r.goalId))

  // Sort goals by priority (deadline > hours > alphabetical)
  const sortedGoals = [...input.goals].sort((a, b) => {
    // Hard deadlines first
    if (a.deadlineType === 'hard' && b.deadlineType !== 'hard') return -1
    if (b.deadlineType === 'hard' && a.deadlineType !== 'hard') return 1

    // Then by hours (more hours = higher priority assumed)
    return b.hoursPerWeek - a.hoursPerWeek
  })

  // Try to schedule as many as possible
  const includedGoals: string[] = []
  const excludedGoals: string[] = []

  // Create input with only non-problematic goals first
  const safeGoals = sortedGoals.filter(g => !problematicGoalIds.has(g.id))
  const problematicGoals = sortedGoals.filter(g => problematicGoalIds.has(g.id))

  // Schedule safe goals first
  let currentGoals = [...safeGoals]
  let result = generateSchedule({ ...input, goals: currentGoals })

  for (const goal of safeGoals) {
    includedGoals.push(goal.id)
  }

  // Try to fit problematic goals one by one (sorted by priority)
  for (const goal of problematicGoals) {
    const testGoals = [...currentGoals, goal]
    const testResult = generateSchedule({ ...input, goals: testGoals })

    // Check if this goal was scheduled successfully
    const wasScheduled = !testResult.unscheduledGoals.some(u => u.goalId === goal.id)

    if (wasScheduled) {
      includedGoals.push(goal.id)
      currentGoals = testGoals
      result = testResult
    } else {
      excludedGoals.push(goal.id)
    }
  }

  // Calculate coverage
  const totalRequestedMinutes = input.goals.reduce((sum, g) => sum + g.hoursPerWeek * 60, 0)
  const includedMinutes = input.goals
    .filter(g => includedGoals.includes(g.id))
    .reduce((sum, g) => sum + g.hoursPerWeek * 60, 0)
  const coveragePercent = totalRequestedMinutes > 0
    ? Math.round((includedMinutes / totalRequestedMinutes) * 100)
    : 100

  return {
    schedule: result.schedule,
    includedGoals,
    excludedGoals,
    coveragePercent
  }
}

// =============================================================================
// SEVERITY CALCULATION
// =============================================================================

/**
 * Calculate severity of infeasibility
 */
export function calculateSeverity(
  reasons: InfeasibilityReason[],
  input: SchedulerInput
): InfeasibilitySeverity {
  if (reasons.length === 0) return 'mild'

  const totalGoals = input.goals.length
  if (totalGoals === 0) return 'mild'

  const affectedGoals = new Set(reasons.map(r => r.goalId)).size
  const percentAffected = affectedGoals / totalGoals

  // Check if any hard deadlines are impossible
  const hasImpossibleDeadline = reasons.some(r => r.type === 'deadline_impossible')

  if (hasImpossibleDeadline || percentAffected > 0.5) return 'severe'
  if (percentAffected > 0.25) return 'moderate'
  return 'mild'
}

// =============================================================================
// SUMMARY GENERATION
// =============================================================================

/**
 * Generate human-readable summary of infeasibility
 */
export function generateSummary(
  reasons: InfeasibilityReason[],
  severity: InfeasibilitySeverity,
  mvs?: MinimumViableSchedule
): string {
  if (reasons.length === 0) {
    return 'All goals can be scheduled this week.'
  }

  const goalCount = new Set(reasons.map(r => r.goalId)).size
  const summaryParts = [`${goalCount} goal${goalCount > 1 ? 's' : ''} cannot fit as requested.`]

  if (severity === 'severe') {
    summaryParts.push('Major adjustments needed.')
  } else if (severity === 'moderate') {
    summaryParts.push('Some adjustments recommended.')
  }

  if (mvs) {
    summaryParts.push(`Minimum viable schedule covers ${mvs.coveragePercent}% of your goals.`)
  }

  return summaryParts.join(' ')
}
