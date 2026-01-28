/**
 * Syllabus Parse API Endpoint
 * Phase 12: Syllabus Import - Plan 01
 *
 * POST /api/syllabus/parse
 * Parses syllabus text to extract course information and assignments.
 *
 * Features:
 * - Authenticates user
 * - Rate limits (5 requests per minute - heavier than goal parsing)
 * - Checks token budgets (daily and session)
 * - Checks LLM availability
 * - Caches responses for identical inputs
 * - Tracks token usage (daily and session)
 * - Returns structured course + assignments or clarification questions
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
  buildSyllabusParserPrompt,
  parseSyllabusResponse,
  isSyllabusClarificationNeeded,
} from '@/lib/llm/prompts/syllabus-parser'
import { syllabusParseRequestSchema } from '@/lib/validations/syllabus'
import { recordCacheHit, recordCacheMiss } from '@/app/api/llm/usage/route'
import type { ChatMessage, ChatResponse } from '@/lib/llm/types'
import { NextResponse } from 'next/server'

// Session cookie name
const SESSION_COOKIE = 'llm_session_id'

// =============================================================================
// API HANDLER
// =============================================================================

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Extract or generate session ID
    const cookieStore = await cookies()
    let sessionId = cookieStore.get(SESSION_COOKIE)?.value
    if (!sessionId) {
      sessionId = generateSessionId(user.id)
    }

    // 3. Rate limit (5 requests per minute per user - heavier than goal parsing)
    const rateLimitResult = rateLimit(`syllabus-parse:${user.id}`, {
      interval: 60000,
      limit: 5,
    })
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please wait before trying again.',
          remaining: 0,
        },
        { status: 429 }
      )
    }

    // 4. Check token budget BEFORE calling LLM
    const budgetCheck = await checkCombinedBudget(supabase, user.id, sessionId)
    if (!budgetCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Token budget exceeded',
          type: budgetCheck.limitHit,
          resetAt:
            budgetCheck.limitHit === 'daily_limit'
              ? budgetCheck.resetAt.daily
              : budgetCheck.resetAt.session,
          usage: {
            daily: budgetCheck.daily,
            session: budgetCheck.session,
          },
        },
        { status: 429 }
      )
    }

    // 5. Check LLM status (fast fail)
    const status = await getLLMStatus()
    if (!status.available) {
      return NextResponse.json(
        {
          error: 'Syllabus parsing unavailable',
          offline: true,
          message: status.message,
        },
        { status: 503 }
      )
    }

    // 6. Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parseResult = syllabusParseRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: parseResult.error.issues.map((e) => e.message).join(', '),
        },
        { status: 400 }
      )
    }

    const { syllabusText, courseName, semester } = parseResult.data

    // 7. Build messages for LLM
    const systemPrompt = buildSyllabusParserPrompt()

    // Build user message with syllabus text and optional pre-filled info
    let userMessage = syllabusText
    if (courseName || semester) {
      const context = []
      if (courseName) context.push(`Course name: ${courseName}`)
      if (semester) context.push(`Semester: ${semester}`)
      userMessage = `${context.join('\n')}\n\n---\n\nSyllabus:\n${syllabusText}`
    }

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
      const parsed = parseSyllabusResponse(cached.content)
      if (parsed) {
        if (isSyllabusClarificationNeeded(parsed)) {
          return NextResponse.json({
            needsClarification: true,
            questions: parsed.questions,
            cached: true,
          })
        }
        return NextResponse.json({
          course: {
            name: parsed.courseName,
            instructor: parsed.instructor,
            semester: parsed.semester,
          },
          assignments: parsed.assignments,
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
      // Higher max tokens for syllabi (can generate long assignment lists)
      // Lower temperature for accuracy
      response = await provider.chat(messages, { maxTokens: 2000, temperature: 0.2 })
    } catch (llmError) {
      console.error('[SyllabusParse] LLM call failed:', llmError)
      return NextResponse.json(
        {
          error:
            'Failed to process syllabus. Try pasting a shorter section or check that the text contains assignment information.',
        },
        { status: 500 }
      )
    }

    // 10. Record token usage to BOTH session and daily trackers (fail open)
    let inputTokens = 0
    let outputTokens = 0
    try {
      // Estimate tokens if not provided
      inputTokens = response.tokensUsed
        ? Math.round(response.tokensUsed * 0.7) // Syllabi have more input
        : estimateTokens(messages)
      outputTokens = response.tokensUsed
        ? Math.round(response.tokensUsed * 0.3)
        : Math.round(response.content.length / 4)

      // Record to daily tracker (database)
      await recordTokenUsage(
        supabase,
        user.id,
        inputTokens,
        outputTokens,
        response.provider
      )

      // Record to session tracker (in-memory)
      recordSessionUsage(sessionId, inputTokens, outputTokens)
    } catch (trackingError) {
      console.warn('[SyllabusParse] Token tracking failed:', trackingError)
      // Don't fail the request - tracking is non-critical
    }

    // 11. Cache the response
    setCached(cacheKey, response)

    // 12. Parse response
    console.log('[SyllabusParse] Raw LLM response:', response.content.substring(0, 500))
    const parsed = parseSyllabusResponse(response.content)

    if (!parsed) {
      console.error(
        '[SyllabusParse] Failed to parse LLM response (full):',
        response.content
      )
      return NextResponse.json(
        {
          error:
            'Failed to extract course information. Please ensure the text is a syllabus with assignments, or try pasting a shorter section.',
        },
        { status: 500 }
      )
    }

    // 13. Build response
    if (isSyllabusClarificationNeeded(parsed)) {
      const jsonResponse = NextResponse.json({
        needsClarification: true,
        questions: parsed.questions,
        provider: response.provider,
      })

      // Add token usage header
      jsonResponse.headers.set(
        'X-Token-Usage',
        JSON.stringify({
          input: inputTokens,
          output: outputTokens,
          provider: response.provider,
        })
      )

      return jsonResponse
    }

    // Return structured course + assignments
    const jsonResponse = NextResponse.json({
      course: {
        name: parsed.courseName,
        instructor: parsed.instructor,
        semester: parsed.semester,
      },
      assignments: parsed.assignments,
      provider: response.provider,
      cached: false,
    })

    // Add token usage header
    jsonResponse.headers.set(
      'X-Token-Usage',
      JSON.stringify({
        input: inputTokens,
        output: outputTokens,
        provider: response.provider,
      })
    )

    return jsonResponse
  } catch (error) {
    console.error('[SyllabusParse] Unexpected error:', error)
    // Sanitize error - don't expose internal details
    return NextResponse.json({ error: 'Failed to parse syllabus' }, { status: 500 })
  }
}
