import { z } from 'zod'

// Email validation - reusing pattern from auth.ts
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const waitlistSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .regex(emailRegex, 'Please enter a valid email address')
    .max(255, 'Email is too long'),
})

export type WaitlistInput = z.infer<typeof waitlistSchema>
