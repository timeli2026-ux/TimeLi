import { createClient } from '@/lib/supabase/server'
import { sanitizeUserInput } from '@/lib/sanitize'
import { goalUpdateSchema } from '@/lib/validations/goals'
import { NextRequest, NextResponse } from 'next/server'

// =============================================================================
// GET /api/goals/[id] - Get single goal by ID
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Query single goal with realm info
    const { data: goal, error: goalError } = await (supabase as any)
      .from('user_goals')
      .select(`
        id,
        user_id,
        realm_id,
        title,
        hours_per_week,
        is_active,
        cognitive_load,
        requires_deep_work,
        deadline,
        deadline_type,
        minimum_session_minutes,
        preferred_session_minutes,
        intensity_level,
        created_at,
        updated_at,
        life_realms!inner (
          name
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (goalError) {
      if (goalError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Goal not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching goal:', goalError)
      return NextResponse.json(
        { error: 'Failed to fetch goal' },
        { status: 500 }
      )
    }

    // Transform response
    const g = goal as Record<string, unknown>
    const transformedGoal = {
      id: g.id,
      userId: g.user_id,
      realmId: g.realm_id,
      title: g.title,
      hoursPerWeek: g.hours_per_week,
      isActive: g.is_active,
      cognitiveLoad: g.cognitive_load,
      requiresDeepWork: g.requires_deep_work,
      deadline: g.deadline,
      deadlineType: g.deadline_type,
      minimumSessionMinutes: g.minimum_session_minutes,
      preferredSessionMinutes: g.preferred_session_minutes,
      intensityLevel: g.intensity_level,
      createdAt: g.created_at,
      updatedAt: g.updated_at,
      realmName: (g.life_realms as { name: string } | null)?.name,
    }

    return NextResponse.json({ goal: transformedGoal })
  } catch (error) {
    console.error('Goal GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// PUT /api/goals/[id] - Update goal
// =============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request body (partial update)
    const body = await request.json()
    const validationResult = goalUpdateSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Build update object, only including provided fields
    const updateData: Record<string, unknown> = {}

    if (data.title !== undefined) {
      updateData.title = sanitizeUserInput(data.title, { maxLength: 100 })
    }
    if (data.realmId !== undefined) {
      updateData.realm_id = data.realmId
    }
    if (data.hoursPerWeek !== undefined) {
      updateData.hours_per_week = data.hoursPerWeek
    }
    if (data.isActive !== undefined) {
      updateData.is_active = data.isActive
    }
    if (data.cognitiveLoad !== undefined) {
      updateData.cognitive_load = data.cognitiveLoad
    }
    if (data.requiresDeepWork !== undefined) {
      updateData.requires_deep_work = data.requiresDeepWork
    }
    if (data.deadline !== undefined) {
      updateData.deadline = data.deadline
    }
    if (data.deadlineType !== undefined) {
      updateData.deadline_type = data.deadlineType
    }
    if (data.minimumSessionMinutes !== undefined) {
      updateData.minimum_session_minutes = data.minimumSessionMinutes
    }
    if (data.preferredSessionMinutes !== undefined) {
      updateData.preferred_session_minutes = data.preferredSessionMinutes
    }
    if (data.intensityLevel !== undefined) {
      updateData.intensity_level = data.intensityLevel
    }

    // Update user_goals where id matches and user_id matches
    const { data: updatedGoal, error: updateError } = await (supabase as any)
      .from('user_goals')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`
        id,
        user_id,
        realm_id,
        title,
        hours_per_week,
        is_active,
        cognitive_load,
        requires_deep_work,
        deadline,
        deadline_type,
        minimum_session_minutes,
        preferred_session_minutes,
        intensity_level,
        created_at,
        updated_at,
        life_realms!inner (
          name
        )
      `)
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Goal not found' },
          { status: 404 }
        )
      }
      console.error('Error updating goal:', updateError)
      return NextResponse.json(
        { error: 'Failed to update goal' },
        { status: 500 }
      )
    }

    // Transform response
    const g = updatedGoal as Record<string, unknown>
    const transformedGoal = {
      id: g.id,
      userId: g.user_id,
      realmId: g.realm_id,
      title: g.title,
      hoursPerWeek: g.hours_per_week,
      isActive: g.is_active,
      cognitiveLoad: g.cognitive_load,
      requiresDeepWork: g.requires_deep_work,
      deadline: g.deadline,
      deadlineType: g.deadline_type,
      minimumSessionMinutes: g.minimum_session_minutes,
      preferredSessionMinutes: g.preferred_session_minutes,
      intensityLevel: g.intensity_level,
      createdAt: g.created_at,
      updatedAt: g.updated_at,
      realmName: (g.life_realms as { name: string } | null)?.name,
    }

    return NextResponse.json({ goal: transformedGoal })
  } catch (error) {
    console.error('Goal PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// DELETE /api/goals/[id] - Delete goal
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Delete from user_goals where id matches and user_id matches
    const { error: deleteError, count } = await (supabase as any)
      .from('user_goals')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting goal:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete goal' },
        { status: 500 }
      )
    }

    if (count === 0) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Goal DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
