/**
 * LLM Usage API Endpoint
 * Phase 8: LLM Gateway - Plan 04
 *
 * GET /api/llm/usage
 * Returns comprehensive usage statistics for the authenticated user.
 *
 * Response includes:
 * - Daily token usage and limits
 * - Session token usage and limits
 * - Cache hit rate and savings
 * - Reset timestamps
 */

import { createClient } from '@/lib/supabase/server'
import {
  getDailyUsage,
  getSessionUsage,
  generateSessionId,
  DAILY_LIMITS,
  SESSION_LIMITS,
} from '@/lib/llm/token-budget'
import { getCacheStats } from '@/lib/llm/cache'
import { NextResponse } from 'next/server'

// =============================================================================
// TYPES
// =============================================================================

interface UsageResponse {
  daily: {
    inputTokens: number
    outputTokens: number
    inputLimit: number
    outputLimit: number
    inputRemaining: number
    outputRemaining: number
    percentUsed: number
  }
  session: {
    inputTokens: number
    outputTokens: number
    inputLimit: number
    outputLimit: number
    inputRemaining: number
    outputRemaining: number
    percentUsed: number
  }
  cache: {
    hitRate: number
    savedTokens: number
    size: number
    maxSize: number
  }
  resetAt: string // ISO timestamp for daily reset
}

// =============================================================================
// CACHE HIT TRACKING (In-memory for now)
// =============================================================================

// Simple in-memory tracking for cache stats
// In production, would use Redis or database
interface CacheMetrics {
  hits: number
  misses: number
  tokensSaved: number
}

const cacheMetrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  tokensSaved: 0,
}

/**
 * Record a cache hit (call this when cache is used)
 */
export function recordCacheHit(estimatedTokensSaved: number = 500): void {
  cacheMetrics.hits++
  cacheMetrics.tokensSaved += estimatedTokensSaved
}

/**
 * Record a cache miss (call this when cache is not used)
 */
export function recordCacheMiss(): void {
  cacheMetrics.misses++
}

/**
 * Get current cache hit rate
 */
function getCacheHitRate(): number {
  const total = cacheMetrics.hits + cacheMetrics.misses
  if (total === 0) return 0
  return cacheMetrics.hits / total
}

// =============================================================================
// API HANDLER
// =============================================================================

export async function GET() {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get daily usage from database
    const dailyUsage = await getDailyUsage(supabase, user.id)

    // 3. Get session usage from memory
    const sessionId = generateSessionId(user.id)
    const sessionUsage = getSessionUsage(sessionId)

    // 4. Get cache statistics
    const cacheStats = getCacheStats()
    const hitRate = getCacheHitRate()

    // 5. Calculate remaining and percentages
    const dailyInputRemaining = Math.max(0, DAILY_LIMITS.input - dailyUsage.inputTokens)
    const dailyOutputRemaining = Math.max(0, DAILY_LIMITS.output - dailyUsage.outputTokens)
    const dailyPercentUsed = Math.round(
      ((dailyUsage.inputTokens / DAILY_LIMITS.input) +
       (dailyUsage.outputTokens / DAILY_LIMITS.output)) / 2 * 100
    )

    const sessionInputRemaining = Math.max(0, SESSION_LIMITS.input - sessionUsage.inputTokens)
    const sessionOutputRemaining = Math.max(0, SESSION_LIMITS.output - sessionUsage.outputTokens)
    const sessionPercentUsed = Math.round(
      ((sessionUsage.inputTokens / SESSION_LIMITS.input) +
       (sessionUsage.outputTokens / SESSION_LIMITS.output)) / 2 * 100
    )

    // 6. Calculate reset time (next midnight UTC)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setUTCHours(0, 0, 0, 0)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

    // 7. Build response
    const response: UsageResponse = {
      daily: {
        inputTokens: dailyUsage.inputTokens,
        outputTokens: dailyUsage.outputTokens,
        inputLimit: DAILY_LIMITS.input,
        outputLimit: DAILY_LIMITS.output,
        inputRemaining: dailyInputRemaining,
        outputRemaining: dailyOutputRemaining,
        percentUsed: Math.min(100, dailyPercentUsed),
      },
      session: {
        inputTokens: sessionUsage.inputTokens,
        outputTokens: sessionUsage.outputTokens,
        inputLimit: SESSION_LIMITS.input,
        outputLimit: SESSION_LIMITS.output,
        inputRemaining: sessionInputRemaining,
        outputRemaining: sessionOutputRemaining,
        percentUsed: Math.min(100, sessionPercentUsed),
      },
      cache: {
        hitRate: Math.round(hitRate * 100) / 100, // 2 decimal places
        savedTokens: cacheMetrics.tokensSaved,
        size: cacheStats.size,
        maxSize: cacheStats.maxSize,
      },
      resetAt: tomorrow.toISOString(),
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[LLM Usage] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage statistics' },
      { status: 500 }
    )
  }
}
