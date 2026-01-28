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

// Personal goal category enum
const goalCategoryEnum = z.enum(['health', 'growth', 'social', 'wellness', 'other'])

// Category info for creating realms
const GOAL_CATEGORY_INFO: Record<string, { name: string; icon: string }> = {
  health: { name: 'Health & Fitness', icon: '🏃' },
  growth: { name: 'Personal Growth', icon: '📖' },
  social: { name: 'Social & Fun', icon: '🎉' },
  wellness: { name: 'Wellness', icon: '🧘' },
  other: { name: 'Personal', icon: '⭐' },
}

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
      dueDate: z.string().min(1), // Accept YYYY-MM-DD or ISO datetime
      estimatedHours: z.number().min(0.5).max(100),
      courseId: z.string().optional(), // maps to local temp ID in courses array
      notes: z.string().max(1000).optional(),
    })
  ),

  // Personal goals array (optional)
  personalGoals: z.array(
    z.object({
      title: z.string().min(1).max(100),
      category: goalCategoryEnum,
      timesPerWeek: z.number().min(1).max(7),
      minutesPerSession: z.number().min(15).max(180),
    })
  ).optional().default([]),
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
    console.log('[StudentOnboarding] Request body:', JSON.stringify(body, null, 2))
    const validationResult = studentOnboardingSchema.safeParse(body)

    if (!validationResult.success) {
      console.error('[StudentOnboarding] Validation error:', JSON.stringify(validationResult.error.issues, null, 2))
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { timezone, sleepStart, sleepEnd, courses, assignments, personalGoals } = validationResult.data

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
    const sanitizedPersonalGoals = personalGoals.map((g) => ({
      ...g,
      title: sanitizeUserInput(g.title, { maxLength: 100 }),
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

    // 2. Clear ALL existing data for clean re-onboarding
    // Order matters due to foreign key constraints
    // schedule_completions → generated_schedules, user_goals
    // schedule_feedback → user_goals
    // user_goals → life_realms, fixed_commitments
    // assignments → courses
    await (supabase as any).from('schedule_completions').delete().eq('user_id', user.id)
    await (supabase as any).from('schedule_feedback').delete().eq('user_id', user.id)
    await (supabase as any).from('generated_schedules').delete().eq('user_id', user.id)
    await (supabase as any).from('user_goals').delete().eq('user_id', user.id)
    await (supabase as any).from('life_realms').delete().eq('user_id', user.id)
    await (supabase as any).from('fixed_commitments').delete().eq('user_id', user.id)
    await (supabase as any).from('assignments').delete().eq('user_id', user.id)
    await (supabase as any).from('courses').delete().eq('user_id', user.id)

    // Clear old v1 initial_actions to prevent auto-migration of stale data
    await (supabase as any)
      .from('user_preferences')
      .update({ initial_actions: null, life_realms: null })
      .eq('user_id', user.id)

    // 3. Create "Academics" realm for student goals
    const { data: academicsRealm, error: realmError } = await (supabase as any)
      .from('life_realms')
      .insert({
        user_id: user.id,
        name: 'Academics',
        icon: '📚',
        is_custom: false,
        display_order: 0,
      })
      .select('id')
      .single()

    if (realmError || !academicsRealm) {
      console.error('Error creating Academics realm:', realmError)
      return NextResponse.json({ error: 'Failed to create realm' }, { status: 500 })
    }

    const academicsRealmId = academicsRealm.id

    // 4. Insert courses and capture mapping of local IDs to DB IDs
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

    // 5. Insert assignments with mapped course_id (nullable if no course)
    if (sanitizedAssignments.length > 0) {
      const assignmentsToInsert = sanitizedAssignments.map((a) => {
        // Convert YYYY-MM-DD to ISO datetime if needed
        let dueDate = a.dueDate
        if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
          dueDate = `${dueDate}T23:59:59.000Z` // Default to end of day
        }
        return {
          user_id: user.id,
          title: a.title,
          type: a.type,
          due_date: dueDate,
          estimated_hours: a.estimatedHours,
          course_id: a.courseId ? localIdToDbId[a.courseId] || null : null,
          notes: a.notes || null,
          status: 'pending',
          priority: 'medium',
        }
      })

      const { error: assignmentsError } = await (supabase as any)
        .from('assignments')
        .insert(assignmentsToInsert)

      if (assignmentsError) {
        console.error('Error inserting assignments:', assignmentsError)
        return NextResponse.json({ error: 'Failed to save assignments' }, { status: 500 })
      }
    }

    // 6. Convert courses → fixed_commitments (class times block off the schedule)
    const commitmentRows: Record<string, unknown>[] = []
    for (const course of sanitizedCourses) {
      for (const meeting of course.schedule) {
        commitmentRows.push({
          user_id: user.id,
          title: course.name,
          day_of_week: meeting.day,
          start_time: meeting.start,
          end_time: meeting.end,
          is_recurring: true,
        })
      }
    }

    if (commitmentRows.length > 0) {
      const { error: commitError } = await (supabase as any)
        .from('fixed_commitments')
        .insert(commitmentRows)

      if (commitError) {
        console.error('Error inserting fixed commitments:', commitError)
        // Non-fatal: schedule will still generate, just without class blocks
      }
    }

    // 7. Convert assignments → user_goals with realistic scheduling
    // Caps: 6 hours/week per assignment, 25 hours/week total study budget
    // Prioritize by urgency (closer deadline = higher weight)
    if (sanitizedAssignments.length > 0) {
      const now = new Date()
      const MAX_HOURS_PER_ASSIGNMENT = 6
      const MAX_TOTAL_STUDY_HOURS = 25

      // First pass: calculate raw hours and urgency for each assignment
      const assignmentData = sanitizedAssignments.map((a) => {
        const dueDate = new Date(
          /^\d{4}-\d{2}-\d{2}$/.test(a.dueDate) ? `${a.dueDate}T23:59:59.000Z` : a.dueDate
        )
        const msUntilDue = dueDate.getTime() - now.getTime()
        const weeksUntilDue = Math.max(1, Math.ceil(msUntilDue / (7 * 24 * 60 * 60 * 1000)))
        // Raw hours capped at per-assignment max
        const rawHoursPerWeek = Math.min(MAX_HOURS_PER_ASSIGNMENT, a.estimatedHours / weeksUntilDue)
        // Urgency weight: closer deadline = higher priority
        const urgencyWeight = 1 / weeksUntilDue

        return { assignment: a, dueDate, weeksUntilDue, rawHoursPerWeek, urgencyWeight }
      })

      // Calculate total requested hours
      const totalRawHours = assignmentData.reduce((sum, d) => sum + d.rawHoursPerWeek, 0)
      const totalUrgencyWeight = assignmentData.reduce((sum, d) => sum + d.urgencyWeight, 0)

      // Scale proportionally if over budget, weighted by urgency
      const needsScaling = totalRawHours > MAX_TOTAL_STUDY_HOURS

      const goalsToInsert = assignmentData.map(({ assignment: a, dueDate, rawHoursPerWeek, urgencyWeight }) => {
        let hoursPerWeek: number
        if (needsScaling) {
          // Distribute budget weighted by urgency
          const urgencyShare = urgencyWeight / totalUrgencyWeight
          hoursPerWeek = Math.min(MAX_HOURS_PER_ASSIGNMENT, MAX_TOTAL_STUDY_HOURS * urgencyShare)
        } else {
          hoursPerWeek = rawHoursPerWeek
        }
        // Ensure within bounds: 0.5 to 6 hours
        hoursPerWeek = Math.max(0.5, Math.min(MAX_HOURS_PER_ASSIGNMENT, +hoursPerWeek.toFixed(1)))

        // Map assignment type to cognitive load and deep work flag
        const isHighCognitive = ['exam', 'paper', 'project'].includes(a.type)
        const cognitiveLoad = isHighCognitive ? 'high' : a.type === 'reading' ? 'low' : 'medium'
        const requiresDeepWork = isHighCognitive
        const deadlineType = ['exam', 'quiz'].includes(a.type) ? 'hard' : 'soft'

        return {
          user_id: user.id,
          realm_id: academicsRealmId,
          title: a.title,
          hours_per_week: hoursPerWeek,
          is_active: true,
          cognitive_load: cognitiveLoad,
          requires_deep_work: requiresDeepWork,
          deadline: dueDate.toISOString().split('T')[0],
          deadline_type: deadlineType,
          minimum_session_minutes: 30,
          preferred_session_minutes: 60,
          intensity_level: isHighCognitive ? 4 : 3,
        }
      })

      const { error: goalsError } = await (supabase as any)
        .from('user_goals')
        .insert(goalsToInsert)

      if (goalsError) {
        console.error('Error inserting user goals:', goalsError)
        // Non-fatal: assignments are saved, goals can be created manually
      }
    }

    // 8. Create realms and user_goals for personal goals
    let personalGoalsCreated = 0
    if (sanitizedPersonalGoals.length > 0) {
      // Group personal goals by category
      const goalsByCategory = new Map<string, typeof sanitizedPersonalGoals>()
      for (const goal of sanitizedPersonalGoals) {
        const existing = goalsByCategory.get(goal.category) || []
        existing.push(goal)
        goalsByCategory.set(goal.category, existing)
      }

      // Create realms for each category and insert goals
      for (const [category, goals] of goalsByCategory) {
        const categoryInfo = GOAL_CATEGORY_INFO[category] || GOAL_CATEGORY_INFO.other

        // Create realm for this category
        const { data: realm, error: realmError } = await (supabase as any)
          .from('life_realms')
          .insert({
            user_id: user.id,
            name: categoryInfo.name,
            icon: categoryInfo.icon,
            is_custom: false,
            display_order: category === 'health' ? 1 : category === 'growth' ? 2 : category === 'social' ? 3 : 4,
          })
          .select('id')
          .single()

        if (realmError || !realm) {
          console.error(`Error creating realm for ${category}:`, realmError)
          continue
        }

        // Insert goals for this category
        const personalGoalsToInsert = goals.map((g) => ({
          user_id: user.id,
          realm_id: realm.id,
          title: g.title,
          hours_per_week: +((g.timesPerWeek * g.minutesPerSession) / 60).toFixed(1),
          is_active: true,
          cognitive_load: 'medium',
          requires_deep_work: false,
          minimum_session_minutes: Math.min(30, g.minutesPerSession),
          preferred_session_minutes: g.minutesPerSession,
          intensity_level: 3,
        }))

        const { error: goalsError } = await (supabase as any)
          .from('user_goals')
          .insert(personalGoalsToInsert)

        if (goalsError) {
          console.error(`Error inserting personal goals for ${category}:`, goalsError)
        } else {
          personalGoalsCreated += goals.length
        }
      }
    }

    // 9. Update profiles.onboarding_completed = true
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
      academicGoalsCreated: assignments.length,
      personalGoalsCreated,
      commitmentsCreated: commitmentRows.length,
    })
  } catch (error) {
    console.error('Student onboarding completion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
