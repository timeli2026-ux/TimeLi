/**
 * Parse Goal API Endpoint
 * Phase 11: LLM Gateway Activation - Plan 01
 *
 * POST /api/llm/parse-goal
 * Parses natural language goal descriptions into structured data.
 *
 * Features:
 * - Authenticates user
 * - Rate limits (10 requests per minute)
 * - Checks token budgets (daily and session)
 * - Checks LLM availability
 * - Caches responses for identical inputs
 * - Tracks token usage (daily and session)
 * - Returns structured goal or clarification questions
 *
 * Simplified: Uses Anthropic only (no multi-provider fallback).
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
import { buildGoalParserPrompt, parseGoalResponse, isClarificationNeeded } from '@/lib/llm/prompts/goal-parser'
import { recordCacheHit, recordCacheMiss } from '@/app/api/llm/usage/route'
import type { ChatMessage, ChatResponse } from '@/lib/llm/types'
import { NextResponse } from 'next/server'

// Session cookie name
const SESSION_COOKIE = 'llm_session_id'

// =============================================================================
// TYPES
// =============================================================================

interface ParseGoalRequest {
  message: string
  context?: string
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

    // 3. Rate limit (10 requests per minute per user)
    const rateLimitResult = rateLimit(`parse-goal:${user.id}`, { interval: 60000, limit: 10 })
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.', remaining: 0 },
        { status: 429 }
      )
    }

    // 4. Parse request body
    let body: ParseGoalRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { message, context } = body
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    // Validate message length
    if (message.length > 1000) {
      return NextResponse.json({ error: 'message too long (max 1000 characters)' }, { status: 400 })
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

    // 6. Check LLM status (fast fail)
    const status = await getLLMStatus()
    if (!status.available) {
      return NextResponse.json({
        error: 'Goal parsing unavailable',
        offline: true,
        message: status.message,
      }, { status: 503 })
    }

    // 7. Build messages for LLM
    const systemPrompt = buildGoalParserPrompt()
    const userMessage = context
      ? `Context: ${context}\n\nGoal: ${message}`
      : message

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]

    // 8. Check cache
    const cacheKey = generateCacheKey(messages)
    const cached = getCached(cacheKey)

    if (cached) {
      // Record cache hit
      recordCacheHit(estimateTokens(messages))

      // Parse cached response
      const parsed = parseGoalResponse(cached.content)
      if (parsed) {
        if (isClarificationNeeded(parsed)) {
          return NextResponse.json({
            needsClarification: true,
            questions: parsed.questions,
            cached: true,
          })
        }
        return NextResponse.json({
          goal: parsed,
          cached: true,
        })
      }
      // Cache hit but parse failed - continue to fresh call
    }

    // Record cache miss
    recordCacheMiss()

    // 9. Get LLM provider and call
    const provider = await getLLMProvider()
    let response: ChatResponse

    try {
      response = await provider.chat(messages, { maxTokens: 500, temperature: 0.3 })
    } catch (llmError) {
      console.error('[ParseGoal] LLM call failed:', llmError)
      return NextResponse.json(
        { error: 'Failed to process goal description' },
        { status: 500 }
      )
    }

    // 10. Record token usage to BOTH session and daily trackers (fail open)
    let inputTokens = 0
    let outputTokens = 0
    try {
      // Estimate tokens if not provided
      inputTokens = response.tokensUsed
        ? Math.round(response.tokensUsed * 0.8) // Rough estimate: 80% input
        : estimateTokens(messages)
      outputTokens = response.tokensUsed
        ? Math.round(response.tokensUsed * 0.2) // Rough estimate: 20% output
        : Math.round(response.content.length / 4)

      // Record to daily tracker (database)
      await recordTokenUsage(supabase, user.id, inputTokens, outputTokens, response.provider)

      // Record to session tracker (in-memory)
      recordSessionUsage(sessionId, inputTokens, outputTokens)
    } catch (trackingError) {
      console.warn('[ParseGoal] Token tracking failed:', trackingError)
      // Don't fail the request - tracking is non-critical
    }

    // 11. Cache the response
    setCached(cacheKey, response)

    // 12. Parse response
    const parsed = parseGoalResponse(response.content)

    if (!parsed) {
      console.error('[ParseGoal] Failed to parse LLM response:', response.content)
      return NextResponse.json(
        { error: 'Failed to extract goal information. Please try rephrasing.' },
        { status: 500 }
      )
    }

    // 13. Build response with usage header
    const jsonResponse = isClarificationNeeded(parsed)
      ? NextResponse.json({
          needsClarification: true,
          questions: parsed.questions,
          provider: response.provider,
        })
      : NextResponse.json({
          goal: parsed,
          provider: response.provider,
        })

    // Add token usage header
    jsonResponse.headers.set(
      'X-Token-Usage',
      JSON.stringify({ input: inputTokens, output: outputTokens, provider: response.provider })
    )

    return jsonResponse

  } catch (error) {
    console.error('[ParseGoal] Unexpected error:', error)
    // Sanitize error - don't expose internal details
    return NextResponse.json(
      { error: 'Failed to parse goal' },
      { status: 500 }
    )
  }
}
