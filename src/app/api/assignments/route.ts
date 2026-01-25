import { createClient } from '@/lib/supabase/server'
import { sanitizeUserInput } from '@/lib/sanitize'
import { assignmentFormSchema } from '@/lib/validations/assignments'
import { NextRequest, NextResponse } from 'next/server'

// =============================================================================
// GET /api/assignments - List all assignments for authenticated user
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query params for filtering
    const searchParams = request.nextUrl.searchParams
    const courseIdFilter = searchParams.get('courseId')
    const statusFilter = searchParams.get('status')

    // Build query with optional course join for courseName
    let query = (supabase as any)
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
      .eq('user_id', user.id)
      .order('due_date', { ascending: true })

    // Apply optional filters
    if (courseIdFilter) {
      query = query.eq('course_id', courseIdFilter)
    }
    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: assignments, error: assignmentsError } = await query

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError)
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: 500 }
      )
    }

    // Transform response to match AssignmentResponse type (snake_case to camelCase)
    const transformedAssignments = (assignments || []).map((assignment: Record<string, unknown>) => ({
      id: assignment.id,
      userId: assignment.user_id,
      courseId: assignment.course_id,
      title: assignment.title,
      type: assignment.type,
      dueDate: assignment.due_date,
      estimatedHours: assignment.estimated_hours,
      priority: assignment.priority,
      notes: assignment.notes,
      status: assignment.status,
      completedAt: assignment.completed_at,
      createdAt: assignment.created_at,
      updatedAt: assignment.updated_at,
      courseName: (assignment.courses as { name: string } | null)?.name,
    }))

    return NextResponse.json({ assignments: transformedAssignments })
  } catch (error) {
    console.error('Assignments GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST /api/assignments - Create new assignment
// =============================================================================

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = assignmentFormSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Sanitize title and notes
    const sanitizedTitle = sanitizeUserInput(data.title, { maxLength: 200 })
    const sanitizedNotes = data.notes
      ? sanitizeUserInput(data.notes, { maxLength: 1000 })
      : null

    // Insert into assignments
    const { data: newAssignment, error: insertError } = await (supabase as any)
      .from('assignments')
      .insert({
        user_id: user.id,
        course_id: data.courseId ?? null,
        title: sanitizedTitle,
        type: data.type,
        due_date: data.dueDate,
        estimated_hours: data.estimatedHours,
        priority: data.priority ?? 'medium',
        notes: sanitizedNotes,
        status: data.status ?? 'pending',
      })
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

    if (insertError) {
      console.error('Error creating assignment:', insertError)
      return NextResponse.json(
        { error: 'Failed to create assignment' },
        { status: 500 }
      )
    }

    // Transform response
    const a = newAssignment as Record<string, unknown>
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

    return NextResponse.json({ assignment: transformedAssignment }, { status: 201 })
  } catch (error) {
    console.error('Assignments POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
