// Schedule CRUD by week
// Phase 6: Calendar UI - Plan 04
// GET /api/schedule/[weekStart] - Load saved schedule
// PATCH /api/schedule/[weekStart] - Update single event

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ScheduleEventWithFlexibility } from '@/lib/scheduling/types'

// Type for schedule row (until Supabase types are regenerated after migration)
interface ScheduleRow {
  id: string
  user_id: string
  week_start: string
  events: unknown
  stats: unknown
  unscheduled_goals: unknown
  generated_at: string
  updated_at: string
}

// =============================================================================
// TYPES
// =============================================================================

interface RouteParams {
  params: Promise<{ weekStart: string }>
}

interface UpdateEventRequest {
  eventId: string
  updates: Partial<{
    slot: {
      dayOfWeek: number
      startTime: string
      endTime: string
      durationMinutes: number
    }
    title: string
  }>
}

// =============================================================================
// GET - Load saved schedule for a week
// =============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { weekStart } = await params

    // Validate weekStart format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return NextResponse.json(
        { error: 'Invalid weekStart format. Use YYYY-MM-DD.' },
        { status: 400 }
      )
    }

    // Authenticate
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Load schedule from database
    // Note: Table types will be available after running migration and regenerating Supabase types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: scheduleData, error: dbError } = await (supabase as any)
      .from('generated_schedules')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .single() as { data: ScheduleRow | null; error: { code?: string; message?: string } | null }

    if (dbError && dbError.code !== 'PGRST116') {
      // PGRST116 = not found, which is OK
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to load schedule' },
        { status: 500 }
      )
    }

    if (!scheduleData) {
      // No saved schedule for this week
      return NextResponse.json({
        exists: false,
        schedule: null,
        message: 'No schedule found for this week. Generate one first.',
      })
    }

    // Return the saved schedule
    return NextResponse.json({
      exists: true,
      schedule: {
        id: scheduleData.id,
        weekStart: scheduleData.week_start,
        events: scheduleData.events as ScheduleEventWithFlexibility[],
        stats: scheduleData.stats,
        unscheduledGoals: scheduleData.unscheduled_goals,
        generatedAt: scheduleData.generated_at,
        updatedAt: scheduleData.updated_at,
      },
    })
  } catch (error) {
    console.error('Schedule load error:', error)
    return NextResponse.json(
      { error: 'Failed to load schedule' },
      { status: 500 }
    )
  }
}

// =============================================================================
// PATCH - Update a single event in the schedule
// =============================================================================

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { weekStart } = await params

    // Validate weekStart format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return NextResponse.json(
        { error: 'Invalid weekStart format. Use YYYY-MM-DD.' },
        { status: 400 }
      )
    }

    // Authenticate
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body: UpdateEventRequest = await request.json()
    const { eventId, updates } = body

    if (!eventId || !updates) {
      return NextResponse.json(
        { error: 'eventId and updates are required' },
        { status: 400 }
      )
    }

    // Load current schedule
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: scheduleData, error: loadError } = await (supabase as any)
      .from('generated_schedules')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .single() as { data: ScheduleRow | null; error: unknown }

    if (loadError || !scheduleData) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      )
    }

    // Find and update the event
    const events = scheduleData.events as ScheduleEventWithFlexibility[]
    const eventIndex = events.findIndex(e => e.id === eventId)

    if (eventIndex === -1) {
      return NextResponse.json(
        { error: 'Event not found in schedule' },
        { status: 404 }
      )
    }

    const event = events[eventIndex]

    // Don't allow updating locked events
    if (event.isLocked) {
      return NextResponse.json(
        { error: 'Cannot update locked events' },
        { status: 400 }
      )
    }

    // Apply updates
    if (updates.slot) {
      event.slot = updates.slot
    }
    if (updates.title) {
      event.title = updates.title
    }

    events[eventIndex] = event

    // Save updated schedule
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: saveError } = await (supabase as any)
      .from('generated_schedules')
      .update({
        events,
        updated_at: new Date().toISOString(),
      })
      .eq('id', scheduleData.id)

    if (saveError) {
      console.error('Save error:', saveError)
      return NextResponse.json(
        { error: 'Failed to save schedule' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      updatedEvent: event,
    })
  } catch (error) {
    console.error('Schedule update error:', error)
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    )
  }
}
