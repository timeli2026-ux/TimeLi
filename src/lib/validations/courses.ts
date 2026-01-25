import { z } from 'zod'

// =============================================================================
// COURSES VALIDATION SCHEMAS
// =============================================================================
// Zod schemas for courses API validation
// Matches database schema from 00014_courses_table.sql

// =============================================================================
// COURSE SCHEDULE SCHEMA (meeting times)
// =============================================================================

export const courseScheduleSchema = z.object({
  day: z
    .number()
    .min(0, 'Day must be 0-6 (Sunday-Saturday)')
    .max(6, 'Day must be 0-6 (Sunday-Saturday)'),
  start: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:mm format'),
  end: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:mm format'),
})

// =============================================================================
// COURSE FORM SCHEMA (for create)
// =============================================================================

export const courseFormSchema = z.object({
  // Required fields
  name: z
    .string()
    .min(1, 'Course name is required')
    .max(100, 'Course name must be 100 characters or less'),
  schedule: z
    .array(courseScheduleSchema)
    .min(1, 'At least one meeting time is required'),
  semester: z
    .string()
    .min(1, 'Semester is required')
    .max(50, 'Semester must be 50 characters or less'),

  // Optional fields
  instructor: z
    .string()
    .max(100, 'Instructor name must be 100 characters or less')
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #3B82F6)')
    .optional()
    .default('#3B82F6'),
  location: z
    .string()
    .max(100, 'Location must be 100 characters or less')
    .optional(),
  credits: z
    .number()
    .min(1, 'Credits must be at least 1')
    .max(10, 'Credits cannot exceed 10')
    .optional(),
  isActive: z.boolean().optional().default(true),
})

// =============================================================================
// COURSE UPDATE SCHEMA (partial for updates)
// =============================================================================

export const courseUpdateSchema = courseFormSchema.partial()

// =============================================================================
// COURSE RESPONSE SCHEMA (for API responses)
// =============================================================================

export const courseResponseSchema = courseFormSchema.extend({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// =============================================================================
// TYPESCRIPT TYPES
// =============================================================================

export type CourseSchedule = z.infer<typeof courseScheduleSchema>
export type CourseFormData = z.infer<typeof courseFormSchema>
export type CourseUpdateData = z.infer<typeof courseUpdateSchema>
export type CourseResponse = z.infer<typeof courseResponseSchema>
