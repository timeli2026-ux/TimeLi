/**
 * Chat API Endpoint
 * Phase 6.5: Schedule Chat - Plan 01
 *
 * POST /api/chat
 * Handles chat messages for schedule modification discussions.
 *
 * Features:
 * - Authenticates user
 * - Rate limits (20 requests per minute)
 * - Fast-fails if LLM offline
 * - Persists conversation history
 * - Returns assistant response
 */

import { createClient } from '@/lib/supabase/server'
import { getLLMProvider, getLLMStatus } from '@/lib/llm'
import { getOrCreateConversation, addMessage, toPromptMessages, StoredMessage } from '@/lib/services/conversation'
import { rateLimit } from '@/lib/rate-limit'
import { NextResponse } from 'next/server'

// System prompt for schedule assistant
const SYSTEM_PROMPT = `You are a helpful schedule assistant for TimeLi.
Help the user understand and modify their weekly schedule.
Keep responses concise (this is chat, not essay format).
If the user asks to modify their schedule, acknowledge and confirm the change.
Be friendly but efficient - users are busy.`

export async function POST(request: Request) {
  try {
    // 1. Authenticate
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Rate limit (20 requests per minute per user)
    const rateLimitResult = rateLimit(`chat:${user.id}`, { interval: 60000, limit: 20 })
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.', remaining: 0 },
        { status: 429 }
      )
    }

    // 3. Parse request body
    let body: { message?: string; weekStart?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { message, weekStart } = body
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }
    if (!weekStart || typeof weekStart !== 'string') {
      return NextResponse.json({ error: 'weekStart is required' }, { status: 400 })
    }

    // Validate weekStart format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return NextResponse.json({ error: 'weekStart must be YYYY-MM-DD format' }, { status: 400 })
    }

    // 4. Check LLM status first (fast fail)
    const status = await getLLMStatus()
    if (!status.available) {
      return NextResponse.json({
        error: 'Chat unavailable',
        offline: true,
        message: status.message,
      }, { status: 503 })
    }

    // 5. Get provider and conversation
    const provider = await getLLMProvider()
    const conversation = await getOrCreateConversation(supabase, user.id, weekStart)

    // 6. Add user message
    const userMessage: StoredMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    }
    await addMessage(supabase, conversation.id, userMessage)

    // 7. Build prompt with conversation history
    const messages = toPromptMessages([...conversation.messages, userMessage], SYSTEM_PROMPT)

    // 8. Call LLM
    const response = await provider.chat(messages, { maxTokens: 500 })

    // 9. Save assistant response
    const assistantMessage: StoredMessage = {
      role: 'assistant',
      content: response.content,
      timestamp: new Date().toISOString(),
    }
    await addMessage(supabase, conversation.id, assistantMessage)

    // 10. Return response
    return NextResponse.json({
      message: response.content,
      provider: response.provider,
    })

  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}
