import { createClient } from '@/lib/supabase/server'
import { sanitizeUserInput } from '@/lib/sanitize'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// Time format validation (HH:mm)
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
const timeSchema = z.string().regex(timeRegex, 'Invalid time format (HH:mm)')

// Assignment type enum (matches existing validation)
const assignmentTypeEnum = z.enum([
  'homework',
  'exam',
  'project',
  'reading',
  'quiz',
  'paper',
  'other',
])

// Student onboarding request validation schema
const studentOnboardingSchema = z.object({
  // Preferences
  timezone: z.string().min(1).max(100),
  sleepStart: timeSchema,
  sleepEnd: timeSchema,

  // Courses array
  courses: z.array(
    z.object({
      id: z.string().min(1), // local temp ID for mapping
      name: z.string().min(1).max(100),
      semester: z.string().min(1).max(50),
      instructor: z.string().max(100).optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      schedule: z
        .array(
          z.object({
            day: z.number().min(0).max(6),
            start: timeSchema,
            end: timeSchema,
          })
        )
        .min(1),
    })
  ),

  // Assignments array
  assignments: z.array(
    z.object({
      title: z.string().min(1).max(200),
      type: assignmentTypeEnum,
      dueDate: z.string().datetime(),
      estimatedHours: z.number().min(0.5).max(100),
      courseId: z.string().optional(), // maps to local temp ID in courses array
      notes: z.string().max(1000).optional(),
    })
  ),
})

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = studentOnboardingSchema.safeParse(body)

    if (!validationResult.success) {
      console.error('Validation error:', JSON.stringify(validationResult.error.issues, null, 2))
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { timezone, sleepStart, sleepEnd, courses, assignments } = validationResult.data

    // Sanitize string inputs
    const sanitizedTimezone = sanitizeUserInput(timezone, { maxLength: 100 })
    const sanitizedCourses = courses.map((c) => ({
      ...c,
      name: sanitizeUserInput(c.name, { maxLength: 100 }),
      semester: sanitizeUserInput(c.semester, { maxLength: 50 }),
      instructor: c.instructor ? sanitizeUserInput(c.instructor, { maxLength: 100 }) : undefined,
    }))
    const sanitizedAssignments = assignments.map((a) => ({
      ...a,
      title: sanitizeUserInput(a.title, { maxLength: 200 }),
      notes: a.notes ? sanitizeUserInput(a.notes, { maxLength: 1000 }) : undefined,
    }))

    // 1. Upsert user preferences with timezone and sleep times
    const { error: preferencesError } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: user.id,
          timezone: sanitizedTimezone,
          sleep_start: sleepStart,
          sleep_end: sleepEnd,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (preferencesError) {
      console.error('Error saving preferences:', preferencesError)
      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
    }

    // 2. Insert courses and capture mapping of local IDs to DB IDs
    // Using (supabase as any) until types are regenerated for courses/assignments tables
    const localIdToDbId: Record<string, string> = {}

    if (sanitizedCourses.length > 0) {
      const coursesToInsert = sanitizedCourses.map((c) => ({
        user_id: user.id,
        name: c.name,
        semester: c.semester,
        instructor: c.instructor || null,
        color: c.color,
        schedule: c.schedule, // JSONB column
        is_active: true,
      }))

      const { data: insertedCourses, error: coursesError } = await (supabase as any)
        .from('courses')
        .insert(coursesToInsert)
        .select('id')

      if (coursesError) {
        console.error('Error inserting courses:', coursesError)
        return NextResponse.json({ error: 'Failed to save courses' }, { status: 500 })
      }

      // Map local IDs to database IDs (courses are inserted in order)
      if (insertedCourses) {
        sanitizedCourses.forEach((course, index) => {
          if (insertedCourses[index]) {
            localIdToDbId[course.id] = insertedCourses[index].id
          }
        })
      }
    }

    // 3. Insert assignments with mapped course_id (nullable if no course)
    if (sanitizedAssignments.length > 0) {
      const assignmentsToInsert = sanitizedAssignments.map((a) => ({
        user_id: user.id,
        title: a.title,
        type: a.type,
        due_date: a.dueDate,
        estimated_hours: a.estimatedHours,
        course_id: a.courseId ? localIdToDbId[a.courseId] || null : null,
        notes: a.notes || null,
        status: 'pending',
        priority: 'medium',
      }))

      const { error: assignmentsError } = await (supabase as any)
        .from('assignments')
        .insert(assignmentsToInsert)

      if (assignmentsError) {
        console.error('Error inserting assignments:', assignmentsError)
        return NextResponse.json({ error: 'Failed to save assignments' }, { status: 500 })
      }
    }

    // 4. Update profiles.onboarding_completed = true
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email ?? '',
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

    if (profileError) {
      console.error('Error updating profile:', profileError)
      return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      coursesCreated: courses.length,
      assignmentsCreated: assignments.length,
    })
  } catch (error) {
    console.error('Student onboarding completion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
