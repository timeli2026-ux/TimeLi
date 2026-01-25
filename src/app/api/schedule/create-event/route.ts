// Create event API endpoint
// POST /api/schedule/create-event

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { minutesToTime } from '@/lib/scheduling/types'

// =============================================================================
// REQUEST TYPES
// =============================================================================

interface CreateEventRequest {
  weekStart: string // YYYY-MM-DD format
  title: string
  eventType: 'goal' | 'simple'
  dayOfWeek: number
  startTime: string // HH:mm format
  durationMinutes: number
  realmId?: string
  isRecurring?: boolean
  recurringDays?: number[] // Additional days to create events on
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Calculate end time from start time and duration
 */
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + durationMinutes
  return minutesToTime(totalMinutes)
}

// =============================================================================
// API HANDLER
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
    const body: CreateEventRequest = await request.json()
    const {
      weekStart,
      title,
      eventType,
      dayOfWeek,
      startTime,
      durationMinutes,
      realmId,
      isRecurring,
      recurringDays,
    } = body

    // 3. Validate required fields
    if (!weekStart || !title || !startTime || durationMinutes === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json(
        { error: 'Invalid day of week' },
        { status: 400 }
      )
    }

    // 4. Get realm name if realmId provided
    let realmName: string | undefined
    if (realmId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: realm } = await (supabase as any)
        .from('life_realms')
        .select('name')
        .eq('id', realmId)
        .eq('user_id', user.id)
        .single()

      if (realm) {
        realmName = realm.name
      }
    }

    // 5. Get existing schedule
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

    // 6. Build list of days to create events on
    const daysToCreate = [dayOfWeek]
    if (isRecurring && recurringDays && recurringDays.length > 0) {
      for (const day of recurringDays) {
        if (!daysToCreate.includes(day)) {
          daysToCreate.push(day)
        }
      }
    }

    // 7. Create events for each day
    const newEvents = daysToCreate.map((day) => {
      const endTime = calculateEndTime(startTime, durationMinutes)

      return {
        id: generateEventId(),
        title,
        type: eventType === 'goal' ? 'goal' : 'simple',
        slot: {
          dayOfWeek: day,
          startTime,
          endTime,
          durationMinutes,
        },
        ...(eventType === 'goal' && realmId ? { realmId, realmName } : {}),
        isLocked: false,
        // For simple events, add flexibility info
        flexibility: eventType === 'simple' ? {
          level: 'high',
          alternativeSlots: 0,
          explanation: 'Manually created event',
        } : undefined,
      }
    })

    // 8. Add new events to existing events
    const existingEvents = schedule.events || []
    const updatedEvents = [...existingEvents, ...newEvents]

    // 9. Save updated schedule
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

    // 10. Return success
    return NextResponse.json({
      success: true,
      events: newEvents,
      message: newEvents.length > 1
        ? `Created ${newEvents.length} events`
        : 'Event created',
    })

  } catch (error) {
    console.error('Create event error:', error)
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    )
  }
}
