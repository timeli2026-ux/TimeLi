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
  mealsVariable: boolean
  mealBreakfastStart: string | null
  mealBreakfastDuration: number | null // minutes
  mealLunchStart: string | null
  mealLunchDuration: number | null
  mealDinnerStart: string | null
  mealDinnerDuration: number | null

  // Buffer time
  bufferMinutes: number

  // Commute
  hasCommute: boolean
  commuteMorningStart: string
  commuteMorningDuration: number
  commuteEveningStart: string
  commuteEveningDuration: number

  // Fixed commitments
  fixedCommitments: FixedCommitment[]

  // Life realms (areas of life to balance)
  realms: LifeRealm[]

  // Initial goals (linked to realms)
  goals: InitialGoal[]
}

export interface FixedCommitment {
  id: string
  title: string
  dayOfWeek: number // 0 = Sunday, 6 = Saturday
  startTime: string // HH:mm format
  endTime: string
}

export interface InitialGoal {
  id: string
  title: string
  hoursPerWeek: number
  realmId: string // Links goal to a life realm
}

export interface LifeRealm {
  id: string
  name: string
  icon?: string // Emoji icon
  isCustom: boolean // Whether user added this or it's a preset
}

// Suggested life realms for users to choose from
export const SUGGESTED_REALMS: Omit<LifeRealm, 'id'>[] = [
  { name: 'Health & Fitness', icon: '🏃', isCustom: false },
  { name: 'Career & Work', icon: '💼', isCustom: false },
  { name: 'Relationships', icon: '❤️', isCustom: false },
  { name: 'Family & Friends', icon: '👨‍👩‍👧', isCustom: false },
  { name: 'Personal Growth', icon: '🎯', isCustom: false },
  { name: 'Hobbies & Creativity', icon: '🎨', isCustom: false },
  { name: 'Finance', icon: '💰', isCustom: false },
  { name: 'Mental Wellness', icon: '🧘', isCustom: false },
]

// Default values for onboarding data
export const DEFAULT_ONBOARDING_DATA: OnboardingData = {
  timezone: 'America/New_York',
  sleepStart: '23:00',
  sleepEnd: '07:00',
  mealsVariable: false,
  mealBreakfastStart: '08:00',
  mealBreakfastDuration: 30,
  mealLunchStart: '12:00',
  mealLunchDuration: 45,
  mealDinnerStart: '18:30',
  mealDinnerDuration: 60,
  bufferMinutes: 15,
  hasCommute: false,
  commuteMorningStart: '08:00',
  commuteMorningDuration: 30,
  commuteEveningStart: '17:30',
  commuteEveningDuration: 30,
  fixedCommitments: [],
  realms: [],
  goals: [],
}

// 9 steps for the onboarding wizard (0-8)
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
    name: 'Life Realms',
    description: 'What areas of life matter most to you?',
  },
  {
    id: 8,
    name: 'Goals & Actions',
    description: 'Set goals for each area of your life',
  },
]
