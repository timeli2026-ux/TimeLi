/**
 * API Usage Tracking Service
 * Phase 6.5: Schedule Chat - Plan 01
 *
 * Tracks per-user daily API usage for rate limiting.
 * Users get 10 API messages per day when using OpenAI fallback.
 * Resets at midnight (database date-based).
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// Configurable via env - set high for testing, lower for production
export const DAILY_API_LIMIT = parseInt(process.env.API_DAILY_LIMIT || '10', 10)

export interface UsageResult {
  used: number
  limit: number
  remaining: number
  canUseApi: boolean
}

/**
 * Get today's API usage for a user
 */
export async function getApiUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<UsageResult> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('api_usage')
    .select('message_count')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  // No row = no usage yet
  if (error?.code === 'PGRST116') {
    return {
      used: 0,
      limit: DAILY_API_LIMIT,
      remaining: DAILY_API_LIMIT,
      canUseApi: true,
    }
  }

  if (error) {
    console.error('Error fetching API usage:', error)
    // Fail open - allow usage if we can't check
    return {
      used: 0,
      limit: DAILY_API_LIMIT,
      remaining: DAILY_API_LIMIT,
      canUseApi: true,
    }
  }

  const used = data?.message_count ?? 0
  return {
    used,
    limit: DAILY_API_LIMIT,
    remaining: Math.max(0, DAILY_API_LIMIT - used),
    canUseApi: used < DAILY_API_LIMIT,
  }
}

/**
 * Increment usage count for today
 * Uses database function for atomic increment
 */
export async function incrementApiUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const today = new Date().toISOString().split('T')[0]

  const { error } = await supabase.rpc('increment_api_usage', {
    p_user_id: userId,
    p_date: today,
  })

  if (error) {
    console.error('Error incrementing API usage:', error)
    // Don't throw - non-critical, usage tracking failure shouldn't block chat
  }
}
