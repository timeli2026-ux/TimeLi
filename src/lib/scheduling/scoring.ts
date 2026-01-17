// Cognitive science-backed soft constraint scoring
// Phase 5: Scheduling Engine - Plan 02
// Research: Kleitman (ultradian), Cepeda (spacing), Fogg (habits), Csikszentmihalyi (flow), Baumeister (ego depletion)

import {
  TimeSlot,
  TimeWindow,
  ScheduleEvent,
  GoalWithMetadata,
  EnergyProfile,
  WeekSchedule,
  CognitiveLoad,
  timeToMinutes,
  isWeekend,
  DAYS_IN_WEEK,
} from './types'

// =============================================================================
// SCORING TYPES
// =============================================================================

/**
 * Weights for each scoring factor
 * All weights should sum to 1.0
 */
export interface ScoringWeights {
  ultradianAlignment: number   // Energy/focus alignment (Kleitman)
  spacedPractice: number       // Distributed practice (Cepeda)
  consistency: number          // Habit formation (Fogg)
  deepWorkProtection: number   // Flow states (Csikszentmihalyi)
  decisionFatigue: number      // Willpower depletion (Baumeister)
  commitmentStrength: number   // Accountability (Rogers)
  stability: number            // Week-over-week consistency
  realmBalance: number         // Life area distribution
  deadlineProximity: number    // Urgency awareness
}

/**
 * Score for a single slot with breakdown by factor
 */
export interface SlotScore {
  slot: TimeSlot
  totalScore: number
  breakdown: Record<keyof ScoringWeights, number>
}

/**
 * Context needed for scoring a slot
 */
export interface ScoringContext {
  goal: GoalWithMetadata
  existingEvents: ScheduleEvent[]
  energyProfile: EnergyProfile
  previousWeekSchedule?: WeekSchedule
  allGoals: GoalWithMetadata[]
  weekStart: Date
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Calculate average of an array of numbers
 */
function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, val) => sum + val, 0) / values.length
}

/**
 * Get the midpoint of a time slot in minutes since midnight
 */
function getSlotMidpointMinutes(slot: TimeSlot): number {
  const start = timeToMinutes(slot.startTime)
  const end = timeToMinutes(slot.endTime)
  return Math.floor((start + end) / 2)
}

/**
 * Check if a time (in minutes) falls within a time window
 */
function isTimeInWindow(timeMinutes: number, window: TimeWindow): boolean {
  const windowStart = timeToMinutes(window.startTime)
  const windowEnd = timeToMinutes(window.endTime)
  return timeMinutes >= windowStart && timeMinutes < windowEnd
}

/**
 * Check if slot is in post-meal window (30-90 min after meals)
 */
function isPostMealWindow(slot: TimeSlot, existingEvents: ScheduleEvent[]): boolean {
  const slotStart = timeToMinutes(slot.startTime)

  const meals = existingEvents.filter(
    e => e.type === 'meal' && e.slot.dayOfWeek === slot.dayOfWeek
  )

  for (const meal of meals) {
    const mealEnd = timeToMinutes(meal.slot.endTime)
    const postMealStart = mealEnd // Right after meal
    const postMealEnd = mealEnd + 90 // 90 min after meal ends

    if (slotStart >= postMealStart && slotStart < postMealEnd) {
      return true
    }
  }

  return false
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.floor((date2.getTime() - date1.getTime()) / msPerDay)
}

/**
 * Find contiguous available time from a slot
 * This measures how much uninterrupted time is available starting from this slot
 */
function calculateContiguousAvailable(
  slot: TimeSlot,
  existingEvents: ScheduleEvent[]
): number {
  const slotStart = timeToMinutes(slot.startTime)
  const slotEnd = timeToMinutes(slot.endTime)

  // Find events on the same day that start after our slot starts
  const dayEvents = existingEvents
    .filter(e => e.slot.dayOfWeek === slot.dayOfWeek)
    .map(e => ({
      start: timeToMinutes(e.slot.startTime),
      end: timeToMinutes(e.slot.endTime)
    }))
    .filter(e => e.start > slotStart) // Only events that start after this slot starts
    .sort((a, b) => a.start - b.start)

  // Find the first event that starts after our slot start
  // This determines how much contiguous time we have
  let contiguousEnd = slotEnd

  for (const event of dayEvents) {
    // First event after slot start limits contiguous time
    contiguousEnd = event.start
    break
  }

  // If no event found after, use end of typical work day (23:00 = 1380)
  if (dayEvents.length === 0) {
    contiguousEnd = 1380 // 23:00
  }

  return contiguousEnd - slotStart
}

// =============================================================================
// SCORING FUNCTIONS (each returns 0-100)
// =============================================================================

/**
 * 1. Score ultradian alignment (Kleitman's Basic Rest-Activity Cycle)
 * High cognitive tasks during peak windows, low tasks during troughs
 */
export function scoreUltradianAlignment(slot: TimeSlot, context: ScoringContext): number {
  const { goal, energyProfile, existingEvents } = context
  const slotMidpoint = getSlotMidpointMinutes(slot)

  // Check if slot falls in peak window
  for (const peak of energyProfile.peakWindows) {
    if (isTimeInWindow(slotMidpoint, peak)) {
      // High cognitive load during peaks = optimal
      if (goal.cognitiveLoad === 'high') return 95
      if (goal.cognitiveLoad === 'medium') return 75
      return 60 // Low load OK but not optimal
    }
  }

  // Check if slot falls in trough window
  for (const trough of energyProfile.troughWindows) {
    if (isTimeInWindow(slotMidpoint, trough)) {
      // Only low cognitive load during troughs
      if (goal.cognitiveLoad === 'low') return 80
      if (goal.cognitiveLoad === 'medium') return 50
      return 20 // High load during trough = bad
    }
  }

  // Postprandial dip: penalize demanding tasks 30-90 min after meals
  if (isPostMealWindow(slot, existingEvents) && goal.cognitiveLoad === 'high') {
    return 35
  }

  return 60 // neutral time
}

/**
 * 2. Score spaced practice (Ebbinghaus, Cepeda et al.)
 * Distribute sessions across week for better retention
 */
export function scoreSpacedPractice(slot: TimeSlot, context: ScoringContext): number {
  const { goal, existingEvents } = context
  const goalSessions = existingEvents.filter(e => e.goalId === goal.id)

  if (goalSessions.length === 0) return 80 // First session, any day fine

  // Calculate optimal gap based on sessions per week
  const sessionsPerWeek = Math.ceil(goal.hoursPerWeek * 60 / goal.sessionStrategy.preferredDuration)
  const optimalGapDays = sessionsPerWeek > 0 ? 7 / sessionsPerWeek : 7 // e.g., 3 sessions = 2.33 day gaps

  // Find minimum gap from any existing session
  let minGap = DAYS_IN_WEEK
  for (const session of goalSessions) {
    // Calculate circular distance (for wrapping around the week)
    const rawGap = Math.abs(slot.dayOfWeek - session.slot.dayOfWeek)
    const gap = Math.min(rawGap, DAYS_IN_WEEK - rawGap)
    minGap = Math.min(minGap, gap)
  }

  // Penalize clustering (same day = very bad for learning)
  if (minGap === 0) return 20

  // Penalize adjacent days for multi-session goals
  if (minGap === 1 && sessionsPerWeek >= 3) return 50

  // Calculate deviation from optimal
  const deviation = Math.abs(minGap - optimalGapDays)

  // Reward near-optimal spacing
  if (deviation < 0.5) return 95
  if (deviation < 1.0) return 80
  if (deviation < 1.5) return 65

  return Math.max(30, 80 - deviation * 20)
}

/**
 * 3. Score consistency (Fogg, habit formation)
 * Same time = stronger habit cue
 */
export function scoreConsistency(slot: TimeSlot, context: ScoringContext): number {
  const { goal, existingEvents, previousWeekSchedule } = context

  // Check existing sessions this week for time consistency
  const goalSessions = existingEvents.filter(e => e.goalId === goal.id)

  if (goalSessions.length > 0) {
    // Prefer same time as other sessions (habit cue)
    const avgStartTime = average(goalSessions.map(s => timeToMinutes(s.slot.startTime)))
    const thisStartTime = timeToMinutes(slot.startTime)
    const timeDiff = Math.abs(avgStartTime - thisStartTime)

    if (timeDiff <= 30) return 90 // Within 30 min of habit time
    if (timeDiff <= 60) return 75
    if (timeDiff <= 120) return 55
  }

  // Check previous week for established patterns
  if (previousWeekSchedule) {
    const prevSessions = previousWeekSchedule.events.filter(e => e.goalId === goal.id)
    for (const prev of prevSessions) {
      if (prev.slot.dayOfWeek === slot.dayOfWeek) {
        const timeDiff = Math.abs(
          timeToMinutes(prev.slot.startTime) - timeToMinutes(slot.startTime)
        )
        if (timeDiff <= 60) return 95 // Same day, same time = strong habit
      }
    }
  }

  return 50 // No pattern yet
}

/**
 * 4. Score deep work protection (Csikszentmihalyi, Newport)
 * Deep work needs uninterrupted blocks
 */
export function scoreDeepWorkProtection(slot: TimeSlot, context: ScoringContext): number {
  const { goal, existingEvents } = context

  if (!goal.requiresDeepWork) return 70 // Not applicable

  // Deep work needs 90+ minutes uninterrupted
  const contiguousAvailable = calculateContiguousAvailable(slot, existingEvents)

  if (contiguousAvailable < 60) return 15 // Too fragmented
  if (contiguousAvailable < 90) return 40 // Below minimum
  if (contiguousAvailable >= 120) return 100 // Ideal 2-hour block
  return 75 // 90-120 min acceptable
}

/**
 * 5. Score decision fatigue (Baumeister ego depletion)
 * High cognitive tasks earlier when willpower is fresh
 */
export function scoreDecisionFatigue(slot: TimeSlot, context: ScoringContext): number {
  const { goal, existingEvents } = context

  if (goal.cognitiveLoad !== 'high') return 70 // Less affected

  // Count high-cognitive-load events already scheduled before this slot
  const priorHighLoad = existingEvents.filter(e =>
    e.slot.dayOfWeek === slot.dayOfWeek &&
    timeToMinutes(e.slot.endTime) <= timeToMinutes(slot.startTime) &&
    e.cognitiveLoad === 'high'
  ).length

  // More prior demanding tasks = more depleted willpower
  let score: number
  if (priorHighLoad === 0) score = 95 // Fresh willpower
  else if (priorHighLoad === 1) score = 75
  else if (priorHighLoad === 2) score = 55
  else score = 30 // Ego depleted, poor time for demanding work

  // Late afternoon penalty (daily willpower lowest)
  if (timeToMinutes(slot.startTime) >= timeToMinutes('16:00')) {
    score -= 15
  }

  return clamp(score, 0, 100)
}

/**
 * 6. Score commitment strength (Rogers, accountability)
 * When are people most likely to follow through?
 */
export function scoreCommitmentStrength(slot: TimeSlot, context: ScoringContext): number {
  const { existingEvents } = context
  let score = 50

  // Morning slots (habit formation research - more consistent)
  if (slot.startTime >= '06:00' && slot.startTime <= '10:00') score += 20

  // After fixed commitments (natural accountability trigger)
  const adjacentFixed = existingEvents.find(e =>
    e.isLocked &&
    e.slot.dayOfWeek === slot.dayOfWeek &&
    Math.abs(timeToMinutes(e.slot.endTime) - timeToMinutes(slot.startTime)) <= 30
  )
  if (adjacentFixed) score += 15

  // Avoid late-night (lowest follow-through rates)
  if (slot.startTime >= '21:00') score -= 25

  // Weekday preference (weekend schedules less consistent)
  if (isWeekend(slot.dayOfWeek)) score -= 10

  return clamp(score, 0, 100)
}

/**
 * 7. Score stability (week-over-week consistency)
 * Same slot as last week = easier to maintain
 */
export function scoreStability(slot: TimeSlot, context: ScoringContext): number {
  const { goal, previousWeekSchedule } = context

  if (!previousWeekSchedule) return 50 // No history

  const prevSlots = previousWeekSchedule.events
    .filter(e => e.goalId === goal.id)
    .map(e => e.slot)

  for (const prevSlot of prevSlots) {
    if (prevSlot.dayOfWeek === slot.dayOfWeek) {
      const timeDiff = Math.abs(
        timeToMinutes(prevSlot.startTime) - timeToMinutes(slot.startTime)
      )
      if (timeDiff <= 30) return 95 // Same day, nearly same time
      if (timeDiff <= 60) return 80 // Same day, within hour
      return 65 // Same day, different time
    }
  }

  return 40 // Different day than last week
}

/**
 * 8. Score realm balance (life area distribution)
 * Don't over-schedule one area of life
 */
export function scoreRealmBalance(slot: TimeSlot, context: ScoringContext): number {
  const { goal, existingEvents, allGoals } = context

  // Calculate minutes scheduled per realm
  const realmMinutes = new Map<string, number>()
  for (const event of existingEvents) {
    if (event.realmId) {
      const current = realmMinutes.get(event.realmId) || 0
      realmMinutes.set(event.realmId, current + event.slot.durationMinutes)
    }
  }

  const totalScheduled = Array.from(realmMinutes.values()).reduce((a, b) => a + b, 0)
  if (totalScheduled === 0) return 70 // No data yet

  const thisRealmMinutes = realmMinutes.get(goal.realmId) || 0
  const currentPercentage = thisRealmMinutes / totalScheduled

  // Get unique realms count
  const uniqueRealms = new Set(allGoals.map(g => g.realmId)).size
  const avgPercentage = uniqueRealms > 0 ? 1 / uniqueRealms : 1

  // Penalize over-represented realms
  if (currentPercentage > avgPercentage * 1.5) return 40
  if (currentPercentage > avgPercentage * 1.2) return 60

  return 75 // Acceptable balance
}

/**
 * 9. Score deadline proximity (urgency awareness)
 * Urgent deadlines = schedule earlier in week
 */
export function scoreDeadlineProximity(slot: TimeSlot, context: ScoringContext): number {
  const { goal, weekStart } = context

  if (!goal.deadline) return 50 // No deadline

  const daysUntilDeadline = daysBetween(weekStart, goal.deadline)

  if (daysUntilDeadline <= 7) {
    // Urgent - schedule early in week
    const dayPenalty = slot.dayOfWeek * 10 // Monday=0 becomes 10, Sunday=60
    return Math.max(40, 100 - dayPenalty)
  }

  if (daysUntilDeadline <= 14) {
    // Soon - slight preference for earlier
    return 70 - (slot.dayOfWeek * 3)
  }

  return 55 // Not urgent
}

// =============================================================================
// COMBINED SCORING
// =============================================================================

/**
 * Score a single slot with all factors
 */
export function scoreSlot(
  slot: TimeSlot,
  context: ScoringContext,
  weights: ScoringWeights
): SlotScore {
  const breakdown = {
    ultradianAlignment: scoreUltradianAlignment(slot, context),
    spacedPractice: scoreSpacedPractice(slot, context),
    consistency: scoreConsistency(slot, context),
    deepWorkProtection: scoreDeepWorkProtection(slot, context),
    decisionFatigue: scoreDecisionFatigue(slot, context),
    commitmentStrength: scoreCommitmentStrength(slot, context),
    stability: scoreStability(slot, context),
    realmBalance: scoreRealmBalance(slot, context),
    deadlineProximity: scoreDeadlineProximity(slot, context)
  }

  const totalScore = Object.entries(breakdown).reduce((sum, [key, score]) => {
    return sum + score * weights[key as keyof ScoringWeights]
  }, 0)

  return { slot, totalScore, breakdown }
}

/**
 * Rank all slots by their score
 */
export function rankSlots(
  slots: TimeSlot[],
  context: ScoringContext,
  weights?: ScoringWeights
): SlotScore[] {
  const effectiveWeights = weights || getDefaultWeights(context.goal)
  return slots
    .map(slot => scoreSlot(slot, context, effectiveWeights))
    .sort((a, b) => b.totalScore - a.totalScore)
}

// =============================================================================
// DYNAMIC WEIGHT CALCULATION
// =============================================================================

/**
 * Get default weights based on goal characteristics
 * Weights sum to 1.0
 */
export function getDefaultWeights(goal: GoalWithMetadata): ScoringWeights {
  // Physical/fitness goals - prioritize consistency and commitment
  if (goal.intensityLevel >= 4) {
    return {
      ultradianAlignment: 0.20,
      spacedPractice: 0.15,
      consistency: 0.20, // Habit formation critical
      deepWorkProtection: 0.05,
      decisionFatigue: 0.05,
      commitmentStrength: 0.15,
      stability: 0.10,
      realmBalance: 0.05,
      deadlineProximity: 0.05
    }
  }

  // Deep work goals - prioritize focus time and decision fatigue
  if (goal.requiresDeepWork) {
    return {
      ultradianAlignment: 0.15,
      spacedPractice: 0.10,
      consistency: 0.10,
      deepWorkProtection: 0.25, // Critical
      decisionFatigue: 0.20,   // Important
      commitmentStrength: 0.05,
      stability: 0.05,
      realmBalance: 0.05,
      deadlineProximity: 0.05
    }
  }

  // Goals with hard deadline - prioritize deadline proximity
  if (goal.deadline && goal.deadlineType === 'hard') {
    return {
      ultradianAlignment: 0.10,
      spacedPractice: 0.10,
      consistency: 0.10,
      deepWorkProtection: 0.10,
      decisionFatigue: 0.10,
      commitmentStrength: 0.10,
      stability: 0.05,
      realmBalance: 0.05,
      deadlineProximity: 0.30 // Critical
    }
  }

  // Default balanced weights
  return {
    ultradianAlignment: 0.12,
    spacedPractice: 0.12,
    consistency: 0.12,
    deepWorkProtection: 0.12,
    decisionFatigue: 0.12,
    commitmentStrength: 0.10,
    stability: 0.10,
    realmBalance: 0.10,
    deadlineProximity: 0.10
  }
}

/**
 * Calculate the average score for a placement (multiple slots)
 */
export function calculatePlacementScore(
  slots: TimeSlot[],
  context: ScoringContext,
  weights?: ScoringWeights
): number {
  if (slots.length === 0) return 0

  const effectiveWeights = weights || getDefaultWeights(context.goal)
  const scores = slots.map(slot => scoreSlot(slot, context, effectiveWeights))
  return average(scores.map(s => s.totalScore))
}

/**
 * Get top scoring factors from a breakdown
 */
export function getTopScoringFactors(
  breakdown: Record<keyof ScoringWeights, number>,
  count: number = 3
): Array<{ factor: keyof ScoringWeights; score: number }> {
  return Object.entries(breakdown)
    .map(([factor, score]) => ({ factor: factor as keyof ScoringWeights, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
}
