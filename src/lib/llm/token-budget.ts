/**
 * Token Budget Tracking Service
 * Phase 8: LLM Gateway - Plan 01
 *
 * Tracks and enforces token usage limits per user.
 *
 * Budget limits from PRD:
 * - Daily: 100k input tokens, 20k output tokens
 * - Session: 3k input tokens, 500 output tokens
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// Budget limits from PRD
const DAILY_LIMITS = {
  input: 100_000,   // 100k input tokens per day
  output: 20_000,   // 20k output tokens per day
}

const SESSION_LIMITS = {
  input: 3_000,     // 3k input tokens per session
  output: 500,      // 500 output tokens per session
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  total: number
}

export interface BudgetCheck {
  allowed: boolean
  remaining: {
    input: number
    output: number
    total: number
  }
  limits: {
    input: number
    output: number
  }
}

/**
 * Record token usage for a user
 * Creates a new row for each LLM request (enables granular analytics)
 */
export async function recordTokenUsage(
  supabase: SupabaseClient,
  userId: string,
  inputTokens: number,
  outputTokens: number,
  provider: string
): Promise<void> {
  const { error } = await (supabase as any)
    .from('token_usage')
    .insert({
      user_id: userId,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      provider,
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    })

  if (error) {
    console.error('Failed to record token usage:', error)
    // Don't throw - usage tracking shouldn't break LLM calls
  }
}

/**
 * Get daily token usage for a user
 * Aggregates all usage records for today
 */
export async function getDailyUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<TokenUsage> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await (supabase as any)
    .from('token_usage')
    .select('input_tokens, output_tokens')
    .eq('user_id', userId)
    .eq('date', today)

  if (error) {
    console.error('Failed to get daily usage:', error)
    // Return zero usage on error (fail open for UX)
    return { inputTokens: 0, outputTokens: 0, total: 0 }
  }

  // Aggregate all records for today
  const usage = (data || []).reduce(
    (acc: TokenUsage, row: { input_tokens: number; output_tokens: number }) => ({
      inputTokens: acc.inputTokens + row.input_tokens,
      outputTokens: acc.outputTokens + row.output_tokens,
      total: acc.total + row.input_tokens + row.output_tokens,
    }),
    { inputTokens: 0, outputTokens: 0, total: 0 }
  )

  return usage
}

/**
 * Check if user has remaining budget for LLM usage
 * Uses daily limits by default
 */
export async function checkBudget(
  supabase: SupabaseClient,
  userId: string,
  tier: 'daily' | 'session' = 'daily'
): Promise<BudgetCheck> {
  const usage = await getDailyUsage(supabase, userId)
  const limits = tier === 'daily' ? DAILY_LIMITS : SESSION_LIMITS

  const remainingInput = Math.max(0, limits.input - usage.inputTokens)
  const remainingOutput = Math.max(0, limits.output - usage.outputTokens)

  // Allowed if both input and output are under limits
  const allowed = usage.inputTokens < limits.input && usage.outputTokens < limits.output

  return {
    allowed,
    remaining: {
      input: remainingInput,
      output: remainingOutput,
      total: remainingInput + remainingOutput,
    },
    limits: {
      input: limits.input,
      output: limits.output,
    },
  }
}

/**
 * Get budget limits for display purposes
 */
export function getBudgetLimits(tier: 'daily' | 'session' = 'daily') {
  return tier === 'daily' ? DAILY_LIMITS : SESSION_LIMITS
}
