import { createClient } from '@/lib/supabase/server'
import { sanitizeUserInput } from '@/lib/sanitize'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// Time format validation (HH:mm)
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

const timeSchema = z.string().regex(timeRegex, 'Invalid time format (HH:mm)')
// Nullable time schema that also accepts empty strings and transforms them to null
const nullableTimeSchema = z.union([
  z.string().regex(timeRegex),
  z.string().length(0).transform(() => null),
  z.null(),
])

// Nullable duration schema that accepts null
const nullableDurationSchema = (min: number, max: number) =>
  z.union([z.number().min(min).max(max), z.null()])

// Request body validation schema
const onboardingSchema = z.object({
  preferences: z.object({
    timezone: z.string().min(1).max(100),
    sleepStart: timeSchema,
    sleepEnd: timeSchema,
    mealsVariable: z.boolean().optional().default(false),
    mealBreakfastStart: nullableTimeSchema,
    mealBreakfastDuration: nullableDurationSchema(15, 120),
    mealLunchStart: nullableTimeSchema,
    mealLunchDuration: nullableDurationSchema(15, 120),
    mealDinnerStart: nullableTimeSchema,
    mealDinnerDuration: nullableDurationSchema(15, 120),
    bufferMinutes: z.number().min(5).max(30),
    commuteMorningStart: nullableTimeSchema,
    commuteMorningDuration: nullableDurationSchema(15, 90),
    commuteEveningStart: nullableTimeSchema,
    commuteEveningDuration: nullableDurationSchema(15, 90),
  }),
  commitments: z.array(
    z.object({
      title: z.string().min(1).max(100),
      dayOfWeek: z.number().min(0).max(6),
      startTime: timeSchema,
      endTime: timeSchema,
    })
  ).max(20),
  goals: z.array(
    z.object({
      title: z.string().min(1).max(100),
      hoursPerWeek: z.number().min(1).max(40),
    })
  ).max(10),
})

export async function POST(request: Request) {
  try {
    // Get authenticated user
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
    const validationResult = onboardingSchema.safeParse(body)

    if (!validationResult.success) {
      console.error('Validation error:', JSON.stringify(validationResult.error.issues, null, 2))
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { preferences, commitments, goals } = validationResult.data

    // Sanitize string inputs
    const sanitizedTimezone = sanitizeUserInput(preferences.timezone, { maxLength: 100 })
    const sanitizedCommitments = commitments.map((c) => ({
      ...c,
      title: sanitizeUserInput(c.title, { maxLength: 100 }),
    }))
    const sanitizedGoals = goals.map((g) => ({
      ...g,
      title: sanitizeUserInput(g.title, { maxLength: 100 }),
    }))

    // Upsert user preferences
    const { error: preferencesError } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: user.id,
          timezone: sanitizedTimezone,
          sleep_start: preferences.sleepStart,
          sleep_end: preferences.sleepEnd,
          meal_breakfast_start: preferences.mealBreakfastStart,
          meal_breakfast_duration: preferences.mealBreakfastDuration,
          meal_lunch_start: preferences.mealLunchStart,
          meal_lunch_duration: preferences.mealLunchDuration,
          meal_dinner_start: preferences.mealDinnerStart,
          meal_dinner_duration: preferences.mealDinnerDuration,
          buffer_minutes: preferences.bufferMinutes,
          commute_morning_start: preferences.commuteMorningStart,
          commute_morning_duration: preferences.commuteMorningDuration,
          commute_evening_start: preferences.commuteEveningStart,
          commute_evening_duration: preferences.commuteEveningDuration,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (preferencesError) {
      console.error('Error saving preferences:', preferencesError)
      return NextResponse.json(
        { error: 'Failed to save preferences' },
        { status: 500 }
      )
    }

    // Delete existing commitments and insert new ones
    const { error: deleteCommitmentsError } = await supabase
      .from('fixed_commitments')
      .delete()
      .eq('user_id', user.id)

    if (deleteCommitmentsError) {
      console.error('Error deleting old commitments:', deleteCommitmentsError)
      return NextResponse.json(
        { error: 'Failed to update commitments' },
        { status: 500 }
      )
    }

    if (sanitizedCommitments.length > 0) {
      const commitmentsToInsert = sanitizedCommitments.map((c) => ({
        user_id: user.id,
        title: c.title,
        day_of_week: c.dayOfWeek,
        start_time: c.startTime,
        end_time: c.endTime,
        is_recurring: true,
      }))

      const { error: insertCommitmentsError } = await supabase
        .from('fixed_commitments')
        .insert(commitmentsToInsert)

      if (insertCommitmentsError) {
        console.error('Error inserting commitments:', insertCommitmentsError)
        return NextResponse.json(
          { error: 'Failed to save commitments' },
          { status: 500 }
        )
      }
    }

    // Store initial goals in user_preferences as JSONB
    // This is a simple approach for onboarding - full goals CRUD comes in Phase 5
    const { error: goalsError } = await supabase
      .from('user_preferences')
      .update({
        initial_goals: sanitizedGoals,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    // Note: initial_goals column may not exist yet - we'll handle this gracefully
    if (goalsError) {
      // Log but don't fail - goals will be properly handled in Phase 5
      console.warn('Could not save initial goals (column may not exist):', goalsError)
    }

    // Update profiles.onboarding_completed = true
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('Error updating profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to complete onboarding' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Onboarding completion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
