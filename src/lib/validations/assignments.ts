import { z } from 'zod'

// =============================================================================
// ASSIGNMENTS VALIDATION SCHEMAS
// =============================================================================
// Zod schemas for assignments API validation
// Matches database schema from 00015_assignments_table.sql

// Assignment type options
export const assignmentTypeEnum = z.enum([
  'homework',
  'exam',
  'project',
  'reading',
  'quiz',
  'paper',
  'other',
])

// Assignment priority options
export const assignmentPriorityEnum = z.enum(['high', 'medium', 'low'])

// Assignment status options
export const assignmentStatusEnum = z.enum(['pending', 'in_progress', 'completed'])

// =============================================================================
// ASSIGNMENT FORM SCHEMA (for create)
// =============================================================================

export const assignmentFormSchema = z.object({
  // Required fields
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  type: assignmentTypeEnum,
  dueDate: z.string().datetime('Invalid date format'),
  estimatedHours: z
    .number()
    .min(0.5, 'Estimated hours must be at least 0.5')
    .max(100, 'Estimated hours cannot exceed 100'),

  // Optional fields
  courseId: z.string().uuid('Invalid course ID').nullable().optional(),
  priority: assignmentPriorityEnum.optional().default('medium'),
  notes: z
    .string()
    .max(1000, 'Notes must be 1000 characters or less')
    .optional(),
  status: assignmentStatusEnum.optional().default('pending'),
})

// =============================================================================
// ASSIGNMENT UPDATE SCHEMA (partial for updates)
// =============================================================================

export const assignmentUpdateSchema = assignmentFormSchema.partial()

// =============================================================================
// ASSIGNMENT RESPONSE SCHEMA (for API responses)
// =============================================================================

export const assignmentResponseSchema = assignmentFormSchema.extend({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable().optional(),
  courseName: z.string().optional(), // For joined queries
})

// =============================================================================
// TYPESCRIPT TYPES
// =============================================================================

export type AssignmentFormData = z.infer<typeof assignmentFormSchema>
export type AssignmentUpdateData = z.infer<typeof assignmentUpdateSchema>
export type AssignmentResponse = z.infer<typeof assignmentResponseSchema>

// Re-export enum types for use in components
export type AssignmentType = z.infer<typeof assignmentTypeEnum>
export type AssignmentPriority = z.infer<typeof assignmentPriorityEnum>
export type AssignmentStatus = z.infer<typeof assignmentStatusEnum>
