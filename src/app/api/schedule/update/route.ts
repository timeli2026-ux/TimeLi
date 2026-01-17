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

    const { eventId, newSlot } = body

    // 3. Validate required fields
    if (!eventId || !newSlot) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: eventId and newSlot' },
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

    // 5. For now, we're managing schedule in client-side state
    // Database persistence will be added in a future phase
    // This endpoint validates the request and returns success
    // In production, we would:
    // - Check if user owns the event
    // - Verify no conflicts with locked events
    // - Update the database

    console.log(`[Schedule Update] User ${user.id} moving event ${eventId} to:`, newSlot)

    // 6. Return success with updated event
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
