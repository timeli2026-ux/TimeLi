// Student Onboarding types and constants
// Phase 13: New Onboarding - Plan 01
// Streamlined 4-step student-focused wizard

export interface StudentOnboardingStep {
  id: number
  name: string
  description: string
}

// 5-step streamlined flow for students (added Goals step)
export const STUDENT_ONBOARDING_STEPS: StudentOnboardingStep[] = [
  { id: 0, name: 'Basics', description: 'Timezone and sleep schedule' },
  { id: 1, name: 'Classes', description: 'Add your course schedule' },
  { id: 2, name: 'Assignments', description: 'Import or add your assignments' },
  { id: 3, name: 'Goals', description: 'Add personal goals and habits' },
  { id: 4, name: 'Generate', description: 'Review and generate your schedule' },
]

// Course input for onboarding (before courses are created in DB)
export interface CourseInput {
  id: string // local temp ID
  name: string
  semester: string
  instructor?: string
  color: string
  schedule: { day: number; start: string; end: string }[]
}

// Assignment input for onboarding (before assignments are created in DB)
export interface AssignmentInput {
  id: string // local temp ID
  title: string
  type: 'homework' | 'exam' | 'project' | 'reading' | 'quiz' | 'paper' | 'other'
  dueDate: string // ISO date string
  estimatedHours: number
  courseId?: string // maps to local temp ID or undefined for standalone
  notes?: string
}

// Personal goal categories
export type GoalCategory = 'health' | 'growth' | 'social' | 'wellness' | 'other'

// Personal goal input for onboarding
export interface PersonalGoalInput {
  id: string // local temp ID
  title: string
  category: GoalCategory
  timesPerWeek: number // 1-7
  minutesPerSession: number // 15, 30, 45, 60, 90, 120
}

// Goal category definitions with icons and suggestions
export const GOAL_CATEGORIES = [
  {
    id: 'health' as const,
    name: 'Health & Fitness',
    icon: '🏃',
    suggestions: ['Go to gym', 'Run', 'Workout', 'Play sports', 'Yoga'],
  },
  {
    id: 'growth' as const,
    name: 'Personal Growth',
    icon: '📖',
    suggestions: ['Read', 'Learn language', 'Practice instrument', 'Side project'],
  },
  {
    id: 'social' as const,
    name: 'Social & Fun',
    icon: '🎉',
    suggestions: ['Hang out with friends', 'Date night', 'Club meeting', 'Call family'],
  },
  {
    id: 'wellness' as const,
    name: 'Wellness',
    icon: '🧘',
    suggestions: ['Meditate', 'Journal', 'Meal prep', 'Clean room'],
  },
] as const

// Duration options for personal goals
export const GOAL_DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
] as const

// Frequency options for personal goals
export const GOAL_FREQUENCY_OPTIONS = [
  { value: 1, label: '1x/week' },
  { value: 2, label: '2x/week' },
  { value: 3, label: '3x/week' },
  { value: 4, label: '4x/week' },
  { value: 5, label: '5x/week' },
  { value: 6, label: '6x/week' },
  { value: 7, label: 'Daily' },
] as const

// Main data structure for student onboarding
export interface StudentOnboardingData {
  // Step 1: Basics
  timezone: string
  sleepStart: string // HH:mm
  sleepEnd: string // HH:mm

  // Step 2: Classes (courses to create)
  courses: CourseInput[]

  // Step 3: Assignments (after courses are created)
  assignments: AssignmentInput[]

  // Step 4: Personal Goals
  personalGoals: PersonalGoalInput[]
}

// Default values for student onboarding
export const DEFAULT_STUDENT_ONBOARDING_DATA: StudentOnboardingData = {
  timezone: 'America/New_York',
  sleepStart: '23:00',
  sleepEnd: '07:00',
  courses: [],
  assignments: [],
  personalGoals: [],
}

// Assignment type options for the UI
export const ASSIGNMENT_TYPES = [
  { value: 'homework', label: 'Homework' },
  { value: 'exam', label: 'Exam' },
  { value: 'project', label: 'Project' },
  { value: 'reading', label: 'Reading' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'paper', label: 'Paper' },
  { value: 'other', label: 'Other' },
] as const

// Days of the week for schedule builder
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
] as const

// Default course color
export const DEFAULT_COURSE_COLOR = '#3B82F6'

// Get current semester (e.g., "Spring 2026")
export function getCurrentSemester(): string {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()

  // January-May: Spring
  // June-July: Summer
  // August-December: Fall
  if (month >= 0 && month <= 4) {
    return `Spring ${year}`
  } else if (month >= 5 && month <= 6) {
    return `Summer ${year}`
  } else {
    return `Fall ${year}`
  }
}
