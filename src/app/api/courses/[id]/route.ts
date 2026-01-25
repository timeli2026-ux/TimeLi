import { createClient } from '@/lib/supabase/server'
import { sanitizeUserInput } from '@/lib/sanitize'
import { courseUpdateSchema } from '@/lib/validations/courses'
import { NextRequest, NextResponse } from 'next/server'

// =============================================================================
// GET /api/courses/[id] - Get single course by ID
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

    // Query single course (RLS ensures user can only access their own)
    const { data: course, error: courseError } = await (supabase as any)
      .from('courses')
      .select(`
        id,
        user_id,
        name,
        instructor,
        color,
        schedule,
        location,
        credits,
        semester,
        is_active,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (courseError) {
      if (courseError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Course not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching course:', courseError)
      return NextResponse.json(
        { error: 'Failed to fetch course' },
        { status: 500 }
      )
    }

    // Transform response
    const c = course as Record<string, unknown>
    const transformedCourse = {
      id: c.id,
      userId: c.user_id,
      name: c.name,
      instructor: c.instructor,
      color: c.color,
      schedule: c.schedule,
      location: c.location,
      credits: c.credits,
      semester: c.semester,
      isActive: c.is_active,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }

    return NextResponse.json({ course: transformedCourse })
  } catch (error) {
    console.error('Course GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// PUT /api/courses/[id] - Update course
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
    const validationResult = courseUpdateSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Build update object, only including provided fields
    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) {
      updateData.name = sanitizeUserInput(data.name, { maxLength: 100 })
    }
    if (data.instructor !== undefined) {
      updateData.instructor = data.instructor
        ? sanitizeUserInput(data.instructor, { maxLength: 100 })
        : null
    }
    if (data.color !== undefined) {
      updateData.color = data.color
    }
    if (data.schedule !== undefined) {
      updateData.schedule = data.schedule
    }
    if (data.location !== undefined) {
      updateData.location = data.location
        ? sanitizeUserInput(data.location, { maxLength: 100 })
        : null
    }
    if (data.credits !== undefined) {
      updateData.credits = data.credits
    }
    if (data.semester !== undefined) {
      updateData.semester = data.semester
    }
    if (data.isActive !== undefined) {
      updateData.is_active = data.isActive
    }

    // Update course where id matches and user_id matches (RLS also enforces)
    const { data: updatedCourse, error: updateError } = await (supabase as any)
      .from('courses')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`
        id,
        user_id,
        name,
        instructor,
        color,
        schedule,
        location,
        credits,
        semester,
        is_active,
        created_at,
        updated_at
      `)
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Course not found' },
          { status: 404 }
        )
      }
      console.error('Error updating course:', updateError)
      return NextResponse.json(
        { error: 'Failed to update course' },
        { status: 500 }
      )
    }

    // Transform response
    const c = updatedCourse as Record<string, unknown>
    const transformedCourse = {
      id: c.id,
      userId: c.user_id,
      name: c.name,
      instructor: c.instructor,
      color: c.color,
      schedule: c.schedule,
      location: c.location,
      credits: c.credits,
      semester: c.semester,
      isActive: c.is_active,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }

    return NextResponse.json({ course: transformedCourse })
  } catch (error) {
    console.error('Course PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// DELETE /api/courses/[id] - Delete course
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

    // Delete from courses where id matches and user_id matches (RLS also enforces)
    const { error: deleteError, count } = await (supabase as any)
      .from('courses')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting course:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete course' },
        { status: 500 }
      )
    }

    if (count === 0) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Course DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
