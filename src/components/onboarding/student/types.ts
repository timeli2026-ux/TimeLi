// Student Onboarding types and constants
// Phase 13: New Onboarding - Plan 01
// Streamlined 4-step student-focused wizard

export interface StudentOnboardingStep {
  id: number
  name: string
  description: string
}

// 4-step streamlined flow for students
export const STUDENT_ONBOARDING_STEPS: StudentOnboardingStep[] = [
  { id: 0, name: 'Basics', description: 'Timezone and sleep schedule' },
  { id: 1, name: 'Classes', description: 'Add your course schedule' },
  { id: 2, name: 'Assignments', description: 'Import or add your assignments' },
  { id: 3, name: 'Generate', description: 'Review and generate your schedule' },
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
}

// Default values for student onboarding
export const DEFAULT_STUDENT_ONBOARDING_DATA: StudentOnboardingData = {
  timezone: 'America/New_York',
  sleepStart: '23:00',
  sleepEnd: '07:00',
  courses: [],
  assignments: [],
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
