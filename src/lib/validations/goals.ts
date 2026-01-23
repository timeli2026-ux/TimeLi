import { z } from 'zod'

// =============================================================================
// GOALS VALIDATION SCHEMAS
// =============================================================================
// Zod schemas for goals API validation
// Matches database schema from 00004_life_realms.sql and 00005_scheduling_enhancements.sql

// Cognitive load options
const cognitiveLoadEnum = z.enum(['high', 'medium', 'low'])

// Deadline type options
const deadlineTypeEnum = z.enum(['hard', 'soft', 'none'])

// Preferred time window options
const preferredTimeWindowEnum = z.enum(['morning', 'afternoon', 'evening', 'any'])

// =============================================================================
// GOAL FORM SCHEMA (for create/update)
// =============================================================================

export const goalFormSchema = z.object({
  // Required fields
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title must be 100 characters or less'),
  realmId: z.string().uuid('Invalid realm ID'),
  hoursPerWeek: z
    .number()
    .min(0.5, 'Hours per week must be at least 0.5')
    .max(40, 'Hours per week cannot exceed 40'),

  // Optional fields with defaults
  isActive: z.boolean().optional().default(true),
  cognitiveLoad: cognitiveLoadEnum.optional().default('medium'),
  requiresDeepWork: z.boolean().optional().default(false),

  // Deadline fields
  deadline: z.string().datetime().nullable().optional(),
  deadlineType: deadlineTypeEnum.optional().default('none'),

  // Scheduling preferences
  preferredTimeWindow: preferredTimeWindowEnum.optional().default('any'),
  excludedDays: z
    .array(z.number().min(0).max(6))
    .optional()
    .default([]),

  // Session duration constraints
  minimumSessionMinutes: z
    .number()
    .min(15, 'Minimum session must be at least 15 minutes')
    .max(90, 'Minimum session cannot exceed 90 minutes')
    .optional()
    .default(30),
  preferredSessionMinutes: z
    .number()
    .min(30, 'Preferred session must be at least 30 minutes')
    .max(180, 'Preferred session cannot exceed 180 minutes')
    .optional()
    .default(60),

  // Intensity for recovery buffer calculation
  intensityLevel: z
    .number()
    .min(1, 'Intensity must be at least 1')
    .max(5, 'Intensity cannot exceed 5')
    .optional()
    .default(3),
})

// =============================================================================
// GOAL UPDATE SCHEMA (partial for updates)
// =============================================================================

export const goalUpdateSchema = goalFormSchema.partial()

// =============================================================================
// GOAL RESPONSE SCHEMA (for API responses)
// =============================================================================

export const goalResponseSchema = goalFormSchema.extend({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  realmName: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// =============================================================================
// TYPESCRIPT TYPES
// =============================================================================

export type GoalFormData = z.infer<typeof goalFormSchema>
export type GoalUpdateData = z.infer<typeof goalUpdateSchema>
export type GoalResponse = z.infer<typeof goalResponseSchema>

// Re-export enum types for use in components
export type CognitiveLoad = z.infer<typeof cognitiveLoadEnum>
export type DeadlineType = z.infer<typeof deadlineTypeEnum>
export type PreferredTimeWindow = z.infer<typeof preferredTimeWindowEnum>
