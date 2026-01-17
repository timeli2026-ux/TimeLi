// Tests for infeasibility detection, trade-offs, MVS, and flexibility
// Phase 5: Scheduling Engine - Plan 03

import {
  detectInfeasibility,
  generateTradeOffs,
  generateMinimumViableSchedule,
  calculateSeverity,
  generateSummary,
} from '../infeasibility'

import {
  classifyFlexibility,
  addFlexibilityToSchedule,
  getFlexibilitySummary,
  findMostFlexibleEvents,
} from '../flexibility'

import { generateSchedule } from '../engine'

import {
  SchedulerInput,
  GoalWithMetadata,
  UserPreferences,
  FixedCommitment,
  WeekSchedule,
  ScheduleEvent,
  InfeasibilityReason,
  TimeSlot,
} from '../types'

// =============================================================================
// TEST FIXTURES
// =============================================================================

const createTestPreferences = (overrides: Partial<UserPreferences> = {}): UserPreferences => ({
  timezone: 'America/New_York',
  sleepStart: '23:00',
  sleepEnd: '07:00',
  weekendSleepStart: null,
  weekendSleepEnd: null,
  chronotype: 'intermediate',
  bufferMinutes: 15,
  mealBreakfastStart: null,
  mealBreakfastDuration: null,
  mealLunchStart: '12:00',
  mealLunchDuration: 30,
  mealDinnerStart: '18:00',
  mealDinnerDuration: 45,
  commuteMorningStart: null,
  commuteMorningDuration: null,
  commuteEveningStart: null,
  commuteEveningDuration: null,
  ...overrides,
})

const createTestGoal = (overrides: Partial<GoalWithMetadata> = {}): GoalWithMetadata => ({
  id: `goal-${Math.random().toString(36).slice(2, 9)}`,
  title: 'Test Goal',
  realmId: 'realm-1',
  hoursPerWeek: 3,
  cognitiveLoad: 'medium',
  requiresDeepWork: false,
  deadlineType: 'none',
  intensityLevel: 3,
  sessionStrategy: {
    preferredDuration: 60,
    minimumDuration: 30,
    maximumDuration: 90,
    allowSplitting: true,
  },
  ...overrides,
})

const createTestCommitment = (overrides: Partial<FixedCommitment> = {}): FixedCommitment => ({
  id: `commitment-${Math.random().toString(36).slice(2, 9)}`,
  title: 'Test Commitment',
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '10:00',
  isRecurring: true,
  ...overrides,
})

const createTestInput = (overrides: Partial<SchedulerInput> = {}): SchedulerInput => ({
  preferences: createTestPreferences(),
  commitments: [],
  goals: [],
  weekStart: new Date('2025-01-20'), // A Monday
  ...overrides,
})

// =============================================================================
// INFEASIBILITY DETECTION TESTS
// =============================================================================

describe('detectInfeasibility', () => {
  describe('capacity detection', () => {
    it('should detect when total goal hours exceed available hours', () => {
      const input = createTestInput({
        goals: [
          createTestGoal({ id: 'g1', title: 'Goal 1', hoursPerWeek: 40 }),
          createTestGoal({ id: 'g2', title: 'Goal 2', hoursPerWeek: 40 }),
          createTestGoal({ id: 'g3', title: 'Goal 3', hoursPerWeek: 40 }),
        ],
      })

      const report = detectInfeasibility(input)

      expect(report.isInfeasible).toBe(true)
      expect(report.reasons.length).toBeGreaterThan(0)
      expect(report.reasons.some(r => r.type === 'insufficient_time')).toBe(true)
    })

    it('should not flag infeasibility when goals fit', () => {
      const input = createTestInput({
        goals: [
          createTestGoal({ id: 'g1', title: 'Goal 1', hoursPerWeek: 3 }),
          createTestGoal({ id: 'g2', title: 'Goal 2', hoursPerWeek: 2 }),
        ],
      })

      const report = detectInfeasibility(input)

      expect(report.isInfeasible).toBe(false)
      expect(report.reasons.length).toBe(0)
      expect(report.summary).toBe('All goals can be scheduled this week.')
    })

    it('should identify which specific goals cause overflow', () => {
      // With default preferences: 7:00-23:00 = 16 hours/day * 7 days = 112 hours available
      // But we also have lunch (30 min) and dinner (45 min) per day = 8.75 hours blocked
      // So available is roughly 112 - 8.75 = ~103 hours
      // Request 150 hours to ensure overflow
      const input = createTestInput({
        goals: [
          createTestGoal({ id: 'high-priority', title: 'High Priority', hoursPerWeek: 20, deadlineType: 'hard', deadline: new Date('2025-01-25') }),
          createTestGoal({ id: 'low-priority', title: 'Low Priority', hoursPerWeek: 130 }), // Way too much (total: 150 hours)
        ],
      })

      const report = detectInfeasibility(input)

      expect(report.isInfeasible).toBe(true)
      // At least one goal should be flagged with insufficient_time
      const insufficientTimeReasons = report.reasons.filter(r => r.type === 'insufficient_time')
      expect(insufficientTimeReasons.length).toBeGreaterThan(0)
    })
  })

  describe('deadline detection', () => {
    it('should detect impossible deadlines', () => {
      const input = createTestInput({
        weekStart: new Date('2025-01-20'),
        goals: [
          createTestGoal({
            id: 'urgent-goal',
            title: 'Urgent Goal',
            hoursPerWeek: 5,
            deadline: new Date('2025-01-21'), // Tomorrow!
            deadlineType: 'hard',
            sessionStrategy: { preferredDuration: 60, minimumDuration: 30, maximumDuration: 90, allowSplitting: true },
          }),
        ],
      })

      const report = detectInfeasibility(input)

      expect(report.isInfeasible).toBe(true)
      expect(report.reasons.some(r => r.type === 'deadline_impossible')).toBe(true)
    })

    it('should not flag achievable deadlines', () => {
      const input = createTestInput({
        weekStart: new Date('2025-01-20'),
        goals: [
          createTestGoal({
            id: 'goal',
            title: 'Achievable Goal',
            hoursPerWeek: 2, // Only 2 hours
            deadline: new Date('2025-01-26'), // 6 days away
            deadlineType: 'hard',
            sessionStrategy: { preferredDuration: 60, minimumDuration: 30, maximumDuration: 90, allowSplitting: true },
          }),
        ],
      })

      const report = detectInfeasibility(input)

      expect(report.reasons.filter(r => r.type === 'deadline_impossible').length).toBe(0)
    })
  })

  describe('anchor detection', () => {
    it('should detect missing anchors', () => {
      const input = createTestInput({
        commitments: [createTestCommitment({ id: 'commit-1' })],
        goals: [
          createTestGoal({
            id: 'anchored-goal',
            title: 'Anchored Goal',
            anchor: {
              type: 'after_event',
              anchorId: 'non-existent-commit', // This doesn't exist
              bufferMinutes: 5,
            },
          }),
        ],
      })

      const report = detectInfeasibility(input)

      expect(report.isInfeasible).toBe(true)
      expect(report.reasons.some(r => r.type === 'anchor_unavailable')).toBe(true)
    })

    it('should not flag when anchor exists', () => {
      const input = createTestInput({
        commitments: [createTestCommitment({ id: 'commit-1' })],
        goals: [
          createTestGoal({
            id: 'anchored-goal',
            title: 'Anchored Goal',
            anchor: {
              type: 'after_event',
              anchorId: 'commit-1', // This exists
              bufferMinutes: 5,
            },
          }),
        ],
      })

      const report = detectInfeasibility(input)

      expect(report.reasons.filter(r => r.type === 'anchor_unavailable').length).toBe(0)
    })
  })
})

// =============================================================================
// TRADE-OFF GENERATION TESTS
// =============================================================================

describe('generateTradeOffs', () => {
  it('should generate reduce duration suggestion', () => {
    const goal = createTestGoal({
      id: 'g1',
      title: 'Test Goal',
      hoursPerWeek: 5,
      sessionStrategy: { preferredDuration: 60, minimumDuration: 30, maximumDuration: 90, allowSplitting: true },
    })

    const reasons: InfeasibilityReason[] = [{
      type: 'insufficient_time',
      goalId: 'g1',
      goalTitle: 'Test Goal',
      description: 'Not enough time',
      requiredMinutes: 300,
    }]

    const input = createTestInput({ goals: [goal] })
    const tradeOffs = generateTradeOffs(reasons, input)

    const durationOption = tradeOffs.find(t => t.action === 'reduce_duration')
    expect(durationOption).toBeDefined()
    expect(durationOption!.suggestedValue).toBe(45) // 60 - 15
    expect(durationOption!.minutesSaved).toBeGreaterThan(0)
  })

  it('should generate reduce frequency suggestion', () => {
    const goal = createTestGoal({
      id: 'g1',
      title: 'Test Goal',
      hoursPerWeek: 3, // 3 hours = 3 sessions
      sessionStrategy: { preferredDuration: 60, minimumDuration: 30, maximumDuration: 90, allowSplitting: true },
    })

    const reasons: InfeasibilityReason[] = [{
      type: 'insufficient_time',
      goalId: 'g1',
      goalTitle: 'Test Goal',
      description: 'Not enough time',
      requiredMinutes: 180,
    }]

    const input = createTestInput({ goals: [goal] })
    const tradeOffs = generateTradeOffs(reasons, input)

    const frequencyOption = tradeOffs.find(t => t.action === 'reduce_frequency')
    expect(frequencyOption).toBeDefined()
    expect(frequencyOption!.currentValue).toBe(3) // 3 sessions
    expect(frequencyOption!.suggestedValue).toBe(2) // 2 sessions
  })

  it('should generate skip goal suggestion as last resort', () => {
    const goal = createTestGoal({ id: 'g1', title: 'Test Goal' })

    const reasons: InfeasibilityReason[] = [{
      type: 'insufficient_time',
      goalId: 'g1',
      goalTitle: 'Test Goal',
      description: 'Not enough time',
      requiredMinutes: 180,
    }]

    const input = createTestInput({ goals: [goal] })
    const tradeOffs = generateTradeOffs(reasons, input)

    const skipOption = tradeOffs.find(t => t.action === 'skip_goal')
    expect(skipOption).toBeDefined()
    expect(skipOption!.minutesSaved).toBe(goal.hoursPerWeek * 60)
  })

  it('should sort suggestions by impact (least disruptive first)', () => {
    const goal = createTestGoal({
      id: 'g1',
      title: 'Test Goal',
      hoursPerWeek: 3,
      sessionStrategy: { preferredDuration: 60, minimumDuration: 30, maximumDuration: 90, allowSplitting: true },
    })

    const reasons: InfeasibilityReason[] = [{
      type: 'insufficient_time',
      goalId: 'g1',
      goalTitle: 'Test Goal',
      description: 'Not enough time',
      requiredMinutes: 180,
    }]

    const input = createTestInput({ goals: [goal] })
    const tradeOffs = generateTradeOffs(reasons, input)

    const actions = tradeOffs.map(t => t.action)
    const durationIdx = actions.indexOf('reduce_duration')
    const frequencyIdx = actions.indexOf('reduce_frequency')
    const skipIdx = actions.indexOf('skip_goal')

    // Duration should come before frequency, which should come before skip
    expect(durationIdx).toBeLessThan(frequencyIdx)
    expect(frequencyIdx).toBeLessThan(skipIdx)
  })

  it('should have specific values in suggestions', () => {
    const goal = createTestGoal({
      id: 'g1',
      title: 'Test Goal',
      hoursPerWeek: 4,
      sessionStrategy: { preferredDuration: 60, minimumDuration: 30, maximumDuration: 90, allowSplitting: true },
    })

    const reasons: InfeasibilityReason[] = [{
      type: 'insufficient_time',
      goalId: 'g1',
      goalTitle: 'Test Goal',
      description: 'Not enough time',
      requiredMinutes: 240,
    }]

    const input = createTestInput({ goals: [goal] })
    const tradeOffs = generateTradeOffs(reasons, input)

    // All trade-offs should have specific, non-vague values
    for (const tradeOff of tradeOffs) {
      expect(tradeOff.id).toBeTruthy()
      expect(tradeOff.description).toBeTruthy()
      expect(typeof tradeOff.minutesSaved).toBe('number')
      expect(tradeOff.impact).toBeTruthy()
    }
  })

  it('should generate deadline extension suggestion for impossible deadlines', () => {
    const goal = createTestGoal({
      id: 'g1',
      title: 'Deadline Goal',
      deadline: new Date('2025-01-21'),
      deadlineType: 'hard',
    })

    const reasons: InfeasibilityReason[] = [{
      type: 'deadline_impossible',
      goalId: 'g1',
      goalTitle: 'Deadline Goal',
      description: 'Deadline too soon',
      requiredMinutes: 180,
    }]

    const input = createTestInput({ goals: [goal] })
    const tradeOffs = generateTradeOffs(reasons, input)

    const deadlineOption = tradeOffs.find(t => t.action === 'remove_deadline')
    expect(deadlineOption).toBeDefined()
  })
})

// =============================================================================
// MINIMUM VIABLE SCHEDULE TESTS
// =============================================================================

describe('generateMinimumViableSchedule', () => {
  it('should include as many goals as possible', () => {
    const goals = [
      createTestGoal({ id: 'g1', title: 'Goal 1', hoursPerWeek: 2 }),
      createTestGoal({ id: 'g2', title: 'Goal 2', hoursPerWeek: 2 }),
      createTestGoal({ id: 'g3', title: 'Goal 3', hoursPerWeek: 100 }), // Too much
    ]

    const input = createTestInput({ goals })
    const reasons: InfeasibilityReason[] = [{
      type: 'insufficient_time',
      goalId: 'g3',
      goalTitle: 'Goal 3',
      description: 'Not enough time',
      requiredMinutes: 6000,
    }]

    const mvs = generateMinimumViableSchedule(input, reasons)

    // Should include g1 and g2
    expect(mvs.includedGoals).toContain('g1')
    expect(mvs.includedGoals).toContain('g2')
    // g3 should be excluded
    expect(mvs.excludedGoals).toContain('g3')
  })

  it('should respect priority (deadlines first)', () => {
    const goals = [
      createTestGoal({ id: 'urgent', title: 'Urgent', hoursPerWeek: 5, deadline: new Date('2025-01-22'), deadlineType: 'hard' }),
      createTestGoal({ id: 'normal', title: 'Normal', hoursPerWeek: 50 }), // Too much to fit both
    ]

    const input = createTestInput({ goals })
    const reasons: InfeasibilityReason[] = [{
      type: 'insufficient_time',
      goalId: 'normal',
      goalTitle: 'Normal',
      description: 'Not enough time',
      requiredMinutes: 3000,
    }]

    const mvs = generateMinimumViableSchedule(input, reasons)

    // Urgent goal should be included due to deadline priority
    expect(mvs.includedGoals).toContain('urgent')
  })

  it('should calculate coverage percentage correctly', () => {
    const goals = [
      createTestGoal({ id: 'g1', title: 'Goal 1', hoursPerWeek: 2 }), // 120 min
      createTestGoal({ id: 'g2', title: 'Goal 2', hoursPerWeek: 2 }), // 120 min
    ]

    const input = createTestInput({ goals })
    const reasons: InfeasibilityReason[] = [{
      type: 'insufficient_time',
      goalId: 'g2',
      goalTitle: 'Goal 2',
      description: 'Not enough time',
      requiredMinutes: 120,
    }]

    const mvs = generateMinimumViableSchedule(input, reasons)

    // Coverage should be calculated as included minutes / total requested minutes
    expect(typeof mvs.coveragePercent).toBe('number')
    expect(mvs.coveragePercent).toBeGreaterThanOrEqual(0)
    expect(mvs.coveragePercent).toBeLessThanOrEqual(100)
  })

  it('should list excluded goals', () => {
    const goals = [
      createTestGoal({ id: 'g1', title: 'Goal 1', hoursPerWeek: 2 }),
      createTestGoal({ id: 'g2', title: 'Goal 2', hoursPerWeek: 200 }), // Way too much
    ]

    const input = createTestInput({ goals })
    const reasons: InfeasibilityReason[] = [{
      type: 'insufficient_time',
      goalId: 'g2',
      goalTitle: 'Goal 2',
      description: 'Not enough time',
      requiredMinutes: 12000,
    }]

    const mvs = generateMinimumViableSchedule(input, reasons)

    expect(mvs.excludedGoals.length).toBeGreaterThan(0)
    expect(mvs.excludedGoals).toContain('g2')
  })
})

// =============================================================================
// SEVERITY TESTS
// =============================================================================

describe('calculateSeverity', () => {
  it('should return mild when less than 25% goals affected', () => {
    const goals = Array.from({ length: 10 }, (_, i) =>
      createTestGoal({ id: `g${i}`, title: `Goal ${i}` })
    )

    const reasons: InfeasibilityReason[] = [{
      type: 'insufficient_time',
      goalId: 'g0',
      goalTitle: 'Goal 0',
      description: 'Not enough time',
      requiredMinutes: 180,
    }]

    const input = createTestInput({ goals })
    const severity = calculateSeverity(reasons, input)

    expect(severity).toBe('mild')
  })

  it('should return moderate when 25-50% goals affected', () => {
    const goals = Array.from({ length: 8 }, (_, i) =>
      createTestGoal({ id: `g${i}`, title: `Goal ${i}` })
    )

    // 3 out of 8 = 37.5% affected (between 25-50%)
    const reasons: InfeasibilityReason[] = [
      { type: 'insufficient_time', goalId: 'g0', goalTitle: 'Goal 0', description: 'Not enough time', requiredMinutes: 180 },
      { type: 'insufficient_time', goalId: 'g1', goalTitle: 'Goal 1', description: 'Not enough time', requiredMinutes: 180 },
      { type: 'insufficient_time', goalId: 'g2', goalTitle: 'Goal 2', description: 'Not enough time', requiredMinutes: 180 },
    ]

    const input = createTestInput({ goals })
    const severity = calculateSeverity(reasons, input)

    expect(severity).toBe('moderate')
  })

  it('should return severe when over 50% or impossible deadline', () => {
    const goals = [createTestGoal({ id: 'g0', title: 'Goal 0' })]

    const reasons: InfeasibilityReason[] = [{
      type: 'deadline_impossible',
      goalId: 'g0',
      goalTitle: 'Goal 0',
      description: 'Deadline impossible',
      requiredMinutes: 180,
    }]

    const input = createTestInput({ goals })
    const severity = calculateSeverity(reasons, input)

    expect(severity).toBe('severe')
  })
})

// =============================================================================
// FLEXIBILITY CLASSIFICATION TESTS
// =============================================================================

describe('classifyFlexibility', () => {
  it('should classify fixed events as low flexibility', () => {
    const event: ScheduleEvent = {
      id: 'evt-1',
      type: 'meal',
      title: 'Lunch',
      slot: { dayOfWeek: 1, startTime: '12:00', endTime: '12:30', durationMinutes: 30 },
      isLocked: true,
    }

    const schedule: WeekSchedule = {
      events: [event],
      weekStart: new Date('2025-01-20'),
      generatedAt: new Date(),
    }

    const input = createTestInput()
    const flexibility = classifyFlexibility(event, schedule, input)

    expect(flexibility.level).toBe('low')
    expect(flexibility.canReschedule).toBe(false)
    expect(flexibility.explanation).toContain('fixed')
  })

  it('should classify anchored sessions as low flexibility', () => {
    const goal = createTestGoal({ id: 'g1', title: 'Anchored Goal' })

    const event: ScheduleEvent = {
      id: 'evt-1',
      type: 'goal',
      title: 'Anchored Goal',
      slot: { dayOfWeek: 1, startTime: '10:00', endTime: '11:00', durationMinutes: 60 },
      goalId: 'g1',
      isLocked: false,
      isAnchoredSession: true,
    }

    const schedule: WeekSchedule = {
      events: [event],
      weekStart: new Date('2025-01-20'),
      generatedAt: new Date(),
    }

    const input = createTestInput({ goals: [goal] })
    const flexibility = classifyFlexibility(event, schedule, input)

    expect(flexibility.level).toBe('low')
    expect(flexibility.canReschedule).toBe(false)
    expect(flexibility.explanation).toContain('Habit-stacked')
  })

  it('should calculate alternative slot count accurately', () => {
    const goal = createTestGoal({ id: 'g1', title: 'Test Goal', hoursPerWeek: 1 })

    const event: ScheduleEvent = {
      id: 'evt-1',
      type: 'goal',
      title: 'Test Goal',
      slot: { dayOfWeek: 1, startTime: '09:00', endTime: '10:00', durationMinutes: 60 },
      goalId: 'g1',
      isLocked: false,
    }

    const schedule: WeekSchedule = {
      events: [event],
      weekStart: new Date('2025-01-20'),
      generatedAt: new Date(),
    }

    const input = createTestInput({ goals: [goal] })
    const flexibility = classifyFlexibility(event, schedule, input)

    // Should have many alternatives for a simple 1-hour goal
    expect(flexibility.alternativeSlots).toBeGreaterThan(0)
  })

  it('should identify highly flexible goals correctly', () => {
    const goal = createTestGoal({
      id: 'g1',
      title: 'Flexible Goal',
      hoursPerWeek: 1,
      sessionStrategy: { preferredDuration: 30, minimumDuration: 30, maximumDuration: 90, allowSplitting: true },
    })

    const event: ScheduleEvent = {
      id: 'evt-1',
      type: 'goal',
      title: 'Flexible Goal',
      slot: { dayOfWeek: 1, startTime: '09:00', endTime: '09:30', durationMinutes: 30 },
      goalId: 'g1',
      isLocked: false,
    }

    const schedule: WeekSchedule = {
      events: [event],
      weekStart: new Date('2025-01-20'),
      generatedAt: new Date(),
    }

    const input = createTestInput({ goals: [goal] })
    const flexibility = classifyFlexibility(event, schedule, input)

    // Short 30-min session with empty schedule = high flexibility
    expect(flexibility.level).toBe('high')
    expect(flexibility.canReschedule).toBe(true)
    expect(flexibility.alternativeSlots).toBeGreaterThan(5)
  })
})

describe('addFlexibilityToSchedule', () => {
  it('should add flexibility info to all events', () => {
    const goal = createTestGoal({ id: 'g1', title: 'Test Goal' })

    const schedule: WeekSchedule = {
      events: [
        {
          id: 'evt-1',
          type: 'goal',
          title: 'Test Goal',
          slot: { dayOfWeek: 1, startTime: '09:00', endTime: '10:00', durationMinutes: 60 },
          goalId: 'g1',
          isLocked: false,
        },
        {
          id: 'evt-2',
          type: 'meal',
          title: 'Lunch',
          slot: { dayOfWeek: 1, startTime: '12:00', endTime: '12:30', durationMinutes: 30 },
          isLocked: true,
        },
      ],
      weekStart: new Date('2025-01-20'),
      generatedAt: new Date(),
    }

    const input = createTestInput({ goals: [goal] })
    const enhanced = addFlexibilityToSchedule(schedule, input)

    for (const event of enhanced.events) {
      expect((event as any).flexibility).toBeDefined()
      expect((event as any).flexibility.level).toBeDefined()
      expect((event as any).flexibility.canReschedule).toBeDefined()
    }
  })
})

describe('getFlexibilitySummary', () => {
  it('should count flexibility levels correctly', () => {
    const goal1 = createTestGoal({ id: 'g1', title: 'Goal 1' })
    const goal2 = createTestGoal({ id: 'g2', title: 'Goal 2' })

    const schedule: WeekSchedule = {
      events: [
        {
          id: 'evt-1',
          type: 'goal',
          title: 'Goal 1',
          slot: { dayOfWeek: 1, startTime: '09:00', endTime: '10:00', durationMinutes: 60 },
          goalId: 'g1',
          isLocked: false,
        },
        {
          id: 'evt-2',
          type: 'goal',
          title: 'Goal 2',
          slot: { dayOfWeek: 2, startTime: '09:00', endTime: '10:00', durationMinutes: 60 },
          goalId: 'g2',
          isLocked: false,
        },
      ],
      weekStart: new Date('2025-01-20'),
      generatedAt: new Date(),
    }

    const input = createTestInput({ goals: [goal1, goal2] })
    const summary = getFlexibilitySummary(schedule, input)

    expect(summary.totalGoals).toBe(2)
    expect(summary.low + summary.medium + summary.high).toBe(2)
  })
})

describe('findMostFlexibleEvents', () => {
  it('should return most flexible events first', () => {
    const goal1 = createTestGoal({
      id: 'g1',
      title: 'Flexible Goal',
      hoursPerWeek: 1,
      sessionStrategy: { preferredDuration: 30, minimumDuration: 30, maximumDuration: 90, allowSplitting: true },
    })

    const goal2 = createTestGoal({
      id: 'g2',
      title: 'Less Flexible Goal',
      hoursPerWeek: 1,
    })

    const schedule: WeekSchedule = {
      events: [
        {
          id: 'evt-1',
          type: 'goal',
          title: 'Flexible Goal',
          slot: { dayOfWeek: 1, startTime: '09:00', endTime: '09:30', durationMinutes: 30 },
          goalId: 'g1',
          isLocked: false,
        },
        {
          id: 'evt-2',
          type: 'goal',
          title: 'Less Flexible Goal',
          slot: { dayOfWeek: 2, startTime: '09:00', endTime: '10:00', durationMinutes: 60 },
          goalId: 'g2',
          isLocked: false,
        },
      ],
      weekStart: new Date('2025-01-20'),
      generatedAt: new Date(),
    }

    const input = createTestInput({ goals: [goal1, goal2] })
    const flexible = findMostFlexibleEvents(schedule, input, 3)

    expect(flexible.length).toBeGreaterThan(0)
    expect(flexible[0].flexibility.canReschedule).toBe(true)
  })
})

// =============================================================================
// SUMMARY GENERATION TESTS
// =============================================================================

describe('generateSummary', () => {
  it('should return positive message when no issues', () => {
    const summary = generateSummary([], 'mild', undefined)
    expect(summary).toBe('All goals can be scheduled this week.')
  })

  it('should include goal count in summary', () => {
    const reasons: InfeasibilityReason[] = [
      { type: 'insufficient_time', goalId: 'g1', goalTitle: 'Goal 1', description: 'Not enough time', requiredMinutes: 180 },
      { type: 'insufficient_time', goalId: 'g2', goalTitle: 'Goal 2', description: 'Not enough time', requiredMinutes: 180 },
    ]

    const summary = generateSummary(reasons, 'moderate', undefined)
    expect(summary).toContain('2 goals')
  })

  it('should include MVS coverage when available', () => {
    const reasons: InfeasibilityReason[] = [
      { type: 'insufficient_time', goalId: 'g1', goalTitle: 'Goal 1', description: 'Not enough time', requiredMinutes: 180 },
    ]

    const mvs = {
      schedule: { events: [], weekStart: new Date(), generatedAt: new Date() },
      includedGoals: ['g2'],
      excludedGoals: ['g1'],
      coveragePercent: 75,
    }

    const summary = generateSummary(reasons, 'mild', mvs)
    expect(summary).toContain('75%')
  })
})

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Integration: Infeasibility + Scheduling', () => {
  it('should produce a valid MVS when infeasible', () => {
    const goals = [
      createTestGoal({ id: 'g1', title: 'Goal 1', hoursPerWeek: 2 }),
      createTestGoal({ id: 'g2', title: 'Goal 2', hoursPerWeek: 2 }),
      createTestGoal({ id: 'g3', title: 'Goal 3', hoursPerWeek: 200 }), // Too much
    ]

    const input = createTestInput({ goals })
    const report = detectInfeasibility(input)

    expect(report.isInfeasible).toBe(true)
    expect(report.minimumViableSchedule).toBeDefined()
    expect(report.minimumViableSchedule!.schedule).toBeDefined()
    expect(report.minimumViableSchedule!.includedGoals.length).toBeGreaterThan(0)
  })

  it('should have consistent goal counts between MVS and exclusions', () => {
    const goals = [
      createTestGoal({ id: 'g1', title: 'Goal 1', hoursPerWeek: 2 }),
      createTestGoal({ id: 'g2', title: 'Goal 2', hoursPerWeek: 2 }),
      createTestGoal({ id: 'g3', title: 'Goal 3', hoursPerWeek: 100 }),
    ]

    const input = createTestInput({ goals })
    const report = detectInfeasibility(input)

    const mvs = report.minimumViableSchedule!
    const totalGoals = goals.length
    const includedCount = mvs.includedGoals.length
    const excludedCount = mvs.excludedGoals.length

    // All goals should be accounted for
    expect(includedCount + excludedCount).toBe(totalGoals)
  })
})
