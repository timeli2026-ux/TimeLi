import { createClient } from '@/lib/supabase/server'
import { sanitizeUserInput } from '@/lib/sanitize'
import { goalFormSchema } from '@/lib/validations/goals'
import { NextResponse } from 'next/server'

// =============================================================================
// GET /api/goals - List all goals for authenticated user
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

    // Query user_goals with realm info via join
    // Using (supabase as any) until types are regenerated
    const { data: goals, error: goalsError } = await (supabase as any)
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
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (goalsError) {
      console.error('Error fetching goals:', goalsError)
      return NextResponse.json(
        { error: 'Failed to fetch goals' },
        { status: 500 }
      )
    }

    // Transform response to match GoalResponse type
    const transformedGoals = (goals || []).map((goal: Record<string, unknown>) => ({
      id: goal.id,
      userId: goal.user_id,
      realmId: goal.realm_id,
      title: goal.title,
      hoursPerWeek: goal.hours_per_week,
      isActive: goal.is_active,
      cognitiveLoad: goal.cognitive_load,
      requiresDeepWork: goal.requires_deep_work,
      deadline: goal.deadline,
      deadlineType: goal.deadline_type,
      minimumSessionMinutes: goal.minimum_session_minutes,
      preferredSessionMinutes: goal.preferred_session_minutes,
      intensityLevel: goal.intensity_level,
      createdAt: goal.created_at,
      updatedAt: goal.updated_at,
      realmName: (goal.life_realms as { name: string } | null)?.name,
    }))

    return NextResponse.json({ goals: transformedGoals })
  } catch (error) {
    console.error('Goals GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST /api/goals - Create new goal
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
    const validationResult = goalFormSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Sanitize title
    const sanitizedTitle = sanitizeUserInput(data.title, { maxLength: 100 })

    // Insert into user_goals
    const { data: newGoal, error: insertError } = await (supabase as any)
      .from('user_goals')
      .insert({
        user_id: user.id,
        realm_id: data.realmId,
        title: sanitizedTitle,
        hours_per_week: data.hoursPerWeek,
        is_active: data.isActive ?? true,
        cognitive_load: data.cognitiveLoad ?? 'medium',
        requires_deep_work: data.requiresDeepWork ?? false,
        deadline: data.deadline ?? null,
        deadline_type: data.deadlineType ?? 'none',
        minimum_session_minutes: data.minimumSessionMinutes ?? 30,
        preferred_session_minutes: data.preferredSessionMinutes ?? 60,
        intensity_level: data.intensityLevel ?? 3,
      })
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

    if (insertError) {
      console.error('Error creating goal:', insertError)
      return NextResponse.json(
        { error: 'Failed to create goal' },
        { status: 500 }
      )
    }

    // Transform response
    const goal = newGoal as Record<string, unknown>
    const transformedGoal = {
      id: goal.id,
      userId: goal.user_id,
      realmId: goal.realm_id,
      title: goal.title,
      hoursPerWeek: goal.hours_per_week,
      isActive: goal.is_active,
      cognitiveLoad: goal.cognitive_load,
      requiresDeepWork: goal.requires_deep_work,
      deadline: goal.deadline,
      deadlineType: goal.deadline_type,
      minimumSessionMinutes: goal.minimum_session_minutes,
      preferredSessionMinutes: goal.preferred_session_minutes,
      intensityLevel: goal.intensity_level,
      createdAt: goal.created_at,
      updatedAt: goal.updated_at,
      realmName: (goal.life_realms as { name: string } | null)?.name,
    }

    return NextResponse.json({ goal: transformedGoal }, { status: 201 })
  } catch (error) {
    console.error('Goals POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
