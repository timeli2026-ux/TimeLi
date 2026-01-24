import { z } from 'zod'

const envSchema = z.object({
  // Supabase (public - safe to expose)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // Supabase (private - server only)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Anthropic API (optional - chat features disabled without it)
  ANTHROPIC_API_KEY: z.string().min(1).optional(),

  // Self-hosted LLM (optional - chat features use offline mode without it)
  LLM_BASE_URL: z.string().url().optional(),
  LLM_MODEL: z.string().optional(),
  LLM_SCHEDULE: z.string().optional(),    // "09:00-14:00" or "09:00-14:00,18:00-22:00"
  LLM_TIMEZONE: z.string().optional(),    // "America/New_York" (default)

  // OpenAI API fallback (optional - used when self-hosted is unavailable)
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),    // "gpt-4o-mini" (default)

  // Stripe (optional - billing features disabled without it)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID: z.string().optional(),  // Monthly subscription price ID

  // Usage limits (with defaults)
  USAGE_LIMIT_GENERATIONS: z.coerce.number().default(200),
  USAGE_LIMIT_RECALIBRATIONS: z.coerce.number().default(500),

  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

// Validate on import - fail fast if missing
function validateEnv() {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    console.error('Invalid environment variables:')
    console.error(parsed.error.flatten().fieldErrors)
    throw new Error('Invalid environment variables')
  }

  return parsed.data
}

export const env = validateEnv()

// Type-safe env access
export type Env = z.infer<typeof envSchema>
