/**
 * Token Budget Tracking Service
 * Phase 8: LLM Gateway - Plan 01 & 04
 *
 * Tracks and enforces token usage limits per user.
 *
 * Budget limits from PRD:
 * - Daily: 100k input tokens, 20k output tokens
 * - Session: 3k input tokens, 500 output tokens (30-min window)
 */

import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

// Budget limits from PRD
export const DAILY_LIMITS = {
  input: 100_000,   // 100k input tokens per day
  output: 20_000,   // 20k output tokens per day
}

export const SESSION_LIMITS = {
  input: 3_000,     // 3k input tokens per session
  output: 500,      // 500 output tokens per session
}

// Session expires after 30 minutes of inactivity
const SESSION_TTL_MS = 30 * 60 * 1000 // 30 minutes

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

export interface CombinedBudgetCheck {
  allowed: boolean
  limitHit?: 'daily_limit' | 'session_limit'
  daily: BudgetCheck
  session: BudgetCheck
  resetAt: {
    daily: string      // ISO timestamp for next day
    session: string    // "30 minutes" or remaining time
  }
}

// Error type for budget exceeded
export const BUDGET_EXCEEDED = 'BUDGET_EXCEEDED' as const
export type BudgetExceededError = {
  type: typeof BUDGET_EXCEEDED
  limitHit: 'daily_limit' | 'session_limit'
  resetAt: string
  usage: CombinedBudgetCheck
}

// =============================================================================
// SESSION TRACKING (In-memory with 30-min TTL)
// =============================================================================

interface SessionEntry {
  inputTokens: number
  outputTokens: number
  lastAccess: number // timestamp
}

// In-memory session storage
const sessionStore = new Map<string, SessionEntry>()

/**
 * Generate a session ID for a user
 * Session ID = hash(userId + 30-min window index)
 * This means same user gets same session ID within the 30-min window
 */
export function generateSessionId(userId: string): string {
  const windowIndex = Math.floor(Date.now() / SESSION_TTL_MS)
  const raw = `${userId}:${windowIndex}`
  return createHash('sha256').update(raw).digest('hex').substring(0, 16)
}

/**
 * Clean up expired sessions on access
 */
function cleanupExpiredSessions(): void {
  const now = Date.now()
  for (const [sessionId, entry] of sessionStore.entries()) {
    if (now - entry.lastAccess > SESSION_TTL_MS) {
      sessionStore.delete(sessionId)
    }
  }
}

/**
 * Get session usage for a given session ID
 */
export function getSessionUsage(sessionId: string): TokenUsage {
  cleanupExpiredSessions()

  const entry = sessionStore.get(sessionId)
  if (!entry) {
    return { inputTokens: 0, outputTokens: 0, total: 0 }
  }

  return {
    inputTokens: entry.inputTokens,
    outputTokens: entry.outputTokens,
    total: entry.inputTokens + entry.outputTokens,
  }
}

/**
 * Record token usage for a session
 */
export function recordSessionUsage(
  sessionId: string,
  inputTokens: number,
  outputTokens: number
): void {
  cleanupExpiredSessions()

  const existing = sessionStore.get(sessionId)
  if (existing) {
    existing.inputTokens += inputTokens
    existing.outputTokens += outputTokens
    existing.lastAccess = Date.now()
  } else {
    sessionStore.set(sessionId, {
      inputTokens,
      outputTokens,
      lastAccess: Date.now(),
    })
  }
}

/**
 * Check if session has remaining budget
 */
export function checkSessionBudget(sessionId: string): BudgetCheck {
  const usage = getSessionUsage(sessionId)

  const remainingInput = Math.max(0, SESSION_LIMITS.input - usage.inputTokens)
  const remainingOutput = Math.max(0, SESSION_LIMITS.output - usage.outputTokens)

  const allowed = usage.inputTokens < SESSION_LIMITS.input &&
                  usage.outputTokens < SESSION_LIMITS.output

  return {
    allowed,
    remaining: {
      input: remainingInput,
      output: remainingOutput,
      total: remainingInput + remainingOutput,
    },
    limits: {
      input: SESSION_LIMITS.input,
      output: SESSION_LIMITS.output,
    },
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
 * Check if user has remaining budget for LLM usage (daily only)
 */
export async function checkDailyBudget(
  supabase: SupabaseClient,
  userId: string
): Promise<BudgetCheck> {
  const usage = await getDailyUsage(supabase, userId)

  const remainingInput = Math.max(0, DAILY_LIMITS.input - usage.inputTokens)
  const remainingOutput = Math.max(0, DAILY_LIMITS.output - usage.outputTokens)

  // Allowed if both input and output are under limits
  const allowed = usage.inputTokens < DAILY_LIMITS.input && usage.outputTokens < DAILY_LIMITS.output

  return {
    allowed,
    remaining: {
      input: remainingInput,
      output: remainingOutput,
      total: remainingInput + remainingOutput,
    },
    limits: {
      input: DAILY_LIMITS.input,
      output: DAILY_LIMITS.output,
    },
  }
}

/**
 * Legacy function for backwards compatibility
 * @deprecated Use checkDailyBudget or checkCombinedBudget instead
 */
export async function checkBudget(
  supabase: SupabaseClient,
  userId: string,
  tier: 'daily' | 'session' = 'daily'
): Promise<BudgetCheck> {
  if (tier === 'session') {
    const sessionId = generateSessionId(userId)
    return checkSessionBudget(sessionId)
  }
  return checkDailyBudget(supabase, userId)
}

/**
 * Check BOTH session and daily budget limits
 * Returns combined result with which limit was hit (if any)
 */
export async function checkCombinedBudget(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string
): Promise<CombinedBudgetCheck> {
  // Check both budgets in parallel
  const [dailyCheck, sessionCheck] = await Promise.all([
    checkDailyBudget(supabase, userId),
    Promise.resolve(checkSessionBudget(sessionId)),
  ])

  // Calculate reset times
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setUTCHours(0, 0, 0, 0)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

  // Session resets in ~30 min from window start (or when TTL expires)
  const sessionResetMinutes = Math.ceil((SESSION_TTL_MS - (Date.now() % SESSION_TTL_MS)) / 60000)

  // Determine if allowed and which limit was hit
  let allowed = true
  let limitHit: 'daily_limit' | 'session_limit' | undefined

  if (!sessionCheck.allowed) {
    allowed = false
    limitHit = 'session_limit'
  } else if (!dailyCheck.allowed) {
    allowed = false
    limitHit = 'daily_limit'
  }

  return {
    allowed,
    limitHit,
    daily: dailyCheck,
    session: sessionCheck,
    resetAt: {
      daily: tomorrow.toISOString(),
      session: `${sessionResetMinutes} minutes`,
    },
  }
}

/**
 * Get budget limits for display purposes
 */
export function getBudgetLimits(tier: 'daily' | 'session' = 'daily') {
  return tier === 'daily' ? DAILY_LIMITS : SESSION_LIMITS
}

/**
 * Clear session store (useful for testing)
 */
export function clearSessionStore(): void {
  sessionStore.clear()
}

/**
 * Get session store size (useful for debugging)
 */
export function getSessionStoreSize(): number {
  cleanupExpiredSessions()
  return sessionStore.size
}
