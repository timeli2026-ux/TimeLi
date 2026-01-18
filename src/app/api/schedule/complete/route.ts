// Schedule completion API endpoint
// Phase 6: Calendar UI - Plan 03
// POST /api/schedule/complete

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// TYPES
// =============================================================================

export type CompletionStatus = 'completed' | 'skipped' | 'partial'

interface CompleteScheduleRequest {
  eventId: string
  status: CompletionStatus
  notes?: string
  weekStart?: string // YYYY-MM-DD format
  goalId?: string
  scheduledDate?: string // YYYY-MM-DD format
  scheduledStartTime?: string // HH:mm format
}

interface CompleteScheduleResponse {
  success: boolean
  error?: string
}

// =============================================================================
// API HANDLER
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<CompleteScheduleResponse>> {
  try {
    // 1. Authenticate
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Parse request body
    let body: CompleteScheduleRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { eventId, status, notes, weekStart, goalId, scheduledDate, scheduledStartTime } = body

    // 3. Validate required fields
    if (!eventId || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: eventId and status' },
        { status: 400 }
      )
    }

    // 4. Validate status value
    if (!['completed', 'skipped', 'partial'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be: completed, skipped, or partial' },
        { status: 400 }
      )
    }

    // 5. Find the schedule for this week (if weekStart provided)
    let scheduleId: string | null = null
    if (weekStart) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: schedule } = await (supabase as any)
        .from('generated_schedules')
        .select('id')
        .eq('user_id', user.id)
        .eq('week_start', weekStart)
        .single() as { data: { id: string } | null }
      scheduleId = schedule?.id || null
    }

    // 6. Save completion to database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any)
      .from('schedule_completions')
      .insert({
        user_id: user.id,
        schedule_id: scheduleId,
        event_id: eventId,
        goal_id: goalId || null,
        status,
        notes: notes || null,
        scheduled_date: scheduledDate || null,
        scheduled_start_time: scheduledStartTime || null,
        completed_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('Failed to save completion:', insertError)
      // Still return success - logging failure shouldn't block the user
    }

    console.log(`[Schedule Complete] User ${user.id} marked event ${eventId} as ${status}`)

    // 7. Return success
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Schedule completion error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to log completion' },
      { status: 500 }
    )
  }
}
