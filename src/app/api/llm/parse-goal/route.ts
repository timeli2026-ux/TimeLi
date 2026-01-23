/**
 * Parse Goal API Endpoint
 * Phase 8: LLM Gateway - Plan 02
 *
 * POST /api/llm/parse-goal
 * Parses natural language goal descriptions into structured data.
 *
 * Features:
 * - Authenticates user
 * - Rate limits (10 requests per minute)
 * - Checks LLM availability
 * - Caches responses for identical inputs
 * - Tracks token usage
 * - Returns structured goal or clarification questions
 */

import { createClient } from '@/lib/supabase/server'
import { getLLMProvider, getLLMStatus } from '@/lib/llm'
import { generateCacheKey, getCached, setCached } from '@/lib/llm/cache'
import { recordTokenUsage } from '@/lib/llm/token-budget'
import { rateLimit } from '@/lib/rate-limit'
import { buildGoalParserPrompt, parseGoalResponse, isClarificationNeeded } from '@/lib/llm/prompts/goal-parser'
import { getApiUsage } from '@/lib/services/api-usage'
import type { ChatMessage, ChatResponse } from '@/lib/llm/types'
import { NextResponse } from 'next/server'

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

    // 2. Rate limit (10 requests per minute per user)
    const rateLimitResult = rateLimit(`parse-goal:${user.id}`, { interval: 60000, limit: 10 })
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.', remaining: 0 },
        { status: 429 }
      )
    }

    // 3. Parse request body
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

    // 4. Get API usage for router context
    const usage = await getApiUsage(supabase, user.id)
    const routerContext = {
      userId: user.id,
      apiUsageRemaining: usage.remaining,
    }

    // 5. Check LLM status (fast fail)
    const status = await getLLMStatus(routerContext)
    if (!status.available) {
      return NextResponse.json({
        error: 'Goal parsing unavailable',
        offline: true,
        message: status.message,
      }, { status: 503 })
    }

    // 6. Build messages for LLM
    const systemPrompt = buildGoalParserPrompt()
    const userMessage = context
      ? `Context: ${context}\n\nGoal: ${message}`
      : message

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]

    // 7. Check cache
    const cacheKey = generateCacheKey(messages)
    const cached = getCached(cacheKey)

    if (cached) {
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

    // 8. Get LLM provider and call
    const provider = await getLLMProvider(routerContext)
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

    // 9. Record token usage (fail open - don't break on tracking errors)
    try {
      // Estimate tokens if not provided
      const inputTokens = response.tokensUsed
        ? Math.round(response.tokensUsed * 0.8) // Rough estimate: 80% input
        : Math.round(userMessage.length / 4) + Math.round(systemPrompt.length / 4)
      const outputTokens = response.tokensUsed
        ? Math.round(response.tokensUsed * 0.2) // Rough estimate: 20% output
        : Math.round(response.content.length / 4)

      await recordTokenUsage(supabase, user.id, inputTokens, outputTokens, response.provider)
    } catch (trackingError) {
      console.warn('[ParseGoal] Token tracking failed:', trackingError)
      // Don't fail the request - tracking is non-critical
    }

    // 10. Cache the response
    setCached(cacheKey, response)

    // 11. Parse response
    const parsed = parseGoalResponse(response.content)

    if (!parsed) {
      console.error('[ParseGoal] Failed to parse LLM response:', response.content)
      return NextResponse.json(
        { error: 'Failed to extract goal information. Please try rephrasing.' },
        { status: 500 }
      )
    }

    // 12. Return appropriate response
    if (isClarificationNeeded(parsed)) {
      return NextResponse.json({
        needsClarification: true,
        questions: parsed.questions,
        provider: response.provider,
      })
    }

    return NextResponse.json({
      goal: parsed,
      provider: response.provider,
    })

  } catch (error) {
    console.error('[ParseGoal] Unexpected error:', error)
    // Sanitize error - don't expose internal details
    return NextResponse.json(
      { error: 'Failed to parse goal' },
      { status: 500 }
    )
  }
}
