import { z } from 'zod'

// Proper email regex - more strict than just checking for @
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .regex(emailRegex, 'Please enter a valid email address')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')

export const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

// Validation helper for client-side use
export function validateEmail(email: string): string | null {
  const result = emailSchema.safeParse(email)
  if (!result.success) {
    return result.error.issues[0].message
  }
  return null
}

export function validatePassword(password: string): string | null {
  const result = passwordSchema.safeParse(password)
  if (!result.success) {
    return result.error.issues[0].message
  }
  return null
}
