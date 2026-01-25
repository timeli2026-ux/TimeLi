import { createClient } from '@/lib/supabase/server'
import { sanitizeUserInput } from '@/lib/sanitize'
import { assignmentUpdateSchema } from '@/lib/validations/assignments'
import { NextRequest, NextResponse } from 'next/server'

// =============================================================================
// GET /api/assignments/[id] - Get single assignment by ID
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

    // Query single assignment with course info (left join since course_id is nullable)
    const { data: assignment, error: assignmentError } = await (supabase as any)
      .from('assignments')
      .select(`
        id,
        user_id,
        course_id,
        title,
        type,
        due_date,
        estimated_hours,
        priority,
        notes,
        status,
        completed_at,
        created_at,
        updated_at,
        courses (
          name
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (assignmentError) {
      if (assignmentError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Assignment not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching assignment:', assignmentError)
      return NextResponse.json(
        { error: 'Failed to fetch assignment' },
        { status: 500 }
      )
    }

    // Transform response
    const a = assignment as Record<string, unknown>
    const transformedAssignment = {
      id: a.id,
      userId: a.user_id,
      courseId: a.course_id,
      title: a.title,
      type: a.type,
      dueDate: a.due_date,
      estimatedHours: a.estimated_hours,
      priority: a.priority,
      notes: a.notes,
      status: a.status,
      completedAt: a.completed_at,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
      courseName: (a.courses as { name: string } | null)?.name,
    }

    return NextResponse.json({ assignment: transformedAssignment })
  } catch (error) {
    console.error('Assignment GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// PUT /api/assignments/[id] - Update assignment
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
    const validationResult = assignmentUpdateSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // First, fetch current assignment to check status transitions
    const { data: currentAssignment, error: fetchError } = await (supabase as any)
      .from('assignments')
      .select('status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Assignment not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching assignment:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch assignment' },
        { status: 500 }
      )
    }

    // Build update object, only including provided fields
    const updateData: Record<string, unknown> = {}

    if (data.title !== undefined) {
      updateData.title = sanitizeUserInput(data.title, { maxLength: 200 })
    }
    if (data.courseId !== undefined) {
      updateData.course_id = data.courseId
    }
    if (data.type !== undefined) {
      updateData.type = data.type
    }
    if (data.dueDate !== undefined) {
      updateData.due_date = data.dueDate
    }
    if (data.estimatedHours !== undefined) {
      updateData.estimated_hours = data.estimatedHours
    }
    if (data.priority !== undefined) {
      updateData.priority = data.priority
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes
        ? sanitizeUserInput(data.notes, { maxLength: 1000 })
        : null
    }
    if (data.status !== undefined) {
      updateData.status = data.status

      // Handle completed_at based on status transitions
      const oldStatus = currentAssignment.status
      const newStatus = data.status

      if (newStatus === 'completed' && oldStatus !== 'completed') {
        // Transitioning TO completed: set completed_at to now
        updateData.completed_at = new Date().toISOString()
      } else if (newStatus !== 'completed' && oldStatus === 'completed') {
        // Transitioning FROM completed: clear completed_at
        updateData.completed_at = null
      }
    }

    // Update assignment where id matches and user_id matches
    const { data: updatedAssignment, error: updateError } = await (supabase as any)
      .from('assignments')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`
        id,
        user_id,
        course_id,
        title,
        type,
        due_date,
        estimated_hours,
        priority,
        notes,
        status,
        completed_at,
        created_at,
        updated_at,
        courses (
          name
        )
      `)
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Assignment not found' },
          { status: 404 }
        )
      }
      console.error('Error updating assignment:', updateError)
      return NextResponse.json(
        { error: 'Failed to update assignment' },
        { status: 500 }
      )
    }

    // Transform response
    const a = updatedAssignment as Record<string, unknown>
    const transformedAssignment = {
      id: a.id,
      userId: a.user_id,
      courseId: a.course_id,
      title: a.title,
      type: a.type,
      dueDate: a.due_date,
      estimatedHours: a.estimated_hours,
      priority: a.priority,
      notes: a.notes,
      status: a.status,
      completedAt: a.completed_at,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
      courseName: (a.courses as { name: string } | null)?.name,
    }

    return NextResponse.json({ assignment: transformedAssignment })
  } catch (error) {
    console.error('Assignment PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// DELETE /api/assignments/[id] - Delete assignment
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

    // Delete from assignments where id matches and user_id matches
    const { error: deleteError, count } = await (supabase as any)
      .from('assignments')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting assignment:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete assignment' },
        { status: 500 }
      )
    }

    if (count === 0) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Assignment DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
