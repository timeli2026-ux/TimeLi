// Onboarding types and constants
// Phase 4: Onboarding Flow - Plan 01

export interface OnboardingStep {
  id: number
  name: string
  description: string
}

// Meal structure for flexible meal scheduling
export interface Meal {
  id: string
  name: string
  enabled: boolean
  start: string // HH:mm format
  duration: number // minutes
}

export interface OnboardingData {
  // Timezone
  timezone: string

  // Sleep schedule
  sleepStart: string // Time in HH:mm format
  sleepEnd: string

  // Meals - flexible array of meals (can toggle on/off, add custom)
  mealsVariable: boolean
  meals: Meal[]

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
  realmId: string // Links goal to a life realm
  // Frequency specification
  timesPerWeek: number // How many times per week (1-7)
  minutesPerSession: number // Duration of each session in minutes
  // Calculated field for display/API
  hoursPerWeek: number // Computed: (timesPerWeek * minutesPerSession) / 60
}

export interface LifeRealm {
  id: string
  name: string
  icon?: string // Emoji icon
  isCustom: boolean // Whether user added this or it's a preset
}

// Suggested life realms for users to choose from
// Every moment of time should contribute to one of these areas
export const SUGGESTED_REALMS: Omit<LifeRealm, 'id'>[] = [
  { name: 'Health & Fitness', icon: '🏃', isCustom: false },
  { name: 'Career & Work', icon: '💼', isCustom: false },
  { name: 'Relationships', icon: '❤️', isCustom: false },
  { name: 'Family & Friends', icon: '👨‍👩‍👧', isCustom: false },
  { name: 'Personal Growth', icon: '🎯', isCustom: false },
  { name: 'Hobbies & Creativity', icon: '🎨', isCustom: false },
  { name: 'Spirituality', icon: '🙏', isCustom: false },
  { name: 'Mental Wellness', icon: '🧘', isCustom: false },
]

// Default meals for onboarding (static IDs for SSR compatibility)
export const DEFAULT_MEALS: Meal[] = [
  { id: 'default-breakfast', name: 'Breakfast', enabled: true, start: '08:00', duration: 30 },
  { id: 'default-lunch', name: 'Lunch', enabled: true, start: '12:00', duration: 45 },
  { id: 'default-dinner', name: 'Dinner', enabled: true, start: '18:30', duration: 60 },
]

// Default values for onboarding data
export const DEFAULT_ONBOARDING_DATA: OnboardingData = {
  timezone: 'America/New_York',
  sleepStart: '23:00',
  sleepEnd: '07:00',
  mealsVariable: false,
  meals: [...DEFAULT_MEALS],
  hasCommute: false,
  commuteMorningStart: '08:00',
  commuteMorningDuration: 30,
  commuteEveningStart: '17:30',
  commuteEveningDuration: 30,
  fixedCommitments: [],
  realms: [],
  goals: [],
}

// 8 steps for the onboarding wizard (0-7)
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
    name: 'Commute',
    description: 'Your daily commute schedule (if applicable)',
  },
  {
    id: 5,
    name: 'Fixed Commitments',
    description: 'Regular classes, meetings, or activities',
  },
  {
    id: 6,
    name: 'Life Realms',
    description: 'Every moment of your time should contribute to an area of life',
  },
  {
    id: 7,
    name: 'Actions & Habits',
    description: 'Commit to specific actions for each area of your life',
  },
]
