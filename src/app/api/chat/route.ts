/**
 * Chat API Endpoint
 * Phase 6.5: Schedule Chat - Plan 03
 *
 * POST /api/chat
 * Handles chat messages for schedule modification discussions.
 *
 * Features:
 * - Authenticates user
 * - Rate limits (20 requests per minute)
 * - API usage tracking for fallback provider
 * - Fast-fails if LLM offline
 * - Persists conversation history
 * - Parses responses for schedule modifications
 * - Applies modifications (move, delete, feedback)
 * - Returns assistant response with modification status
 */

import { createClient } from '@/lib/supabase/server'
import { getLLMProvider, getLLMStatus } from '@/lib/llm'
import { getOrCreateConversation, addMessage, toPromptMessages, StoredMessage } from '@/lib/services/conversation'
import { getApiUsage, incrementApiUsage } from '@/lib/services/api-usage'
import { rateLimit } from '@/lib/rate-limit'
import { buildScheduleSystemPrompt } from '@/lib/chat/schedule-prompts'
import { parseModificationFromResponse, extractTextWithoutJson, type ScheduleModification } from '@/lib/chat/modification-parser'
import type { ScheduleEventWithFlexibility, TimeSlot } from '@/lib/scheduling/types'
import { NextResponse } from 'next/server'

// =============================================================================
// TYPES
// =============================================================================

interface ModificationResult {
  action: string
  success: boolean
  eventId?: string
  error?: string
}

// =============================================================================
// HELPER: Load Schedule
// =============================================================================

async function loadSchedule(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  userId: string,
  weekStart: string
): Promise<ScheduleEventWithFlexibility[] | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: schedule, error } = await (supabase as any)
    .from('generated_schedules')
    .select('events')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .single()

  if (error || !schedule) {
    return null
  }

  return schedule.events as ScheduleEventWithFlexibility[]
}

// =============================================================================
// HELPER: Apply Move Modification
// =============================================================================

async function applyMoveModification(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  userId: string,
  weekStart: string,
  eventId: string,
  newSlot: { dayOfWeek: number; startTime: string }
): Promise<ModificationResult> {
  // Load current schedule
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: schedule, error: loadError } = await (supabase as any)
    .from('generated_schedules')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .single()

  if (loadError || !schedule) {
    return { action: 'move', success: false, eventId, error: 'Schedule not found' }
  }

  const events = schedule.events as ScheduleEventWithFlexibility[]
  const eventIndex = events.findIndex(e => e.id === eventId)

  if (eventIndex === -1) {
    return { action: 'move', success: false, eventId, error: 'Event not found' }
  }

  // Check if event is locked
  if (events[eventIndex].isLocked) {
    return { action: 'move', success: false, eventId, error: 'Cannot move locked events' }
  }

  // Calculate new end time based on event duration
  const originalEvent = events[eventIndex]
  const durationMinutes = originalEvent.slot.durationMinutes

  // Parse start time and calculate end time
  const [hours, minutes] = newSlot.startTime.split(':').map(Number)
  const startMinutes = hours * 60 + minutes
  const endMinutes = startMinutes + durationMinutes
  const endHours = Math.floor(endMinutes / 60)
  const endMins = endMinutes % 60
  const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`

  // Build new slot
  const fullNewSlot: TimeSlot = {
    dayOfWeek: newSlot.dayOfWeek,
    startTime: newSlot.startTime,
    endTime,
    durationMinutes,
  }

  // Update the event
  events[eventIndex].slot = fullNewSlot

  // Save back to database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: saveError } = await (supabase as any)
    .from('generated_schedules')
    .update({
      events,
      updated_at: new Date().toISOString(),
    })
    .eq('id', schedule.id)

  if (saveError) {
    console.error('Failed to save schedule:', saveError)
    return { action: 'move', success: false, eventId, error: 'Failed to save schedule' }
  }

  console.log(`[Chat Modification] Moved event ${eventId} to ${newSlot.dayOfWeek} at ${newSlot.startTime}`)
  return { action: 'move', success: true, eventId }
}

// =============================================================================
// HELPER: Apply Delete Modification
// =============================================================================

async function applyDeleteModification(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  userId: string,
  weekStart: string,
  eventId: string
): Promise<ModificationResult> {
  // Load current schedule
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: schedule, error: loadError } = await (supabase as any)
    .from('generated_schedules')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .single()

  if (loadError || !schedule) {
    return { action: 'delete', success: false, eventId, error: 'Schedule not found' }
  }

  const events = schedule.events as ScheduleEventWithFlexibility[]
  const eventIndex = events.findIndex(e => e.id === eventId)

  if (eventIndex === -1) {
    return { action: 'delete', success: false, eventId, error: 'Event not found' }
  }

  // Check if event is locked
  if (events[eventIndex].isLocked) {
    return { action: 'delete', success: false, eventId, error: 'Cannot delete locked events' }
  }

  // Remove the event
  events.splice(eventIndex, 1)

  // Save back to database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: saveError } = await (supabase as any)
    .from('generated_schedules')
    .update({
      events,
      updated_at: new Date().toISOString(),
    })
    .eq('id', schedule.id)

  if (saveError) {
    console.error('Failed to save schedule:', saveError)
    return { action: 'delete', success: false, eventId, error: 'Failed to save schedule' }
  }

  console.log(`[Chat Modification] Deleted event ${eventId}`)
  return { action: 'delete', success: true, eventId }
}

// =============================================================================
// HELPER: Apply Feedback
// =============================================================================

async function applyFeedback(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  userId: string,
  feedback: string
): Promise<ModificationResult> {
  // Store feedback in schedule_feedback table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('schedule_feedback')
    .insert({
      user_id: userId,
      feedback_type: 'general',
      preference_value: feedback,
      source: 'chat',
      is_active: true,
    })

  if (error) {
    console.error('Failed to save feedback:', error)
    return { action: 'feedback', success: false, error: 'Failed to save preference' }
  }

  console.log(`[Chat Feedback] Stored feedback for user ${userId}: ${feedback}`)
  return { action: 'feedback', success: true }
}

// =============================================================================
// HELPER: Apply Modification
// =============================================================================

async function applyModification(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  userId: string,
  weekStart: string,
  modification: ScheduleModification
): Promise<ModificationResult | null> {
  switch (modification.action) {
    case 'move':
      if (!modification.eventId || !modification.newSlot) {
        return { action: 'move', success: false, error: 'Invalid move data' }
      }
      return applyMoveModification(supabase, userId, weekStart, modification.eventId, modification.newSlot)

    case 'delete':
      if (!modification.eventId) {
        return { action: 'delete', success: false, error: 'Invalid delete data' }
      }
      return applyDeleteModification(supabase, userId, weekStart, modification.eventId)

    case 'feedback':
      if (!modification.feedback) {
        return { action: 'feedback', success: false, error: 'Invalid feedback data' }
      }
      return applyFeedback(supabase, userId, modification.feedback)

    case 'none':
    default:
      return null
  }
}

// =============================================================================
// API HANDLER
// =============================================================================

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

    // 4. Get API usage for routing context
    const usage = await getApiUsage(supabase, user.id)
    const routerContext = {
      userId: user.id,
      apiUsageRemaining: usage.remaining,
    }

    // 5. Check LLM status first (fast fail)
    const status = await getLLMStatus(routerContext)
    if (!status.available) {
      return NextResponse.json({
        error: 'Chat unavailable',
        offline: true,
        message: status.message,
        apiUsage: status.apiUsage,
      }, { status: 503 })
    }

    // 6. Load current schedule for context
    const schedule = await loadSchedule(supabase, user.id, weekStart)

    // 7. Build system prompt with schedule context
    const systemPrompt = buildScheduleSystemPrompt(schedule || [])

    // 8. Get provider and conversation
    const provider = await getLLMProvider(routerContext)
    const conversation = await getOrCreateConversation(supabase, user.id, weekStart)

    // 9. Add user message
    const userMessage: StoredMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    }
    await addMessage(supabase, conversation.id, userMessage)

    // 10. Build prompt with conversation history
    const messages = toPromptMessages([...conversation.messages, userMessage], systemPrompt)

    // 11. Call LLM
    const response = await provider.chat(messages, { maxTokens: 500 })

    // 12. If API fallback was used, increment usage
    const usedApiFallback = provider.getName() === 'openai-api'
    if (usedApiFallback) {
      await incrementApiUsage(supabase, user.id)
    }

    // 13. Parse response for modifications
    const modification = parseModificationFromResponse(response.content)
    let modificationResult: ModificationResult | null = null

    // 14. Apply modification if found
    if (modification) {
      modificationResult = await applyModification(supabase, user.id, weekStart, modification)
    }

    // 15. Save assistant response
    const assistantMessage: StoredMessage = {
      role: 'assistant',
      content: response.content,
      timestamp: new Date().toISOString(),
    }
    await addMessage(supabase, conversation.id, assistantMessage)

    // 16. Extract clean text for display (without JSON blocks)
    const displayMessage = extractTextWithoutJson(response.content)

    // 17. Return response with usage info and modification result
    return NextResponse.json({
      message: displayMessage,
      provider: response.provider,
      ...(modificationResult && { modification: modificationResult }),
      ...(usedApiFallback && {
        apiUsage: {
          used: usage.used + 1,
          limit: usage.limit,
          remaining: usage.remaining - 1,
        },
      }),
    })

  } catch (error) {
    console.error('Chat error:', error)
    // Sanitize error - don't expose internal details
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}
