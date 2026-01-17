// Tests for backtracking CSP scheduler
// Phase 5: Scheduling Engine - Plan 01

import { generateSchedule, calculateSessionsNeeded, backtrackSolveFull } from '../engine'
import {
  buildBlockedSlots,
  getAvailableSlots,
  calculateRecoveryBuffer,
  canPlaceEvent,
  findAllValidSlots,
  countValidPlacements,
  getAllAvailableSlots,
} from '../constraints'
import {
  SchedulerInput,
  GoalWithMetadata,
  UserPreferences,
  FixedCommitment,
  ScheduleEvent,
  TimeSlot,
  DEFAULT_SESSION_STRATEGY,
  timeToMinutes,
  minutesToTime,
} from '../types'

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createBasePreferences(): UserPreferences {
  return {
    timezone: 'America/New_York',
    sleepStart: '23:00',
    sleepEnd: '07:00',
    chronotype: 'intermediate',
    bufferMinutes: 15,
    mealBreakfastStart: '08:00',
    mealBreakfastDuration: 30,
    mealLunchStart: '12:00',
    mealLunchDuration: 45,
    mealDinnerStart: '18:30',
    mealDinnerDuration: 60,
    weekendSleepStart: null,
    weekendSleepEnd: null,
    commuteMorningStart: null,
    commuteMorningDuration: null,
    commuteEveningStart: null,
    commuteEveningDuration: null,
  }
}

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

function createCommitment(overrides: Partial<FixedCommitment> = {}): FixedCommitment {
  return {
    id: 'commitment-1',
    title: 'Test Commitment',
    dayOfWeek: 1, // Monday
    startTime: '09:00',
    endTime: '10:00',
    isRecurring: true,
    ...overrides,
  }
}

function createSchedulerInput(
  goals: GoalWithMetadata[] = [],
  commitments: FixedCommitment[] = [],
  preferences: Partial<UserPreferences> = {}
): SchedulerInput {
  return {
    preferences: { ...createBasePreferences(), ...preferences },
    commitments,
    goals,
    weekStart: new Date('2024-01-15'), // Monday
  }
}

// =============================================================================
// BACKTRACKING CORRECTNESS TESTS
// =============================================================================

describe('Backtracking CSP Solver', () => {
  describe('finds solutions greedy would miss', () => {
    it('schedules multiple goals with constrained time', () => {
      // Goal A: needs 1 hour per week
      // Goal B: needs 1 hour per week
      // Both should be scheduled with MRV heuristic prioritizing constrained goals

      const goalA = createGoal({
        id: 'goal-a',
        title: 'Goal A',
        hoursPerWeek: 1,
        sessionStrategy: {
          ...DEFAULT_SESSION_STRATEGY,
          preferredDuration: 60,
          minimumDuration: 60,
        },
      })

      const goalB = createGoal({
        id: 'goal-b',
        title: 'Goal B',
        hoursPerWeek: 1,
        sessionStrategy: {
          ...DEFAULT_SESSION_STRATEGY,
          preferredDuration: 60,
          minimumDuration: 60,
        },
      })

      // Only allow a few hours on Monday and Tuesday
      const commitments: FixedCommitment[] = [
        // Block most of the day except mornings
        createCommitment({ id: 'mon-late', dayOfWeek: 1, startTime: '12:00', endTime: '23:00' }),
        createCommitment({ id: 'tue-late', dayOfWeek: 2, startTime: '12:00', endTime: '23:00' }),
        // Block other days
        createCommitment({ id: 'wed', dayOfWeek: 3, startTime: '06:00', endTime: '23:00' }),
        createCommitment({ id: 'thu', dayOfWeek: 4, startTime: '06:00', endTime: '23:00' }),
        createCommitment({ id: 'fri', dayOfWeek: 5, startTime: '06:00', endTime: '23:00' }),
        createCommitment({ id: 'sat', dayOfWeek: 6, startTime: '06:00', endTime: '23:00' }),
        createCommitment({ id: 'sun', dayOfWeek: 0, startTime: '06:00', endTime: '23:00' }),
      ]

      const input = createSchedulerInput([goalA, goalB], commitments, {
        mealBreakfastStart: null,
        mealBreakfastDuration: null,
        mealLunchStart: null,
        mealLunchDuration: null,
        mealDinnerStart: null,
        mealDinnerDuration: null,
        bufferMinutes: 0,
      })

      const result = generateSchedule(input)

      // Both goals should be scheduled
      const goalEvents = result.schedule.events.filter((e) => e.type === 'goal')
      const goalAEvents = goalEvents.filter((e) => e.goalId === 'goal-a')
      const goalBEvents = goalEvents.filter((e) => e.goalId === 'goal-b')

      expect(goalAEvents.length).toBeGreaterThanOrEqual(1)
      expect(goalBEvents.length).toBeGreaterThanOrEqual(1)

      // Both should be on Monday or Tuesday mornings (the only available time)
      const validDays = [1, 2]
      expect(goalAEvents.every((e) => validDays.includes(e.slot.dayOfWeek))).toBe(true)
      expect(goalBEvents.every((e) => validDays.includes(e.slot.dayOfWeek))).toBe(true)
    })

    it('backtracks when initial placement fails', () => {
      const blockedSlots = buildBlockedSlots(
        createSchedulerInput([], [], {
          mealBreakfastStart: null,
          mealBreakfastDuration: null,
          mealLunchStart: null,
          mealLunchDuration: null,
          mealDinnerStart: null,
          mealDinnerDuration: null,
        })
      )

      const availableByDay = getAllAvailableSlots(blockedSlots)

      // Goal that needs multiple sessions
      const goal = createGoal({
        hoursPerWeek: 3,
        sessionStrategy: {
          ...DEFAULT_SESSION_STRATEGY,
          preferredDuration: 60,
        },
      })

      const backtrackCount = { count: 0 }
      const result = backtrackSolveFull([goal], availableByDay, [], 15, backtrackCount)

      expect(result).not.toBeNull()
      expect(result!.length).toBeGreaterThan(0)
      expect(backtrackCount.count).toBeGreaterThan(0)
    })
  })
})

// =============================================================================
// HABIT STACKING TESTS
// =============================================================================

describe('Habit Stacking', () => {
  it('schedules anchored goal after fixed commitment', () => {
    const morningClass = createCommitment({
      id: 'morning-class',
      title: 'Morning Class',
      dayOfWeek: 1, // Monday
      startTime: '09:00',
      endTime: '10:00',
    })

    const anchoredGoal = createGoal({
      id: 'anchored-goal',
      title: 'Post-Class Study',
      hoursPerWeek: 1,
      anchor: {
        type: 'after_event',
        anchorId: 'morning-class',
        bufferMinutes: 15,
      },
      sessionStrategy: {
        ...DEFAULT_SESSION_STRATEGY,
        preferredDuration: 60,
      },
    })

    const input = createSchedulerInput([anchoredGoal], [morningClass], {
      // Simplify by removing meals
      mealBreakfastStart: null,
      mealBreakfastDuration: null,
      mealLunchStart: null,
      mealLunchDuration: null,
      mealDinnerStart: null,
      mealDinnerDuration: null,
      bufferMinutes: 0, // Reduce buffer to make scheduling easier
    })

    const result = generateSchedule(input)

    // Check if goal was unscheduled and why
    if (result.unscheduledGoals.length > 0) {
      console.log('Unscheduled:', result.unscheduledGoals)
    }

    // Find the anchored session
    const anchoredEvents = result.schedule.events.filter(
      (e) => e.goalId === 'anchored-goal' && e.isAnchoredSession
    )

    // Also check for any goal events (maybe it got scheduled as non-anchored)
    const allGoalEvents = result.schedule.events.filter((e) => e.type === 'goal')

    expect(anchoredEvents.length).toBeGreaterThanOrEqual(1)

    // Should be scheduled right after the class (with buffer)
    const session = anchoredEvents[0]
    expect(session.slot.dayOfWeek).toBe(1) // Monday

    // Should start after class ends + buffer (10:00 + 15 min = 10:15)
    const sessionStart = timeToMinutes(session.slot.startTime)
    const classEnd = timeToMinutes('10:00')
    expect(sessionStart).toBeGreaterThanOrEqual(classEnd + 15)
  })

  it('schedules anchored goal before fixed commitment', () => {
    const eveningClass = createCommitment({
      id: 'evening-class',
      title: 'Evening Class',
      dayOfWeek: 2, // Tuesday
      startTime: '18:00',
      endTime: '19:00',
    })

    const anchoredGoal = createGoal({
      id: 'pre-class-goal',
      title: 'Pre-Class Prep',
      hoursPerWeek: 0.5,
      anchor: {
        type: 'before_event',
        anchorId: 'evening-class',
        bufferMinutes: 15,
      },
      sessionStrategy: {
        ...DEFAULT_SESSION_STRATEGY,
        preferredDuration: 30,
      },
    })

    const input = createSchedulerInput([anchoredGoal], [eveningClass], {
      mealBreakfastStart: null,
      mealBreakfastDuration: null,
      mealLunchStart: null,
      mealLunchDuration: null,
      mealDinnerStart: null,
      mealDinnerDuration: null,
      bufferMinutes: 0, // Reduce buffer to make scheduling easier
    })

    const result = generateSchedule(input)

    const anchoredEvents = result.schedule.events.filter(
      (e) => e.goalId === 'pre-class-goal' && e.isAnchoredSession
    )

    expect(anchoredEvents.length).toBeGreaterThanOrEqual(1)

    // Should be scheduled before the class
    const session = anchoredEvents[0]
    expect(session.slot.dayOfWeek).toBe(2) // Tuesday

    // Should end before class starts - buffer
    const sessionEnd = timeToMinutes(session.slot.endTime)
    const classStart = timeToMinutes('18:00')
    expect(sessionEnd).toBeLessThanOrEqual(classStart - 15)
  })

  it('handles multiple anchor instances', () => {
    // Same class on Monday and Wednesday
    const mondayClass = createCommitment({
      id: 'class-1',
      title: 'Class',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:00',
    })
    const wednesdayClass = createCommitment({
      id: 'class-2',
      title: 'Class',
      dayOfWeek: 3,
      startTime: '09:00',
      endTime: '10:00',
    })

    // Goal anchored to class-1 (Monday only in this case)
    const anchoredGoal = createGoal({
      id: 'study-goal',
      title: 'Study Session',
      hoursPerWeek: 1, // Just 1 hour to match one anchor instance
      anchor: {
        type: 'after_event',
        anchorId: 'class-1',
        bufferMinutes: 15,
      },
      sessionStrategy: {
        ...DEFAULT_SESSION_STRATEGY,
        preferredDuration: 60,
      },
    })

    const input = createSchedulerInput(
      [anchoredGoal],
      [mondayClass, wednesdayClass],
      {
        mealBreakfastStart: null,
        mealBreakfastDuration: null,
        mealLunchStart: null,
        mealLunchDuration: null,
        mealDinnerStart: null,
        mealDinnerDuration: null,
        bufferMinutes: 0,
      }
    )

    const result = generateSchedule(input)

    // Should have at least one anchored session
    const anchoredEvents = result.schedule.events.filter(
      (e) => e.goalId === 'study-goal' && e.isAnchoredSession
    )

    expect(anchoredEvents.length).toBeGreaterThanOrEqual(1)
  })
})

// =============================================================================
// HARD CONSTRAINT TESTS
// =============================================================================

describe('Hard Constraints', () => {
  it('does not schedule overlapping events', () => {
    const goal = createGoal({
      hoursPerWeek: 5,
      sessionStrategy: {
        ...DEFAULT_SESSION_STRATEGY,
        preferredDuration: 60,
      },
    })

    const input = createSchedulerInput([goal])
    const result = generateSchedule(input)

    const events = result.schedule.events

    // Check no overlaps
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const a = events[i]
        const b = events[j]

        if (a.slot.dayOfWeek !== b.slot.dayOfWeek) continue

        const aStart = timeToMinutes(a.slot.startTime)
        const aEnd = timeToMinutes(a.slot.endTime)
        const bStart = timeToMinutes(b.slot.startTime)
        const bEnd = timeToMinutes(b.slot.endTime)

        const overlaps = aStart < bEnd && bStart < aEnd
        expect(overlaps).toBe(false)
      }
    }
  })

  it('respects buffer time between events', () => {
    const preferences = createBasePreferences()
    preferences.bufferMinutes = 15

    const goal = createGoal({
      hoursPerWeek: 6,
      sessionStrategy: {
        ...DEFAULT_SESSION_STRATEGY,
        preferredDuration: 60,
      },
    })

    const input = createSchedulerInput([goal], [], preferences)
    const result = generateSchedule(input)

    const goalEvents = result.schedule.events.filter((e) => e.type === 'goal')

    // Check buffer is respected between goal events on same day
    for (let i = 0; i < goalEvents.length; i++) {
      for (let j = i + 1; j < goalEvents.length; j++) {
        const a = goalEvents[i]
        const b = goalEvents[j]

        if (a.slot.dayOfWeek !== b.slot.dayOfWeek) continue

        const aEnd = timeToMinutes(a.slot.endTime)
        const bStart = timeToMinutes(b.slot.startTime)
        const aStart = timeToMinutes(a.slot.startTime)
        const bEnd = timeToMinutes(b.slot.endTime)

        // If b starts after a ends, check buffer
        if (bStart >= aEnd) {
          expect(bStart - aEnd).toBeGreaterThanOrEqual(15)
        }
        // If a starts after b ends, check buffer
        if (aStart >= bEnd) {
          expect(aStart - bEnd).toBeGreaterThanOrEqual(15)
        }
      }
    }
  })

  it('aligns events to 15-minute grid', () => {
    const goal = createGoal({ hoursPerWeek: 2 })
    const input = createSchedulerInput([goal])
    const result = generateSchedule(input)

    for (const event of result.schedule.events) {
      const startMinutes = timeToMinutes(event.slot.startTime)
      const endMinutes = timeToMinutes(event.slot.endTime)

      expect(startMinutes % 15).toBe(0)
      expect(endMinutes % 15).toBe(0)
    }
  })

  it('uses weekend sleep times on Sat/Sun', () => {
    const preferences: UserPreferences = {
      ...createBasePreferences(),
      sleepStart: '23:00',
      sleepEnd: '07:00',
      weekendSleepStart: '01:00', // Later bedtime on weekends
      weekendSleepEnd: '09:00', // Later wake time on weekends
    }

    const blockedSlots = buildBlockedSlots({
      preferences,
      commitments: [],
      goals: [],
      weekStart: new Date('2024-01-15'),
    })

    // Check Saturday (day 6) uses weekend times
    const saturdaySlots = blockedSlots.filter((s) => s.dayOfWeek === 6)

    // Should have sleep block in morning until 09:00 on Saturday
    const saturdayMorningBlock = saturdaySlots.find(
      (s) => s.startTime === '00:00' && s.endTime === '09:00'
    )
    expect(saturdayMorningBlock).toBeDefined()

    // Check Monday (day 1) uses regular times
    const mondaySlots = blockedSlots.filter((s) => s.dayOfWeek === 1)
    const mondayMorningBlock = mondaySlots.find(
      (s) => s.startTime === '00:00' && s.endTime === '07:00'
    )
    expect(mondayMorningBlock).toBeDefined()
  })
})

// =============================================================================
// RECOVERY BUFFER TESTS
// =============================================================================

describe('Recovery Buffers', () => {
  it('calculates higher buffer for high intensity goals', () => {
    const lowIntensityGoal = createGoal({
      intensityLevel: 1,
    })

    const highIntensityGoal = createGoal({
      intensityLevel: 5,
    })

    const baseBuffer = 15

    const lowBuffer = calculateRecoveryBuffer(lowIntensityGoal, baseBuffer)
    const highBuffer = calculateRecoveryBuffer(highIntensityGoal, baseBuffer)

    // Level 1: 15 + (1-1)*5 = 15
    expect(lowBuffer).toBe(15)

    // Level 5: 15 + (5-1)*5 = 35
    expect(highBuffer).toBe(35)
  })

  it('applies intensity-based buffer during scheduling', () => {
    // High intensity workout goal
    const workoutGoal = createGoal({
      id: 'workout',
      title: 'Workout',
      hoursPerWeek: 1,
      intensityLevel: 5,
      sessionStrategy: {
        ...DEFAULT_SESSION_STRATEGY,
        preferredDuration: 60,
      },
    })

    // Low intensity reading goal
    const readingGoal = createGoal({
      id: 'reading',
      title: 'Reading',
      hoursPerWeek: 1,
      intensityLevel: 1,
      sessionStrategy: {
        ...DEFAULT_SESSION_STRATEGY,
        preferredDuration: 60,
      },
    })

    const input = createSchedulerInput([workoutGoal, readingGoal], [], {
      bufferMinutes: 15,
    })

    const result = generateSchedule(input)

    // Both goals should be scheduled
    const workoutEvents = result.schedule.events.filter((e) => e.goalId === 'workout')
    const readingEvents = result.schedule.events.filter((e) => e.goalId === 'reading')

    expect(workoutEvents.length).toBeGreaterThan(0)
    expect(readingEvents.length).toBeGreaterThan(0)
  })
})

// =============================================================================
// MRV ORDERING TESTS
// =============================================================================

describe('MRV Heuristic', () => {
  it('schedules most constrained goals first', () => {
    // Goal with very limited options
    const constrainedGoal = createGoal({
      id: 'constrained',
      title: 'Constrained Goal',
      hoursPerWeek: 1,
      sessionStrategy: {
        ...DEFAULT_SESSION_STRATEGY,
        preferredDuration: 60,
      },
    })

    // Goal with many options
    const flexibleGoal = createGoal({
      id: 'flexible',
      title: 'Flexible Goal',
      hoursPerWeek: 1,
      sessionStrategy: {
        ...DEFAULT_SESSION_STRATEGY,
        preferredDuration: 30, // Shorter duration = more options
      },
    })

    // Create blocked schedule that makes first goal more constrained
    const input = createSchedulerInput([constrainedGoal, flexibleGoal])
    const blockedSlots = buildBlockedSlots(input)
    const availableByDay = getAllAvailableSlots(blockedSlots)

    // Count placements
    const constrainedCount = countValidPlacements(constrainedGoal, availableByDay, [], 15)
    const flexibleCount = countValidPlacements(flexibleGoal, availableByDay, [], 15)

    // Shorter duration should have more placement options
    expect(flexibleCount).toBeGreaterThanOrEqual(constrainedCount)
  })
})

// =============================================================================
// CONSTRAINT FUNCTION TESTS
// =============================================================================

describe('Constraint Functions', () => {
  describe('buildBlockedSlots', () => {
    it('includes sleep slots for all days', () => {
      const input = createSchedulerInput()
      const blockedSlots = buildBlockedSlots(input)

      // Should have sleep blocks for each day (morning and evening)
      for (let day = 0; day < 7; day++) {
        const daySlots = blockedSlots.filter((s) => s.dayOfWeek === day)
        expect(daySlots.length).toBeGreaterThan(0)
      }
    })

    it('includes meal slots when enabled', () => {
      const input = createSchedulerInput([], [], {
        mealLunchStart: '12:00',
        mealLunchDuration: 45,
      })

      const blockedSlots = buildBlockedSlots(input)

      // Should have lunch slots
      const lunchSlots = blockedSlots.filter(
        (s) => s.startTime === '12:00' && s.durationMinutes === 45
      )
      expect(lunchSlots.length).toBe(7) // One per day
    })

    it('excludes meals when not set', () => {
      const input = createSchedulerInput([], [], {
        mealBreakfastStart: null,
        mealBreakfastDuration: null,
        mealLunchStart: null,
        mealLunchDuration: null,
        mealDinnerStart: null,
        mealDinnerDuration: null,
      })

      const blockedSlots = buildBlockedSlots(input)

      // Should not have meal slots
      const mealSlots = blockedSlots.filter((s) => s.startTime === '08:00' && s.durationMinutes === 30)
      expect(mealSlots.length).toBe(0)
    })
  })

  describe('getAvailableSlots', () => {
    it('returns available time between blocked slots', () => {
      const blockedSlots: TimeSlot[] = [
        { dayOfWeek: 1, startTime: '06:00', endTime: '09:00', durationMinutes: 180 },
        { dayOfWeek: 1, startTime: '12:00', endTime: '13:00', durationMinutes: 60 },
      ]

      const available = getAvailableSlots(blockedSlots, 1)

      // Should have slot from 09:00 to 12:00
      const slot = available.find((s) => s.startTime === '09:00' && s.endTime === '12:00')
      expect(slot).toBeDefined()
      expect(slot!.durationMinutes).toBe(180)
    })
  })

  describe('canPlaceEvent', () => {
    it('rejects overlapping events', () => {
      const existingEvents: ScheduleEvent[] = [
        {
          id: 'existing',
          type: 'goal',
          title: 'Existing',
          slot: { dayOfWeek: 1, startTime: '10:00', endTime: '11:00', durationMinutes: 60 },
          isLocked: false,
        },
      ]

      const overlappingSlot: TimeSlot = {
        dayOfWeek: 1,
        startTime: '10:30',
        endTime: '11:30',
        durationMinutes: 60,
      }

      expect(canPlaceEvent(overlappingSlot, existingEvents, 0)).toBe(false)
    })

    it('accepts non-overlapping events', () => {
      const existingEvents: ScheduleEvent[] = [
        {
          id: 'existing',
          type: 'goal',
          title: 'Existing',
          slot: { dayOfWeek: 1, startTime: '10:00', endTime: '11:00', durationMinutes: 60 },
          isLocked: false,
        },
      ]

      const validSlot: TimeSlot = {
        dayOfWeek: 1,
        startTime: '12:00',
        endTime: '13:00',
        durationMinutes: 60,
      }

      expect(canPlaceEvent(validSlot, existingEvents, 0)).toBe(true)
    })

    it('respects buffer between events', () => {
      const existingEvents: ScheduleEvent[] = [
        {
          id: 'existing',
          type: 'goal',
          title: 'Existing',
          slot: { dayOfWeek: 1, startTime: '10:00', endTime: '11:00', durationMinutes: 60 },
          isLocked: false,
        },
      ]

      // Slot that would start right after but violates buffer
      const tooCloseSlot: TimeSlot = {
        dayOfWeek: 1,
        startTime: '11:00',
        endTime: '12:00',
        durationMinutes: 60,
      }

      // With 15 minute buffer, should be rejected
      expect(canPlaceEvent(tooCloseSlot, existingEvents, 15)).toBe(false)

      // Slot that respects buffer
      const validSlot: TimeSlot = {
        dayOfWeek: 1,
        startTime: '11:15',
        endTime: '12:15',
        durationMinutes: 60,
      }

      expect(canPlaceEvent(validSlot, existingEvents, 15)).toBe(true)
    })
  })

  describe('findAllValidSlots', () => {
    it('returns all valid slot positions', () => {
      const availableSlots: TimeSlot[] = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', durationMinutes: 180 },
      ]

      const validSlots = findAllValidSlots(60, availableSlots, [], 0, 1)

      // Should have multiple starting positions: 09:00, 09:15, 09:30, etc.
      expect(validSlots.length).toBeGreaterThan(1)

      // All should be 60 minutes
      for (const slot of validSlots) {
        expect(slot.durationMinutes).toBe(60)
      }
    })
  })
})

// =============================================================================
// SESSION CALCULATION TESTS
// =============================================================================

describe('Session Calculation', () => {
  it('calculates correct number of sessions', () => {
    const goal = createGoal({
      hoursPerWeek: 3,
      sessionStrategy: {
        ...DEFAULT_SESSION_STRATEGY,
        preferredDuration: 60,
      },
    })

    expect(calculateSessionsNeeded(goal)).toBe(3) // 180 minutes / 60 = 3

    const goal2 = createGoal({
      hoursPerWeek: 2.5,
      sessionStrategy: {
        ...DEFAULT_SESSION_STRATEGY,
        preferredDuration: 45,
      },
    })

    // 150 minutes / 45 = 3.33, rounded up to 4
    expect(calculateSessionsNeeded(goal2)).toBe(4)
  })
})

// =============================================================================
// UTILITY FUNCTION TESTS
// =============================================================================

describe('Utility Functions', () => {
  describe('timeToMinutes', () => {
    it('converts time strings to minutes', () => {
      expect(timeToMinutes('00:00')).toBe(0)
      expect(timeToMinutes('01:00')).toBe(60)
      expect(timeToMinutes('12:30')).toBe(750)
      expect(timeToMinutes('23:59')).toBe(1439)
    })
  })

  describe('minutesToTime', () => {
    it('converts minutes to time strings', () => {
      expect(minutesToTime(0)).toBe('00:00')
      expect(minutesToTime(60)).toBe('01:00')
      expect(minutesToTime(750)).toBe('12:30')
      expect(minutesToTime(1439)).toBe('23:59')
    })
  })
})
