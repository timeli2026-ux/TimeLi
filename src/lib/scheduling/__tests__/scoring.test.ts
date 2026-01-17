// Tests for cognitive science-backed scoring system
// Phase 5: Scheduling Engine - Plan 02

import {
  scoreUltradianAlignment,
  scoreSpacedPractice,
  scoreConsistency,
  scoreDeepWorkProtection,
  scoreDecisionFatigue,
  scoreCommitmentStrength,
  scoreStability,
  scoreRealmBalance,
  scoreDeadlineProximity,
  scoreSlot,
  rankSlots,
  getDefaultWeights,
  calculatePlacementScore,
  getTopScoringFactors,
  ScoringContext,
  ScoringWeights,
  SlotScore,
} from '../scoring'

import {
  TimeSlot,
  ScheduleEvent,
  GoalWithMetadata,
  EnergyProfile,
  WeekSchedule,
  DEFAULT_SESSION_STRATEGY,
  CHRONOTYPE_PROFILES,
  timeToMinutes,
} from '../types'

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createGoal(overrides: Partial<GoalWithMetadata> = {}): GoalWithMetadata {
  return {
    id: 'goal-1',
    title: 'Test Goal',
    realmId: 'realm-1',
    hoursPerWeek: 3,
    cognitiveLoad: 'medium',
    requiresDeepWork: false,
    deadlineType: 'none',
    intensityLevel: 3,
    sessionStrategy: { ...DEFAULT_SESSION_STRATEGY },
    ...overrides,
  }
}

function createTimeSlot(
  dayOfWeek: number,
  startTime: string,
  durationMinutes: number = 60
): TimeSlot {
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = startMinutes + durationMinutes
  const hours = Math.floor(endMinutes / 60)
  const mins = endMinutes % 60
  const endTime = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`

  return {
    dayOfWeek,
    startTime,
    endTime,
    durationMinutes,
  }
}

function createScheduleEvent(
  overrides: Partial<ScheduleEvent> = {}
): ScheduleEvent {
  return {
    id: 'event-1',
    type: 'goal',
    title: 'Test Event',
    slot: createTimeSlot(1, '10:00', 60),
    isLocked: false,
    ...overrides,
  }
}

function createMealEvent(dayOfWeek: number, startTime: string): ScheduleEvent {
  return {
    id: `meal-${dayOfWeek}-${startTime}`,
    type: 'meal',
    title: 'Lunch',
    slot: createTimeSlot(dayOfWeek, startTime, 45),
    isLocked: true,
  }
}

function createScoringContext(overrides: Partial<ScoringContext> = {}): ScoringContext {
  return {
    goal: createGoal(),
    existingEvents: [],
    energyProfile: CHRONOTYPE_PROFILES['intermediate'],
    allGoals: [],
    weekStart: new Date('2024-01-15'),
    ...overrides,
  }
}

// =============================================================================
// ULTRADIAN ALIGNMENT TESTS
// =============================================================================

describe('scoreUltradianAlignment', () => {
  describe('peak window scoring', () => {
    it('scores high cognitive load in peak window highly', () => {
      const slot = createTimeSlot(1, '09:30', 60) // In intermediate peak (09:00-12:00)
      const context = createScoringContext({
        goal: createGoal({ cognitiveLoad: 'high' }),
        energyProfile: CHRONOTYPE_PROFILES['intermediate'],
      })

      const score = scoreUltradianAlignment(slot, context)
      expect(score).toBe(95)
    })

    it('scores medium cognitive load in peak window lower', () => {
      const slot = createTimeSlot(1, '09:30', 60)
      const context = createScoringContext({
        goal: createGoal({ cognitiveLoad: 'medium' }),
        energyProfile: CHRONOTYPE_PROFILES['intermediate'],
      })

      const score = scoreUltradianAlignment(slot, context)
      expect(score).toBe(75)
    })

    it('scores low cognitive load in peak window even lower', () => {
      const slot = createTimeSlot(1, '09:30', 60)
      const context = createScoringContext({
        goal: createGoal({ cognitiveLoad: 'low' }),
        energyProfile: CHRONOTYPE_PROFILES['intermediate'],
      })

      const score = scoreUltradianAlignment(slot, context)
      expect(score).toBe(60)
    })
  })

  describe('trough window scoring', () => {
    it('scores high cognitive load in trough very low', () => {
      const slot = createTimeSlot(1, '13:30', 60) // In intermediate trough (13:00-15:00)
      const context = createScoringContext({
        goal: createGoal({ cognitiveLoad: 'high' }),
        energyProfile: CHRONOTYPE_PROFILES['intermediate'],
      })

      const score = scoreUltradianAlignment(slot, context)
      expect(score).toBe(20)
    })

    it('scores low cognitive load in trough well', () => {
      const slot = createTimeSlot(1, '13:30', 60)
      const context = createScoringContext({
        goal: createGoal({ cognitiveLoad: 'low' }),
        energyProfile: CHRONOTYPE_PROFILES['intermediate'],
      })

      const score = scoreUltradianAlignment(slot, context)
      expect(score).toBe(80)
    })
  })

  describe('postprandial dip', () => {
    it('penalizes high cognitive tasks after meals', () => {
      // Slot starts at 13:00, which is 15 min after lunch ends at 12:45
      // The meal is from 12:00-12:45, so 13:00 is within 90 min of meal end
      const slot = createTimeSlot(1, '13:00', 60)
      const mealEvent = createMealEvent(1, '12:00') // Ends at 12:45

      // Use a custom energy profile that has no peak/trough at 13:00
      // to ensure we're testing postprandial dip, not trough
      const customProfile: EnergyProfile = {
        chronotype: 'intermediate',
        peakWindows: [
          { startTime: '06:00', endTime: '09:00', energyLevel: 5 },
        ],
        troughWindows: [
          { startTime: '20:00', endTime: '22:00', energyLevel: 2 },
        ],
      }

      const context = createScoringContext({
        goal: createGoal({ cognitiveLoad: 'high' }),
        existingEvents: [mealEvent],
        energyProfile: customProfile, // Custom profile to avoid trough overlap
      })

      const score = scoreUltradianAlignment(slot, context)
      expect(score).toBe(35)
    })
  })
})

// =============================================================================
// SPACED PRACTICE TESTS
// =============================================================================

describe('scoreSpacedPractice', () => {
  it('scores first session highly', () => {
    const slot = createTimeSlot(1, '10:00', 60)
    const context = createScoringContext({
      existingEvents: [], // No prior sessions
    })

    const score = scoreSpacedPractice(slot, context)
    expect(score).toBe(80)
  })

  it('penalizes same-day sessions severely', () => {
    const slot = createTimeSlot(1, '14:00', 60) // Same day as existing
    const existingSession = createScheduleEvent({
      goalId: 'goal-1',
      slot: createTimeSlot(1, '10:00', 60),
    })
    const context = createScoringContext({
      existingEvents: [existingSession],
      goal: createGoal({ id: 'goal-1' }),
    })

    const score = scoreSpacedPractice(slot, context)
    expect(score).toBe(20)
  })

  it('penalizes adjacent-day sessions for frequent goals', () => {
    const slot = createTimeSlot(2, '10:00', 60) // Tuesday
    const existingSession = createScheduleEvent({
      goalId: 'goal-1',
      slot: createTimeSlot(1, '10:00', 60), // Monday
    })
    const context = createScoringContext({
      existingEvents: [existingSession],
      goal: createGoal({
        id: 'goal-1',
        hoursPerWeek: 5, // 5 sessions/week means spacing matters
        sessionStrategy: { ...DEFAULT_SESSION_STRATEGY, preferredDuration: 60 },
      }),
    })

    const score = scoreSpacedPractice(slot, context)
    expect(score).toBeLessThan(70) // Adjacent day penalty
  })

  it('rewards optimal spacing (Mon-Wed-Fri pattern)', () => {
    // Goal with 3 sessions per week - optimal is ~2.3 day gaps
    const goal = createGoal({
      id: 'goal-1',
      hoursPerWeek: 3,
      sessionStrategy: { ...DEFAULT_SESSION_STRATEGY, preferredDuration: 60 },
    })

    // Existing session on Monday
    const mondaySession = createScheduleEvent({
      goalId: 'goal-1',
      slot: createTimeSlot(1, '10:00', 60), // Monday
    })

    // Wednesday slot (2-day gap from Monday)
    const wednesdaySlot = createTimeSlot(3, '10:00', 60)
    const context = createScoringContext({
      existingEvents: [mondaySession],
      goal,
    })

    const score = scoreSpacedPractice(wednesdaySlot, context)
    expect(score).toBeGreaterThanOrEqual(65) // Good spacing
  })
})

// =============================================================================
// CONSISTENCY TESTS
// =============================================================================

describe('scoreConsistency', () => {
  it('scores same time as existing sessions highly', () => {
    const slot = createTimeSlot(3, '10:00', 60) // Same time as existing
    const existingSession = createScheduleEvent({
      goalId: 'goal-1',
      slot: createTimeSlot(1, '10:00', 60), // Also at 10:00
    })
    const context = createScoringContext({
      existingEvents: [existingSession],
      goal: createGoal({ id: 'goal-1' }),
    })

    const score = scoreConsistency(slot, context)
    expect(score).toBeGreaterThanOrEqual(75) // Within 30 min = 90, within 60 min = 75
  })

  it('scores same slot as last week highest', () => {
    const slot = createTimeSlot(1, '10:00', 60)
    const previousWeekSchedule: WeekSchedule = {
      events: [
        createScheduleEvent({
          goalId: 'goal-1',
          slot: createTimeSlot(1, '10:00', 60), // Same day, same time
        }),
      ],
      weekStart: new Date('2024-01-08'),
      generatedAt: new Date(),
    }
    const context = createScoringContext({
      goal: createGoal({ id: 'goal-1' }),
      previousWeekSchedule,
    })

    const score = scoreConsistency(slot, context)
    expect(score).toBe(95)
  })

  it('scores no pattern neutrally', () => {
    const slot = createTimeSlot(1, '10:00', 60)
    const context = createScoringContext({
      existingEvents: [],
    })

    const score = scoreConsistency(slot, context)
    expect(score).toBe(50)
  })
})

// =============================================================================
// DEEP WORK PROTECTION TESTS
// =============================================================================

describe('scoreDeepWorkProtection', () => {
  it('returns neutral score for non-deep-work goals', () => {
    const slot = createTimeSlot(1, '10:00', 60)
    const context = createScoringContext({
      goal: createGoal({ requiresDeepWork: false }),
    })

    const score = scoreDeepWorkProtection(slot, context)
    expect(score).toBe(70)
  })

  it('scores 2+ hour block highest for deep work', () => {
    const slot = createTimeSlot(1, '09:00', 60) // No events until much later
    const context = createScoringContext({
      goal: createGoal({ requiresDeepWork: true }),
      existingEvents: [], // Plenty of contiguous time
    })

    const score = scoreDeepWorkProtection(slot, context)
    expect(score).toBe(100)
  })

  it('penalizes fragmented time for deep work', () => {
    // The slot is 10:00-11:00
    // For contiguous time calculation, we need an event AFTER the slot end time
    // that limits how much time is available starting from this slot
    const slot = createTimeSlot(1, '10:00', 60) // 10:00-11:00

    // Event at 10:45 starts DURING the slot but contiguous time is calculated
    // from slot start to next event start
    // So 10:00 to 10:45 = 45 minutes contiguous
    const blockingEvent = createScheduleEvent({
      slot: createTimeSlot(1, '10:45', 30), // 10:45-11:15
      isLocked: true,
    })
    const context = createScoringContext({
      goal: createGoal({ requiresDeepWork: true }),
      existingEvents: [blockingEvent],
    })

    const score = scoreDeepWorkProtection(slot, context)
    // With only 45 min contiguous (from 10:00 to 10:45), this should be low
    // 45 min < 60 min = score of 15
    expect(score).toBeLessThanOrEqual(15)
  })
})

// =============================================================================
// DECISION FATIGUE TESTS
// =============================================================================

describe('scoreDecisionFatigue', () => {
  it('scores first demanding task of day highly', () => {
    const slot = createTimeSlot(1, '09:00', 60)
    const context = createScoringContext({
      goal: createGoal({ cognitiveLoad: 'high' }),
      existingEvents: [],
    })

    const score = scoreDecisionFatigue(slot, context)
    expect(score).toBe(95)
  })

  it('penalizes third demanding task', () => {
    const slot = createTimeSlot(1, '15:00', 60)
    const priorTasks = [
      createScheduleEvent({
        slot: createTimeSlot(1, '09:00', 60),
        cognitiveLoad: 'high',
      }),
      createScheduleEvent({
        slot: createTimeSlot(1, '11:00', 60),
        cognitiveLoad: 'high',
      }),
    ]
    const context = createScoringContext({
      goal: createGoal({ cognitiveLoad: 'high' }),
      existingEvents: priorTasks,
    })

    const score = scoreDecisionFatigue(slot, context)
    expect(score).toBe(55)
  })

  it('applies late afternoon penalty', () => {
    const slot = createTimeSlot(1, '16:30', 60) // After 16:00
    const context = createScoringContext({
      goal: createGoal({ cognitiveLoad: 'high' }),
      existingEvents: [],
    })

    const score = scoreDecisionFatigue(slot, context)
    expect(score).toBe(80) // 95 - 15 afternoon penalty
  })

  it('is less affected for low cognitive tasks', () => {
    const slot = createTimeSlot(1, '15:00', 60)
    const priorTasks = [
      createScheduleEvent({
        slot: createTimeSlot(1, '09:00', 60),
        cognitiveLoad: 'high',
      }),
      createScheduleEvent({
        slot: createTimeSlot(1, '11:00', 60),
        cognitiveLoad: 'high',
      }),
    ]
    const context = createScoringContext({
      goal: createGoal({ cognitiveLoad: 'low' }),
      existingEvents: priorTasks,
    })

    const score = scoreDecisionFatigue(slot, context)
    expect(score).toBe(70) // Low cognitive not affected
  })
})

// =============================================================================
// COMMITMENT STRENGTH TESTS
// =============================================================================

describe('scoreCommitmentStrength', () => {
  it('boosts morning slots', () => {
    const morningSlot = createTimeSlot(1, '07:00', 60)
    const afternoonSlot = createTimeSlot(1, '14:00', 60)
    const context = createScoringContext()

    const morningScore = scoreCommitmentStrength(morningSlot, context)
    const afternoonScore = scoreCommitmentStrength(afternoonSlot, context)

    expect(morningScore).toBeGreaterThan(afternoonScore)
  })

  it('boosts slots adjacent to fixed events', () => {
    const slot = createTimeSlot(1, '10:15', 60) // Right after class ends at 10:00
    const fixedEvent = createScheduleEvent({
      slot: createTimeSlot(1, '09:00', 60),
      isLocked: true,
      title: 'Morning Class',
    })
    const context = createScoringContext({
      existingEvents: [fixedEvent],
    })

    const score = scoreCommitmentStrength(slot, context)
    expect(score).toBeGreaterThanOrEqual(65) // 50 + 15 for adjacent
  })

  it('penalizes late night slots', () => {
    const lateSlot = createTimeSlot(1, '21:30', 60)
    const context = createScoringContext()

    const score = scoreCommitmentStrength(lateSlot, context)
    expect(score).toBe(25) // 50 - 25 for late night
  })

  it('penalizes weekend slots', () => {
    const weekdaySlot = createTimeSlot(1, '14:00', 60) // Monday
    const weekendSlot = createTimeSlot(6, '14:00', 60) // Saturday
    const context = createScoringContext()

    const weekdayScore = scoreCommitmentStrength(weekdaySlot, context)
    const weekendScore = scoreCommitmentStrength(weekendSlot, context)

    expect(weekdayScore).toBeGreaterThan(weekendScore)
    expect(weekendScore).toBe(40) // 50 - 10 for weekend
  })
})

// =============================================================================
// STABILITY TESTS
// =============================================================================

describe('scoreStability', () => {
  it('scores same slot as last week highest', () => {
    const slot = createTimeSlot(1, '10:00', 60)
    const previousWeekSchedule: WeekSchedule = {
      events: [
        createScheduleEvent({
          goalId: 'goal-1',
          slot: createTimeSlot(1, '10:00', 60),
        }),
      ],
      weekStart: new Date('2024-01-08'),
      generatedAt: new Date(),
    }
    const context = createScoringContext({
      goal: createGoal({ id: 'goal-1' }),
      previousWeekSchedule,
    })

    const score = scoreStability(slot, context)
    expect(score).toBe(95)
  })

  it('scores same day different time moderately', () => {
    const slot = createTimeSlot(1, '14:00', 60) // Same day, different time
    const previousWeekSchedule: WeekSchedule = {
      events: [
        createScheduleEvent({
          goalId: 'goal-1',
          slot: createTimeSlot(1, '10:00', 60), // 10:00 vs 14:00 = 4 hour diff
        }),
      ],
      weekStart: new Date('2024-01-08'),
      generatedAt: new Date(),
    }
    const context = createScoringContext({
      goal: createGoal({ id: 'goal-1' }),
      previousWeekSchedule,
    })

    const score = scoreStability(slot, context)
    expect(score).toBe(65) // Same day, different time
  })

  it('scores different day low', () => {
    const slot = createTimeSlot(3, '10:00', 60) // Wednesday
    const previousWeekSchedule: WeekSchedule = {
      events: [
        createScheduleEvent({
          goalId: 'goal-1',
          slot: createTimeSlot(1, '10:00', 60), // Monday
        }),
      ],
      weekStart: new Date('2024-01-08'),
      generatedAt: new Date(),
    }
    const context = createScoringContext({
      goal: createGoal({ id: 'goal-1' }),
      previousWeekSchedule,
    })

    const score = scoreStability(slot, context)
    expect(score).toBe(40)
  })

  it('scores no history neutrally', () => {
    const slot = createTimeSlot(1, '10:00', 60)
    const context = createScoringContext({
      previousWeekSchedule: undefined,
    })

    const score = scoreStability(slot, context)
    expect(score).toBe(50)
  })
})

// =============================================================================
// REALM BALANCE TESTS
// =============================================================================

describe('scoreRealmBalance', () => {
  it('penalizes over-represented realms', () => {
    const slot = createTimeSlot(1, '10:00', 60)

    // Realm-1 already has 3 hours, realm-2 has 1 hour
    const existingEvents = [
      createScheduleEvent({ realmId: 'realm-1', slot: createTimeSlot(1, '08:00', 60) }),
      createScheduleEvent({ realmId: 'realm-1', slot: createTimeSlot(2, '08:00', 60) }),
      createScheduleEvent({ realmId: 'realm-1', slot: createTimeSlot(3, '08:00', 60) }),
      createScheduleEvent({ realmId: 'realm-2', slot: createTimeSlot(4, '08:00', 60) }),
    ]

    const allGoals = [
      createGoal({ id: 'g1', realmId: 'realm-1' }),
      createGoal({ id: 'g2', realmId: 'realm-2' }),
    ]

    const context = createScoringContext({
      goal: createGoal({ realmId: 'realm-1' }),
      existingEvents,
      allGoals,
    })

    const score = scoreRealmBalance(slot, context)
    expect(score).toBeLessThanOrEqual(60) // Over-represented
  })

  it('returns acceptable score for balanced realms', () => {
    const slot = createTimeSlot(1, '10:00', 60)

    const existingEvents = [
      createScheduleEvent({ realmId: 'realm-1', slot: createTimeSlot(1, '08:00', 60) }),
      createScheduleEvent({ realmId: 'realm-2', slot: createTimeSlot(2, '08:00', 60) }),
    ]

    const allGoals = [
      createGoal({ id: 'g1', realmId: 'realm-1' }),
      createGoal({ id: 'g2', realmId: 'realm-2' }),
    ]

    const context = createScoringContext({
      goal: createGoal({ realmId: 'realm-1' }),
      existingEvents,
      allGoals,
    })

    const score = scoreRealmBalance(slot, context)
    expect(score).toBeGreaterThanOrEqual(60)
  })
})

// =============================================================================
// DEADLINE PROXIMITY TESTS
// =============================================================================

describe('scoreDeadlineProximity', () => {
  it('scores urgent deadline early in week highly', () => {
    const mondaySlot = createTimeSlot(1, '10:00', 60) // Monday
    const deadline = new Date('2024-01-20') // 5 days from week start
    const context = createScoringContext({
      goal: createGoal({
        deadline,
        deadlineType: 'hard',
      }),
      weekStart: new Date('2024-01-15'),
    })

    const score = scoreDeadlineProximity(mondaySlot, context)
    expect(score).toBeGreaterThanOrEqual(90)
  })

  it('penalizes urgent deadline late in week', () => {
    const fridaySlot = createTimeSlot(5, '10:00', 60) // Friday
    const deadline = new Date('2024-01-20')
    const context = createScoringContext({
      goal: createGoal({
        deadline,
        deadlineType: 'hard',
      }),
      weekStart: new Date('2024-01-15'),
    })

    const score = scoreDeadlineProximity(fridaySlot, context)
    expect(score).toBeLessThan(60)
  })

  it('returns neutral score for no deadline', () => {
    const slot = createTimeSlot(1, '10:00', 60)
    const context = createScoringContext({
      goal: createGoal({
        deadline: undefined,
        deadlineType: 'none',
      }),
    })

    const score = scoreDeadlineProximity(slot, context)
    expect(score).toBe(50)
  })

  it('returns moderate score for distant deadline', () => {
    const slot = createTimeSlot(1, '10:00', 60)
    const deadline = new Date('2024-02-15') // Month away
    const context = createScoringContext({
      goal: createGoal({
        deadline,
        deadlineType: 'hard',
      }),
      weekStart: new Date('2024-01-15'),
    })

    const score = scoreDeadlineProximity(slot, context)
    expect(score).toBe(55)
  })
})

// =============================================================================
// COMBINED SCORING TESTS
// =============================================================================

describe('scoreSlot', () => {
  it('produces combined score with breakdown', () => {
    const slot = createTimeSlot(1, '10:00', 60)
    const context = createScoringContext()
    const weights = getDefaultWeights(context.goal)

    const result = scoreSlot(slot, context, weights)

    expect(result.slot).toEqual(slot)
    expect(result.totalScore).toBeGreaterThan(0)
    expect(Object.keys(result.breakdown)).toHaveLength(9)
  })

  it('weights sum to 1.0', () => {
    const goal = createGoal()
    const weights = getDefaultWeights(goal)

    const sum = Object.values(weights).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1.0, 10)
  })
})

describe('rankSlots', () => {
  it('ranks slots by total score descending', () => {
    // Create slots at different times
    const peakSlot = createTimeSlot(1, '09:30', 60) // Peak for intermediate
    const troughSlot = createTimeSlot(1, '13:30', 60) // Trough

    const context = createScoringContext({
      goal: createGoal({ cognitiveLoad: 'high' }),
      energyProfile: CHRONOTYPE_PROFILES['intermediate'],
    })

    const rankedSlots = rankSlots([troughSlot, peakSlot], context)

    // Peak slot should rank higher for high cognitive load
    expect(rankedSlots[0].slot).toEqual(peakSlot)
    expect(rankedSlots[1].slot).toEqual(troughSlot)
    expect(rankedSlots[0].totalScore).toBeGreaterThan(rankedSlots[1].totalScore)
  })
})

// =============================================================================
// DYNAMIC WEIGHTS TESTS
// =============================================================================

describe('getDefaultWeights', () => {
  it('prioritizes consistency for high intensity goals', () => {
    const fitnessGoal = createGoal({ intensityLevel: 5 })
    const weights = getDefaultWeights(fitnessGoal)

    expect(weights.consistency).toBeGreaterThanOrEqual(0.15)
    expect(weights.ultradianAlignment).toBeGreaterThanOrEqual(0.15)
  })

  it('prioritizes deep work protection for deep work goals', () => {
    const deepWorkGoal = createGoal({ requiresDeepWork: true })
    const weights = getDefaultWeights(deepWorkGoal)

    expect(weights.deepWorkProtection).toBe(0.25)
    expect(weights.decisionFatigue).toBe(0.20)
  })

  it('prioritizes deadline proximity for hard deadline goals', () => {
    const deadlineGoal = createGoal({
      deadline: new Date('2024-01-20'),
      deadlineType: 'hard',
    })
    const weights = getDefaultWeights(deadlineGoal)

    expect(weights.deadlineProximity).toBe(0.30)
  })

  it('uses balanced weights for regular goals', () => {
    const regularGoal = createGoal()
    const weights = getDefaultWeights(regularGoal)

    // All weights should be relatively even
    const values = Object.values(weights)
    const max = Math.max(...values)
    const min = Math.min(...values)
    expect(max - min).toBeLessThan(0.1) // Balanced within 10%
  })
})

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Integration: Scoring produces quality schedules', () => {
  it('prefers optimal placement for high cognitive tasks', () => {
    const slots = [
      createTimeSlot(1, '09:30', 60), // Peak window
      createTimeSlot(1, '13:30', 60), // Trough
      createTimeSlot(1, '16:00', 60), // After decision fatigue
    ]

    const context = createScoringContext({
      goal: createGoal({ cognitiveLoad: 'high', requiresDeepWork: true }),
      energyProfile: CHRONOTYPE_PROFILES['intermediate'],
    })

    const ranked = rankSlots(slots, context)

    // Peak window slot should be first
    expect(ranked[0].slot.startTime).toBe('09:30')
  })

  it('prefers spaced placements for multi-session goals', () => {
    // Goal with session on Monday
    const existingSession = createScheduleEvent({
      goalId: 'goal-1',
      slot: createTimeSlot(1, '10:00', 60),
    })

    const slots = [
      createTimeSlot(1, '14:00', 60), // Same day (bad)
      createTimeSlot(2, '10:00', 60), // Adjacent day (moderate)
      createTimeSlot(3, '10:00', 60), // 2-day gap (good)
    ]

    const context = createScoringContext({
      goal: createGoal({
        id: 'goal-1',
        hoursPerWeek: 3,
        sessionStrategy: { ...DEFAULT_SESSION_STRATEGY, preferredDuration: 60 },
      }),
      existingEvents: [existingSession],
    })

    const ranked = rankSlots(slots, context)

    // Same-day slot should be last
    const lastSlot = ranked[ranked.length - 1]
    expect(lastSlot.slot.dayOfWeek).toBe(1)
    expect(lastSlot.breakdown.spacedPractice).toBe(20)
  })

  it('calculatePlacementScore averages multiple slots', () => {
    const slots = [
      createTimeSlot(1, '09:30', 60),
      createTimeSlot(3, '09:30', 60),
    ]

    const context = createScoringContext()
    const score = calculatePlacementScore(slots, context)

    // Should be average of individual scores
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('getTopScoringFactors returns highest factors', () => {
    const breakdown = {
      ultradianAlignment: 95,
      spacedPractice: 80,
      consistency: 50,
      deepWorkProtection: 70,
      decisionFatigue: 95,
      commitmentStrength: 65,
      stability: 50,
      realmBalance: 75,
      deadlineProximity: 50,
    }

    const topFactors = getTopScoringFactors(breakdown, 3)

    expect(topFactors).toHaveLength(3)
    expect(topFactors[0].score).toBe(95)
    expect(topFactors[1].score).toBe(95)
    expect(topFactors[2].score).toBe(80)
  })
})

// =============================================================================
// CHRONOTYPE-SPECIFIC TESTS
// =============================================================================

describe('Chronotype-specific scoring', () => {
  it('early bird peaks score best in morning', () => {
    const morningSlot = createTimeSlot(1, '07:00', 60)
    const eveningSlot = createTimeSlot(1, '20:00', 60)

    const context = createScoringContext({
      goal: createGoal({ cognitiveLoad: 'high' }),
      energyProfile: CHRONOTYPE_PROFILES['early_bird'],
    })

    const morningScore = scoreUltradianAlignment(morningSlot, context)
    const eveningScore = scoreUltradianAlignment(eveningSlot, context)

    expect(morningScore).toBeGreaterThan(eveningScore)
  })

  it('night owl peaks score best in evening', () => {
    const morningSlot = createTimeSlot(1, '07:00', 60)
    const eveningSlot = createTimeSlot(1, '17:00', 60)

    const context = createScoringContext({
      goal: createGoal({ cognitiveLoad: 'high' }),
      energyProfile: CHRONOTYPE_PROFILES['night_owl'],
    })

    const morningScore = scoreUltradianAlignment(morningSlot, context)
    const eveningScore = scoreUltradianAlignment(eveningSlot, context)

    expect(eveningScore).toBeGreaterThan(morningScore)
  })
})
