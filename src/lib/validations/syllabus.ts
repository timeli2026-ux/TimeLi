import { z } from 'zod'
import { assignmentTypeEnum } from './assignments'

// =============================================================================
// SYLLABUS IMPORT VALIDATION SCHEMAS
// =============================================================================
// Zod schemas for syllabus parse API validation
// Phase 12: Syllabus Import - Plan 01

// =============================================================================
// REQUEST SCHEMA
// =============================================================================

/**
 * Schema for syllabus parse request body
 */
export const syllabusParseRequestSchema = z.object({
  // Syllabus text content
  syllabusText: z
    .string()
    .min(50, 'At least 50 characters required')
    .max(50000, 'Syllabus text must be 50,000 characters or less'),

  // Optional pre-filled course info
  courseName: z
    .string()
    .max(100, 'Course name must be 100 characters or less')
    .optional(),
  semester: z
    .string()
    .max(50, 'Semester must be 50 characters or less')
    .optional(),
})

// =============================================================================
// PARSED ASSIGNMENT SCHEMA
// =============================================================================

/**
 * Schema for a single parsed assignment from syllabus
 */
export const parsedAssignmentSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  type: assignmentTypeEnum,
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .nullable(),
  estimatedHours: z
    .number()
    .min(0.5, 'Estimated hours must be at least 0.5')
    .max(100, 'Estimated hours cannot exceed 100'),
  notes: z
    .string()
    .max(500, 'Notes must be 500 characters or less')
    .optional(),
})

// =============================================================================
// RESPONSE SCHEMA
// =============================================================================

/**
 * Schema for syllabus parse response
 */
export const syllabusParseResponseSchema = z.object({
  courseName: z.string().min(1, 'Course name is required'),
  instructor: z
    .string()
    .max(100, 'Instructor name must be 100 characters or less')
    .optional(),
  semester: z
    .string()
    .max(50, 'Semester must be 50 characters or less')
    .optional(),
  assignments: z.array(parsedAssignmentSchema),
})

// =============================================================================
// TYPESCRIPT TYPES
// =============================================================================

export type SyllabusParseRequest = z.infer<typeof syllabusParseRequestSchema>
export type ParsedAssignmentData = z.infer<typeof parsedAssignmentSchema>
export type SyllabusParseResponse = z.infer<typeof syllabusParseResponseSchema>
