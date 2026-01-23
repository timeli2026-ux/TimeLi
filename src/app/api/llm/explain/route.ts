/**
 * Explain Rationale API Endpoint
 * Phase 8: LLM Gateway - Plan 04
 *
 * POST /api/llm/explain
 * Generates human-readable explanations for why events were scheduled.
 *
 * Features:
 * - Authenticates user
 * - Checks token budgets (daily and session)
 * - Caches responses for identical inputs
 * - Tracks token usage (daily and session)
 * - Returns explanations <=240 characters
 */

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getLLMProvider, getLLMStatus, estimateTokens } from '@/lib/llm'
import { generateCacheKey, getCached, setCached } from '@/lib/llm/cache'
import {
  recordTokenUsage,
  recordSessionUsage,
  checkCombinedBudget,
  generateSessionId,
} from '@/lib/llm/token-budget'
import { rateLimit } from '@/lib/rate-limit'
import {
  buildExplainPrompt,
  parseExplainResponse,
  type ScoringFactor,
} from '@/lib/llm/prompts/explain-rationale'
import { getApiUsage } from '@/lib/services/api-usage'
import { recordCacheHit, recordCacheMiss } from '@/app/api/llm/usage/route'
import type { ChatMessage, ChatResponse } from '@/lib/llm/types'
import type { ScheduleEventWithFlexibility } from '@/lib/scheduling/types'
import { NextResponse } from 'next/server'

// Session cookie name
const SESSION_COOKIE = 'llm_session_id'

// =============================================================================
// TYPES
// =============================================================================

interface ExplainRequest {
  event: ScheduleEventWithFlexibility
  scoringFactors: ScoringFactor[]
}

// =============================================================================
// API HANDLER
// =============================================================================

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Extract or generate session ID
    const cookieStore = await cookies()
    let sessionId = cookieStore.get(SESSION_COOKIE)?.value
    if (!sessionId) {
      sessionId = generateSessionId(user.id)
    }

    // 3. Rate limit (20 requests per minute - explanations are quick)
    const rateLimitResult = rateLimit(`explain:${user.id}`, { interval: 60000, limit: 20 })
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.', remaining: 0 },
        { status: 429 }
      )
    }

    // 4. Parse request body
    let body: ExplainRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { event, scoringFactors } = body
    if (!event || !scoringFactors) {
      return NextResponse.json({ error: 'event and scoringFactors are required' }, { status: 400 })
    }

    // Validate event has required fields
    if (!event.title || !event.slot) {
      return NextResponse.json({ error: 'event must have title and slot' }, { status: 400 })
    }

    // 5. Check token budget BEFORE calling LLM
    const budgetCheck = await checkCombinedBudget(supabase, user.id, sessionId)
    if (!budgetCheck.allowed) {
      return NextResponse.json({
        error: 'Token budget exceeded',
        type: budgetCheck.limitHit,
        resetAt: budgetCheck.limitHit === 'daily_limit'
          ? budgetCheck.resetAt.daily
          : budgetCheck.resetAt.session,
        usage: {
          daily: budgetCheck.daily,
          session: budgetCheck.session,
        },
      }, { status: 429 })
    }

    // 6. Get API usage for router context
    const apiUsage = await getApiUsage(supabase, user.id)
    const routerContext = {
      userId: user.id,
      apiUsageRemaining: apiUsage.remaining,
    }

    // 7. Check LLM status (fast fail)
    const status = await getLLMStatus(routerContext)
    if (!status.available) {
      return NextResponse.json({
        error: 'Explanation unavailable',
        offline: true,
        message: status.message,
      }, { status: 503 })
    }

    // 8. Build messages for LLM
    const systemPrompt = buildExplainPrompt(event, scoringFactors)

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Generate the explanation.' },
    ]

    // 9. Check cache
    const cacheKey = generateCacheKey(messages)
    const cached = getCached(cacheKey)

    if (cached) {
      // Record cache hit
      recordCacheHit(estimateTokens(messages))

      const explanation = parseExplainResponse(cached.content)
      return NextResponse.json({
        explanation,
        cached: true,
      })
    }

    // Record cache miss
    recordCacheMiss()

    // 10. Get LLM provider and call
    const provider = await getLLMProvider(routerContext)
    let response: ChatResponse

    try {
      response = await provider.chat(messages, { maxTokens: 100, temperature: 0.5 })
    } catch (llmError) {
      console.error('[Explain] LLM call failed:', llmError)
      return NextResponse.json(
        { error: 'Failed to generate explanation' },
        { status: 500 }
      )
    }

    // 11. Record token usage to BOTH session and daily trackers (fail open)
    let inputTokens = 0
    let outputTokens = 0
    try {
      inputTokens = response.tokensUsed
        ? Math.round(response.tokensUsed * 0.8)
        : estimateTokens(messages)
      outputTokens = response.tokensUsed
        ? Math.round(response.tokensUsed * 0.2)
        : Math.round(response.content.length / 4)

      await recordTokenUsage(supabase, user.id, inputTokens, outputTokens, response.provider)
      recordSessionUsage(sessionId, inputTokens, outputTokens)
    } catch (trackingError) {
      console.warn('[Explain] Token tracking failed:', trackingError)
    }

    // 12. Cache the response
    setCached(cacheKey, response)

    // 13. Parse and return response
    const explanation = parseExplainResponse(response.content)

    const jsonResponse = NextResponse.json({
      explanation,
      provider: response.provider,
    })

    // Add token usage header
    jsonResponse.headers.set(
      'X-Token-Usage',
      JSON.stringify({ input: inputTokens, output: outputTokens, provider: response.provider })
    )

    return jsonResponse

  } catch (error) {
    console.error('[Explain] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to generate explanation' },
      { status: 500 }
    )
  }
}
