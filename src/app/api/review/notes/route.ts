// Weekly review notes API endpoint
// Phase 10: Hardening & Launch - Plan 02
// POST /api/review/notes - Save weekly notes

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// TYPES
// =============================================================================

interface SaveNotesRequest {
  weekStart: string
  notes: string
}

interface SaveNotesResponse {
  success: boolean
  error?: string
}

// =============================================================================
// API HANDLER
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<SaveNotesResponse>> {
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
    let body: SaveNotesRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { weekStart, notes } = body

    // 3. Validate required fields
    if (!weekStart) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: weekStart' },
        { status: 400 }
      )
    }

    // 4. Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(weekStart)) {
      return NextResponse.json(
        { success: false, error: 'Invalid weekStart format. Expected: YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // 5. Upsert notes into generated_schedules
    // First check if schedule exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingSchedule } = await (supabase as any)
      .from('generated_schedules')
      .select('id')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .single() as { data: { id: string } | null }

    if (existingSchedule) {
      // Update existing schedule
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('generated_schedules')
        .update({ review_notes: notes })
        .eq('id', existingSchedule.id)

      if (updateError) {
        console.error('Failed to update notes:', updateError)
        return NextResponse.json(
          { success: false, error: 'Failed to save notes' },
          { status: 500 }
        )
      }
    } else {
      // Create new schedule entry with notes (no events)
      // This allows users to add notes even for weeks without generated schedules
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase as any)
        .from('generated_schedules')
        .insert({
          user_id: user.id,
          week_start: weekStart,
          events: [],
          review_notes: notes
        })

      if (insertError) {
        console.error('Failed to insert notes:', insertError)
        return NextResponse.json(
          { success: false, error: 'Failed to save notes' },
          { status: 500 }
        )
      }
    }

    console.log(`[Review Notes] User ${user.id} saved notes for week ${weekStart}`)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Review notes API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save notes' },
      { status: 500 }
    )
  }
}
