// Scheduling type definitions for cognitive science-backed scheduling
// Phase 5: Scheduling Engine - Plan 01

// =============================================================================
// CONSTANTS
// =============================================================================

export const SLOT_DURATION_MINUTES = 15
export const DAYS_IN_WEEK = 7
export const MINUTES_IN_DAY = 24 * 60
export const DEFAULT_DAY_START_HOUR = 6
export const DEFAULT_DAY_END_HOUR = 23

// =============================================================================
// CORE TIME TYPES
// =============================================================================

/**
 * Represents a time slot in the weekly schedule
 * All times are in HH:mm format
 */
export interface TimeSlot {
  dayOfWeek: number // 0=Sunday, 6=Saturday
  startTime: string // HH:mm format
  endTime: string // HH:mm format
  durationMinutes: number
}

/**
 * A window of time with associated energy level
 * Used for chronotype-based scheduling
 */
export interface TimeWindow {
  startTime: string // HH:mm format
  endTime: string // HH:mm format
  energyLevel: 1 | 2 | 3 | 4 | 5 // 1=trough, 5=peak
}

// =============================================================================
// ENERGY & COGNITIVE SCIENCE TYPES
// =============================================================================

/**
 * User's chronotype - affects when high-energy tasks should be scheduled
 * Based on Kleitman's Basic Rest-Activity Cycle (BRAC)
 */
export type Chronotype = 'early_bird' | 'night_owl' | 'intermediate'

/**
 * Cognitive load level for a goal
 * Used for decision fatigue awareness (Baumeister research)
 */
export type CognitiveLoad = 'high' | 'medium' | 'low'

/**
 * Energy profile based on chronotype
 * Supports ultradian rhythm scheduling (90-120 min cycles)
 */
export interface EnergyProfile {
  chronotype: Chronotype
  peakWindows: TimeWindow[] // User's high-energy periods
  troughWindows: TimeWindow[] // Post-meal, afternoon dip, etc.
}

/**
 * Default energy profiles by chronotype
 * Based on circadian rhythm research
 */
export const CHRONOTYPE_PROFILES: Record<Chronotype, EnergyProfile> = {
  early_bird: {
    chronotype: 'early_bird',
    peakWindows: [
      { startTime: '06:00', endTime: '10:00', energyLevel: 5 },
      { startTime: '10:00', endTime: '12:00', energyLevel: 4 },
    ],
    troughWindows: [
      { startTime: '13:00', endTime: '15:00', energyLevel: 2 }, // Post-lunch dip
      { startTime: '19:00', endTime: '22:00', energyLevel: 2 }, // Evening decline
    ],
  },
  night_owl: {
    chronotype: 'night_owl',
    peakWindows: [
      { startTime: '16:00', endTime: '20:00', energyLevel: 5 },
      { startTime: '20:00', endTime: '23:00', energyLevel: 4 },
    ],
    troughWindows: [
      { startTime: '06:00', endTime: '10:00', energyLevel: 2 }, // Morning grogginess
      { startTime: '13:00', endTime: '15:00', energyLevel: 2 }, // Post-lunch dip
    ],
  },
  intermediate: {
    chronotype: 'intermediate',
    peakWindows: [
      { startTime: '09:00', endTime: '12:00', energyLevel: 5 },
      { startTime: '15:00', endTime: '18:00', energyLevel: 4 },
    ],
    troughWindows: [
      { startTime: '13:00', endTime: '15:00', energyLevel: 2 }, // Post-lunch dip
      { startTime: '20:00', endTime: '22:00', energyLevel: 3 }, // Evening wind-down
    ],
  },
}

// =============================================================================
// SESSION STRATEGY TYPES
// =============================================================================

/**
 * Default session strategy based on cognitive science research
 * - Minimum 30 min: Research shows <30 min sessions have poor outcomes
 * - Maximum 90 min: Aligns with ultradian rhythm cycles
 */
export const DEFAULT_SESSION_STRATEGY: SessionStrategy = {
  preferredDuration: 60,
  minimumDuration: 30, // Cognitive science: <30 min sessions ineffective
  maximumDuration: 90, // Ultradian rhythm cap
  allowSplitting: true,
}

/**
 * Session strategy for distributed practice (Cepeda et al. research)
 */
export interface SessionStrategy {
  preferredDuration: number // minutes
  minimumDuration: number // never split below this (research: <30 min poor outcomes)
  maximumDuration: number // ultradian cap (90-120 min)
  allowSplitting: boolean
}

// =============================================================================
// GOAL & ANCHOR TYPES
// =============================================================================

/**
 * Habit stacking / Implementation intentions support (Fogg, Gollwitzer)
 * Anchoring goals to fixed events leads to 40% faster habit formation
 */
export interface GoalAnchor {
  type: 'after_event' | 'before_event'
  anchorId: string // ID of fixed commitment
  bufferMinutes: number // gap between anchor and goal
}

/**
 * Goal with all metadata needed for scheduling
 */
export interface GoalWithMetadata {
  id: string
  title: string
  realmId: string
  hoursPerWeek: number
  cognitiveLoad: CognitiveLoad
  requiresDeepWork: boolean
  deadline?: Date
  deadlineType: 'hard' | 'soft' | 'none'
  anchor?: GoalAnchor
  intensityLevel: 1 | 2 | 3 | 4 | 5
  sessionStrategy: SessionStrategy
}

// =============================================================================
// SCHEDULE TYPES
// =============================================================================

/**
 * Types of events that can appear in a schedule
 */
export type ScheduleEventType = 'goal' | 'fixed' | 'meal' | 'sleep' | 'commute' | 'buffer'

/**
 * Rationale for why an event was scheduled at a specific time
 * Generated by the scoring system to explain placements to users
 */
export interface EventRationale {
  primary: string      // Main reason shown in UI (1 line, action-focused, <60 chars)
  secondary?: string   // Optional deeper explanation on hover/expand (<120 chars)
  factors: string[]    // Top 2-3 scoring factors that influenced placement
}

/**
 * A single event in the schedule
 */
export interface ScheduleEvent {
  id: string
  type: ScheduleEventType
  title: string
  slot: TimeSlot
  goalId?: string
  realmId?: string
  isLocked: boolean // true for non-goal events
  cognitiveLoad?: CognitiveLoad
  isAnchoredSession?: boolean // true if scheduled via habit stacking
  rationale?: EventRationale // Explanation for this placement (for goal events)
}

/**
 * Complete weekly schedule
 */
export interface WeekSchedule {
  events: ScheduleEvent[]
  weekStart: Date // Monday
  generatedAt: Date
}

// =============================================================================
// SCHEDULER I/O TYPES
// =============================================================================

/**
 * User preferences from database
 */
export interface UserPreferences {
  timezone: string
  sleepStart: string
  sleepEnd: string
  weekendSleepStart?: string | null
  weekendSleepEnd?: string | null
  chronotype: Chronotype
  bufferMinutes: number
  // Meals
  mealBreakfastStart?: string | null
  mealBreakfastDuration?: number | null
  mealLunchStart?: string | null
  mealLunchDuration?: number | null
  mealDinnerStart?: string | null
  mealDinnerDuration?: number | null
  // Commute
  commuteMorningStart?: string | null
  commuteMorningDuration?: number | null
  commuteEveningStart?: string | null
  commuteEveningDuration?: number | null
}

/**
 * Fixed commitment from database
 */
export interface FixedCommitment {
  id: string
  title: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isRecurring: boolean
}

/**
 * Input to the scheduler
 */
export interface SchedulerInput {
  preferences: UserPreferences // from DB
  commitments: FixedCommitment[] // from DB
  goals: GoalWithMetadata[] // from DB with enhancements
  weekStart: Date // Monday of the week to schedule
  previousWeekSchedule?: WeekSchedule // for stability scoring
}

/**
 * Goal that could not be fully scheduled
 */
export interface UnscheduledGoal {
  goalId: string
  title: string
  reason: string
  sessionsRequested: number
  sessionsScheduled: number
}

/**
 * Statistics about the generated schedule
 */
export interface SchedulerStats {
  totalAvailableMinutes: number
  scheduledMinutes: number
  goalMinutes: number
  utilizationPercent: number
  backtracksUsed: number
}

/**
 * Result from the scheduler
 */
export interface SchedulerResult {
  schedule: WeekSchedule
  unscheduledGoals: UnscheduledGoal[]
  stats: SchedulerStats
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert HH:mm time string to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Convert minutes since midnight to HH:mm time string
 */
export function minutesToTime(minutes: number): string {
  const normalizedMinutes = ((minutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY
  const hours = Math.floor(normalizedMinutes / 60)
  const mins = normalizedMinutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Check if two time slots overlap
 */
export function slotsOverlap(a: TimeSlot, b: TimeSlot): boolean {
  if (a.dayOfWeek !== b.dayOfWeek) return false

  const aStart = timeToMinutes(a.startTime)
  const aEnd = timeToMinutes(a.endTime)
  const bStart = timeToMinutes(b.startTime)
  const bEnd = timeToMinutes(b.endTime)

  // Handle overnight slots (e.g., sleep from 23:00 to 07:00)
  // For simplicity in non-sleep contexts, assume no overnight slots
  return aStart < bEnd && bStart < aEnd
}

/**
 * Check if a day is a weekend day
 */
export function isWeekend(dayOfWeek: number): boolean {
  return dayOfWeek === 0 || dayOfWeek === 6 // Sunday or Saturday
}

/**
 * Get energy profile for a given chronotype
 */
export function getEnergyProfileForChronotype(chronotype: Chronotype): EnergyProfile {
  return CHRONOTYPE_PROFILES[chronotype]
}

/**
 * Align time to 15-minute grid
 */
export function alignToGrid(minutes: number): number {
  return Math.floor(minutes / SLOT_DURATION_MINUTES) * SLOT_DURATION_MINUTES
}

/**
 * Get day name from day of week number
 */
export function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayOfWeek]
}

/**
 * Generate a unique ID for events
 */
export function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

// =============================================================================
// INFEASIBILITY TYPES
// =============================================================================

/**
 * Reason why a goal cannot be scheduled
 */
export interface InfeasibilityReason {
  type: 'insufficient_time' | 'hard_conflict' | 'deadline_impossible' | 'anchor_unavailable'
  goalId: string
  goalTitle: string
  description: string
  requiredMinutes: number
  availableMinutes?: number
  conflictingGoalId?: string
}

/**
 * Trade-off option to resolve infeasibility
 * Uses benefit-focused language
 */
export interface TradeOffOption {
  id: string
  description: string
  impact: string // Human-readable impact description
  action: 'reduce_duration' | 'reduce_frequency' | 'skip_goal' | 'remove_deadline' | 'change_anchor'
  goalId: string
  currentValue?: number
  suggestedValue?: number
  minutesSaved: number
}

/**
 * Minimum viable schedule when all goals cannot fit
 */
export interface MinimumViableSchedule {
  schedule: WeekSchedule
  includedGoals: string[] // Goal IDs that fit
  excludedGoals: string[] // Goal IDs that don't fit
  coveragePercent: number // What % of requested goal hours are covered
}

/**
 * Severity level of infeasibility
 */
export type InfeasibilitySeverity = 'mild' | 'moderate' | 'severe'

/**
 * Complete report on schedule infeasibility
 */
export interface InfeasibilityReport {
  isInfeasible: boolean
  reasons: InfeasibilityReason[]
  tradeOffs: TradeOffOption[]
  severity: InfeasibilitySeverity
  minimumViableSchedule?: MinimumViableSchedule // What CAN be scheduled
  summary: string // Human-readable summary
}

// =============================================================================
// FLEXIBILITY TYPES
// =============================================================================

/**
 * How flexible an event is for rescheduling
 */
export type FlexibilityLevel = 'low' | 'medium' | 'high'

/**
 * Information about event flexibility
 */
export interface FlexibilityInfo {
  level: FlexibilityLevel
  alternativeSlots: number
  explanation: string
  canReschedule: boolean
}

/**
 * Schedule event with flexibility information
 */
export interface ScheduleEventWithFlexibility extends ScheduleEvent {
  flexibility: FlexibilityInfo
}

/**
 * Create a TimeSlot from components
 */
export function createTimeSlot(
  dayOfWeek: number,
  startMinutes: number,
  durationMinutes: number
): TimeSlot {
  const alignedStart = alignToGrid(startMinutes)
  const alignedDuration = alignToGrid(durationMinutes) || SLOT_DURATION_MINUTES
  return {
    dayOfWeek,
    startTime: minutesToTime(alignedStart),
    endTime: minutesToTime(alignedStart + alignedDuration),
    durationMinutes: alignedDuration,
  }
}
