import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'

// =============================================================================
// TYPES
// =============================================================================

export interface UsageStats {
  generations: { used: number; limit: number }
  recalibrations: { used: number; limit: number }
  periodEnd: Date
}

interface UsagePeriod {
  id: string
  user_id: string
  period_start: string
  period_end: string
  schedule_generations: number
  recalibrations: number
  llm_requests: number
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get the first day of the current month (YYYY-MM-DD format)
 */
function getMonthStart(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

/**
 * Get the last day of the current month (YYYY-MM-DD format)
 */
function getMonthEnd(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  // Day 0 of next month = last day of current month
  const lastDay = new Date(year, month + 1, 0).getDate()
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

// =============================================================================
// USAGE SERVICE FUNCTIONS
// =============================================================================

/**
 * Get or create the current billing period for a user.
 * Period is calendar month (1st to last day).
 */
export async function getCurrentPeriod(userId: string): Promise<UsagePeriod | null> {
  const supabase = await createClient()
  const periodStart = getMonthStart()
  const periodEnd = getMonthEnd()

  // Try to get existing period
  const { data: existing, error: selectError } = await (supabase as any)
    .from('usage_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('period_start', periodStart)
    .single()

  if (existing && !selectError) {
    return existing as UsagePeriod
  }

  // Create new period if doesn't exist
  const { data: created, error: insertError } = await (supabase as any)
    .from('usage_tracking')
    .insert({
      user_id: userId,
      period_start: periodStart,
      period_end: periodEnd,
      schedule_generations: 0,
      recalibrations: 0,
      llm_requests: 0,
    })
    .select()
    .single()

  if (insertError) {
    // May be race condition - try to get it again
    const { data: retry } = await (supabase as any)
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('period_start', periodStart)
      .single()

    if (retry) {
      return retry as UsagePeriod
    }

    console.error('Failed to get or create usage period:', insertError)
    return null
  }

  return created as UsagePeriod
}

/**
 * Increment schedule_generations counter, returns new count.
 */
export async function incrementGenerations(userId: string): Promise<number> {
  const period = await getCurrentPeriod(userId)
  if (!period) {
    // Fail open - don't block usage if tracking fails
    console.error('Failed to get usage period for incrementGenerations')
    return 0
  }

  const supabase = await createClient()
  const newCount = period.schedule_generations + 1

  const { error } = await (supabase as any)
    .from('usage_tracking')
    .update({
      schedule_generations: newCount,
    })
    .eq('id', period.id)

  if (error) {
    console.error('Failed to increment generations:', error)
  }

  return newCount
}

/**
 * Increment recalibrations counter, returns new count.
 */
export async function incrementRecalibrations(userId: string): Promise<number> {
  const period = await getCurrentPeriod(userId)
  if (!period) {
    // Fail open - don't block usage if tracking fails
    console.error('Failed to get usage period for incrementRecalibrations')
    return 0
  }

  const supabase = await createClient()
  const newCount = period.recalibrations + 1

  const { error } = await (supabase as any)
    .from('usage_tracking')
    .update({
      recalibrations: newCount,
    })
    .eq('id', period.id)

  if (error) {
    console.error('Failed to increment recalibrations:', error)
  }

  return newCount
}

/**
 * Get current period usage with limits.
 */
export async function getUsage(userId: string): Promise<UsageStats | null> {
  const period = await getCurrentPeriod(userId)
  if (!period) {
    return null
  }

  return {
    generations: {
      used: period.schedule_generations,
      limit: env.USAGE_LIMIT_GENERATIONS,
    },
    recalibrations: {
      used: period.recalibrations,
      limit: env.USAGE_LIMIT_RECALIBRATIONS,
    },
    periodEnd: new Date(period.period_end + 'T23:59:59Z'),
  }
}

/**
 * Check if user can generate a schedule.
 * Returns true for trial users (no limits) or if under limit.
 */
export async function checkCanGenerate(userId: string): Promise<boolean> {
  const supabase = await createClient()

  // Check subscription status
  const { data: subscription } = await (supabase as any)
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .single()

  // Trial users have unlimited access
  const status = subscription?.status as string | undefined
  if (status === 'trialing' || status === 'inactive') {
    return true
  }

  // Active/past_due subscriptions have limits
  const period = await getCurrentPeriod(userId)
  if (!period) {
    // Fail open - allow if tracking fails
    return true
  }

  return period.schedule_generations < env.USAGE_LIMIT_GENERATIONS
}

/**
 * Check if user can recalibrate.
 * Returns true for trial users (no limits) or if under limit.
 */
export async function checkCanRecalibrate(userId: string): Promise<boolean> {
  const supabase = await createClient()

  // Check subscription status
  const { data: subscription } = await (supabase as any)
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .single()

  // Trial users have unlimited access
  const status = subscription?.status as string | undefined
  if (status === 'trialing' || status === 'inactive') {
    return true
  }

  // Active/past_due subscriptions have limits
  const period = await getCurrentPeriod(userId)
  if (!period) {
    // Fail open - allow if tracking fails
    return true
  }

  return period.recalibrations < env.USAGE_LIMIT_RECALIBRATIONS
}

/**
 * Get subscription status for user.
 * Returns null if no subscription exists.
 */
export async function getSubscriptionStatus(
  userId: string
): Promise<{
  status: 'inactive' | 'trialing' | 'active' | 'canceled' | 'past_due'
  trialEnd: Date | null
  periodEnd: Date | null
} | null> {
  const supabase = await createClient()

  const { data: subscription, error } = await (supabase as any)
    .from('subscriptions')
    .select('status, trial_end, current_period_end')
    .eq('user_id', userId)
    .single()

  if (error || !subscription) {
    return null
  }

  return {
    status: subscription.status,
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end) : null,
    periodEnd: subscription.current_period_end
      ? new Date(subscription.current_period_end)
      : null,
  }
}
