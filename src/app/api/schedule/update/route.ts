// Schedule update API endpoint
// Phase 6: Calendar UI - Plan 03
// POST /api/schedule/update

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { TimeSlot } from '@/lib/scheduling/types'

// =============================================================================
// REQUEST/RESPONSE TYPES
// =============================================================================

interface UpdateScheduleRequest {
  eventId: string
  newSlot: TimeSlot
  weekStart: string // YYYY-MM-DD format - required for persistence
}

interface UpdateScheduleResponse {
  success: boolean
  updatedEvent?: {
    id: string
    slot: TimeSlot
  }
  error?: string
}

// =============================================================================
// API HANDLER
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<UpdateScheduleResponse>> {
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
    let body: UpdateScheduleRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { eventId, newSlot, weekStart } = body

    // 3. Validate required fields
    if (!eventId || !newSlot || !weekStart) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: eventId, newSlot, and weekStart' },
        { status: 400 }
      )
    }

    // 4. Validate slot structure
    if (
      typeof newSlot.dayOfWeek !== 'number' ||
      newSlot.dayOfWeek < 0 ||
      newSlot.dayOfWeek > 6 ||
      !newSlot.startTime ||
      !newSlot.endTime ||
      typeof newSlot.durationMinutes !== 'number'
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid slot structure' },
        { status: 400 }
      )
    }

    // 5. Load current schedule from database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: schedule, error: loadError } = await (supabase as any)
      .from('generated_schedules')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .single() as { data: { id: string; events: unknown } | null; error: unknown }

    if (loadError || !schedule) {
      return NextResponse.json(
        { success: false, error: 'Schedule not found for this week' },
        { status: 404 }
      )
    }

    // 6. Find and update the event
    const events = schedule.events as Array<{ id: string; slot: TimeSlot; isLocked?: boolean }>
    const eventIndex = events.findIndex(e => e.id === eventId)

    if (eventIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Event not found in schedule' },
        { status: 404 }
      )
    }

    // 7. Check if event is locked
    if (events[eventIndex].isLocked) {
      return NextResponse.json(
        { success: false, error: 'Cannot move locked events' },
        { status: 400 }
      )
    }

    // 8. Update the event slot
    events[eventIndex].slot = newSlot

    // 9. Save back to database
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
      return NextResponse.json(
        { success: false, error: 'Failed to save schedule update' },
        { status: 500 }
      )
    }

    console.log(`[Schedule Update] User ${user.id} moved event ${eventId} to:`, newSlot)

    // 10. Return success with updated event
    return NextResponse.json({
      success: true,
      updatedEvent: {
        id: eventId,
        slot: newSlot,
      },
    })

  } catch (error) {
    console.error('Schedule update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update schedule' },
      { status: 500 }
    )
  }
}
