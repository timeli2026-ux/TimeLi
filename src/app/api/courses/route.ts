import { createClient } from '@/lib/supabase/server'
import { sanitizeUserInput } from '@/lib/sanitize'
import { courseFormSchema } from '@/lib/validations/courses'
import { NextResponse } from 'next/server'

// =============================================================================
// GET /api/courses - List all courses for authenticated user
// =============================================================================

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Query courses for user
    // Using (supabase as any) until types are regenerated
    const { data: courses, error: coursesError } = await (supabase as any)
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
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (coursesError) {
      console.error('Error fetching courses:', coursesError)
      return NextResponse.json(
        { error: 'Failed to fetch courses' },
        { status: 500 }
      )
    }

    // Transform response to match CourseResponse type (snake_case to camelCase)
    const transformedCourses = (courses || []).map((course: Record<string, unknown>) => ({
      id: course.id,
      userId: course.user_id,
      name: course.name,
      instructor: course.instructor,
      color: course.color,
      schedule: course.schedule,
      location: course.location,
      credits: course.credits,
      semester: course.semester,
      isActive: course.is_active,
      createdAt: course.created_at,
      updatedAt: course.updated_at,
    }))

    return NextResponse.json({ courses: transformedCourses })
  } catch (error) {
    console.error('Courses GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST /api/courses - Create new course
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
    const validationResult = courseFormSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Sanitize text fields
    const sanitizedName = sanitizeUserInput(data.name, { maxLength: 100 })
    const sanitizedInstructor = data.instructor
      ? sanitizeUserInput(data.instructor, { maxLength: 100 })
      : null
    const sanitizedLocation = data.location
      ? sanitizeUserInput(data.location, { maxLength: 100 })
      : null

    // Insert into courses
    const { data: newCourse, error: insertError } = await (supabase as any)
      .from('courses')
      .insert({
        user_id: user.id,
        name: sanitizedName,
        instructor: sanitizedInstructor,
        color: data.color ?? '#3B82F6',
        schedule: data.schedule,
        location: sanitizedLocation,
        credits: data.credits ?? null,
        semester: data.semester,
        is_active: data.isActive ?? true,
      })
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

    if (insertError) {
      console.error('Error creating course:', insertError)
      return NextResponse.json(
        { error: 'Failed to create course' },
        { status: 500 }
      )
    }

    // Transform response
    const course = newCourse as Record<string, unknown>
    const transformedCourse = {
      id: course.id,
      userId: course.user_id,
      name: course.name,
      instructor: course.instructor,
      color: course.color,
      schedule: course.schedule,
      location: course.location,
      credits: course.credits,
      semester: course.semester,
      isActive: course.is_active,
      createdAt: course.created_at,
      updatedAt: course.updated_at,
    }

    return NextResponse.json({ course: transformedCourse }, { status: 201 })
  } catch (error) {
    console.error('Courses POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
