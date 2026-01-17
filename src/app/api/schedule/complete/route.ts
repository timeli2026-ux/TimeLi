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

    const { eventId, status, notes } = body

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

    // 5. For now, log to console. Database persistence will be added in a future phase.
    // In production, we would:
    // - Create a schedule_completions table
    // - Store eventId, userId, status, notes, completedAt
    // - Potentially update goal progress metrics

    console.log(`[Schedule Complete] User ${user.id} marked event ${eventId} as ${status}`)
    if (notes) {
      console.log(`[Schedule Complete] Notes: ${notes}`)
    }

    // 6. Return success
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Schedule completion error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to log completion' },
      { status: 500 }
    )
  }
}
