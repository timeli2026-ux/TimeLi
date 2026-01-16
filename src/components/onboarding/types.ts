// Onboarding types and constants
// Phase 4: Onboarding Flow - Plan 01

export interface OnboardingStep {
  id: number
  name: string
  description: string
}

export interface OnboardingData {
  // Timezone
  timezone: string

  // Sleep schedule
  sleepStart: string // Time in HH:mm format
  sleepEnd: string

  // Meal times
  mealBreakfastStart: string | null
  mealBreakfastDuration: number | null // minutes
  mealLunchStart: string | null
  mealLunchDuration: number | null
  mealDinnerStart: string | null
  mealDinnerDuration: number | null

  // Buffer time
  bufferMinutes: number

  // Commute
  commuteMorningStart: string | null
  commuteMorningDuration: number | null
  commuteEveningStart: string | null
  commuteEveningDuration: number | null

  // Fixed commitments
  fixedCommitments: FixedCommitment[]
}

export interface FixedCommitment {
  id?: string
  title: string
  dayOfWeek: number // 0 = Sunday, 6 = Saturday
  startTime: string // HH:mm format
  endTime: string
  isRecurring: boolean
}

// Default values for onboarding data
export const DEFAULT_ONBOARDING_DATA: OnboardingData = {
  timezone: 'America/New_York',
  sleepStart: '23:00',
  sleepEnd: '07:00',
  mealBreakfastStart: '08:00',
  mealBreakfastDuration: 30,
  mealLunchStart: '12:00',
  mealLunchDuration: 45,
  mealDinnerStart: '18:30',
  mealDinnerDuration: 60,
  bufferMinutes: 15,
  commuteMorningStart: null,
  commuteMorningDuration: null,
  commuteEveningStart: null,
  commuteEveningDuration: null,
  fixedCommitments: [],
}

// 8 steps for the onboarding wizard
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 0,
    name: 'Welcome',
    description: 'Introduction to TimeLi and what to expect',
  },
  {
    id: 1,
    name: 'Timezone',
    description: 'Set your timezone for accurate scheduling',
  },
  {
    id: 2,
    name: 'Sleep Schedule',
    description: 'When do you typically sleep and wake up?',
  },
  {
    id: 3,
    name: 'Meals',
    description: 'Your regular meal times',
  },
  {
    id: 4,
    name: 'Buffer Time',
    description: 'Time between activities for transitions',
  },
  {
    id: 5,
    name: 'Commute',
    description: 'Your daily commute schedule (if applicable)',
  },
  {
    id: 6,
    name: 'Fixed Commitments',
    description: 'Regular classes, meetings, or activities',
  },
  {
    id: 7,
    name: 'Review',
    description: 'Confirm your schedule preferences',
  },
]
