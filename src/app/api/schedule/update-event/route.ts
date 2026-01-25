// Update event API endpoint
// POST /api/schedule/update-event

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { minutesToTime } from '@/lib/scheduling/types'

// =============================================================================
// REQUEST TYPES
// =============================================================================

interface UpdateEventRequest {
  weekStart: string // YYYY-MM-DD format
  eventId: string
  updates: {
    title?: string
    dayOfWeek?: number
    startTime?: string
    durationMinutes?: number
    realmId?: string
  }
}

interface DeleteEventRequest {
  weekStart: string // YYYY-MM-DD format
  eventId: string
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate end time from start time and duration
 */
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + durationMinutes
  return minutesToTime(totalMinutes)
}

// =============================================================================
// UPDATE HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Parse request body
    const body: UpdateEventRequest = await request.json()
    const { weekStart, eventId, updates } = body

    // 3. Validate required fields
    if (!weekStart || !eventId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 4. Get existing schedule
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: schedule, error: scheduleError } = await (supabase as any)
      .from('generated_schedules')
      .select('events')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .single()

    if (scheduleError) {
      return NextResponse.json(
        { error: 'Schedule not found for this week' },
        { status: 404 }
      )
    }

    // 5. Find the event to update
    const events = schedule.events || []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventIndex = events.findIndex((e: any) => e.id === eventId)

    if (eventIndex === -1) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    const existingEvent = events[eventIndex]

    // 6. Check if event is locked
    if (existingEvent.isLocked) {
      return NextResponse.json(
        { error: 'Cannot modify locked events' },
        { status: 400 }
      )
    }

    // 7. Get realm name if realmId changed
    let realmName = existingEvent.realmName
    if (updates.realmId && updates.realmId !== existingEvent.realmId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: realm } = await (supabase as any)
        .from('life_realms')
        .select('name')
        .eq('id', updates.realmId)
        .eq('user_id', user.id)
        .single()

      if (realm) {
        realmName = realm.name
      }
    }

    // 8. Build updated event
    const newStartTime = updates.startTime || existingEvent.slot.startTime
    const newDuration = updates.durationMinutes || existingEvent.slot.durationMinutes
    const newEndTime = calculateEndTime(newStartTime, newDuration)

    const updatedEvent = {
      ...existingEvent,
      title: updates.title ?? existingEvent.title,
      slot: {
        ...existingEvent.slot,
        dayOfWeek: updates.dayOfWeek ?? existingEvent.slot.dayOfWeek,
        startTime: newStartTime,
        endTime: newEndTime,
        durationMinutes: newDuration,
      },
      ...(updates.realmId !== undefined ? { realmId: updates.realmId, realmName } : {}),
    }

    // 9. Update events array
    const updatedEvents = [...events]
    updatedEvents[eventIndex] = updatedEvent

    // 10. Save updated schedule
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('generated_schedules')
      .update({
        events: updatedEvents,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('week_start', weekStart)

    if (updateError) {
      console.error('Failed to save event:', updateError)
      return NextResponse.json(
        { error: 'Failed to save event' },
        { status: 500 }
      )
    }

    // 11. Return success
    return NextResponse.json({
      success: true,
      event: updatedEvent,
    })

  } catch (error) {
    console.error('Update event error:', error)
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    )
  }
}

// =============================================================================
// DELETE HANDLER
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Parse request body
    const body: DeleteEventRequest = await request.json()
    const { weekStart, eventId } = body

    // 3. Validate required fields
    if (!weekStart || !eventId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 4. Get existing schedule
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: schedule, error: scheduleError } = await (supabase as any)
      .from('generated_schedules')
      .select('events')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .single()

    if (scheduleError) {
      return NextResponse.json(
        { error: 'Schedule not found for this week' },
        { status: 404 }
      )
    }

    // 5. Find the event to delete
    const events = schedule.events || []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventIndex = events.findIndex((e: any) => e.id === eventId)

    if (eventIndex === -1) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    const existingEvent = events[eventIndex]

    // 6. Check if event is locked
    if (existingEvent.isLocked) {
      return NextResponse.json(
        { error: 'Cannot delete locked events' },
        { status: 400 }
      )
    }

    // 7. Remove event from array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedEvents = events.filter((e: any) => e.id !== eventId)

    // 8. Save updated schedule
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('generated_schedules')
      .update({
        events: updatedEvents,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('week_start', weekStart)

    if (updateError) {
      console.error('Failed to delete event:', updateError)
      return NextResponse.json(
        { error: 'Failed to delete event' },
        { status: 500 }
      )
    }

    // 9. Return success
    return NextResponse.json({
      success: true,
      message: 'Event deleted',
    })

  } catch (error) {
    console.error('Delete event error:', error)
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    )
  }
}
