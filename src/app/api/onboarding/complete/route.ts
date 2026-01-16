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

// Life realm validation schema
const realmSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  icon: z.string().max(10).optional(),
  isCustom: z.boolean(),
})

// Meal schema for flexible meal times
const mealSchema = z.object({
  name: z.string().min(1).max(30),
  start: timeSchema,
  duration: z.number().min(15).max(90),
})

// Request body validation schema
const onboardingSchema = z.object({
  preferences: z.object({
    timezone: z.string().min(1).max(100),
    sleepStart: timeSchema,
    sleepEnd: timeSchema,
    mealsVariable: z.boolean().optional().default(false),
    meals: z.array(mealSchema).max(8), // Flexible array of meals
    commuteMorningStart: nullableTimeSchema,
    commuteMorningDuration: nullableDurationSchema(15, 90).nullable(),
    commuteEveningStart: nullableTimeSchema,
    commuteEveningDuration: nullableDurationSchema(15, 90).nullable(),
  }),
  commitments: z.array(
    z.object({
      title: z.string().min(1).max(100),
      dayOfWeek: z.number().min(0).max(6),
      startTime: timeSchema,
      endTime: timeSchema,
    })
  ).max(20),
  realms: z.array(realmSchema).min(1).max(10),
  actions: z.array(
    z.object({
      title: z.string().min(1).max(100),
      realmId: z.string().uuid(),
      timesPerWeek: z.number().min(1).max(7),
      minutesPerSession: z.number().min(15).max(180),
      hoursPerWeek: z.number().min(0.25).max(40),
    })
  ).max(20),
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

    const { preferences, commitments, realms, actions } = validationResult.data

    // Sanitize string inputs
    const sanitizedTimezone = sanitizeUserInput(preferences.timezone, { maxLength: 100 })
    const sanitizedCommitments = commitments.map((c) => ({
      ...c,
      title: sanitizeUserInput(c.title, { maxLength: 100 }),
    }))
    const sanitizedRealms = realms.map((r) => ({
      ...r,
      name: sanitizeUserInput(r.name, { maxLength: 50 }),
    }))
    const sanitizedActions = actions.map((a) => ({
      ...a,
      title: sanitizeUserInput(a.title, { maxLength: 100 }),
    }))

    // Extract standard meals from the flexible meals array
    const getMealData = (mealName: string) => {
      const meal = preferences.meals.find((m) => m.name.toLowerCase() === mealName.toLowerCase())
      return meal ? { start: meal.start, duration: meal.duration } : { start: null, duration: null }
    }

    const breakfast = getMealData('Breakfast')
    const lunch = getMealData('Lunch')
    const dinner = getMealData('Dinner')

    // Upsert user preferences (using existing schema columns)
    const { error: preferencesError } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: user.id,
          timezone: sanitizedTimezone,
          sleep_start: preferences.sleepStart,
          sleep_end: preferences.sleepEnd,
          // Map to existing meal columns
          meal_breakfast_start: preferences.mealsVariable ? null : breakfast.start,
          meal_breakfast_duration: preferences.mealsVariable ? null : breakfast.duration,
          meal_lunch_start: preferences.mealsVariable ? null : lunch.start,
          meal_lunch_duration: preferences.mealsVariable ? null : lunch.duration,
          meal_dinner_start: preferences.mealsVariable ? null : dinner.start,
          meal_dinner_duration: preferences.mealsVariable ? null : dinner.duration,
          commute_morning_start: preferences.commuteMorningStart,
          commute_morning_duration: preferences.commuteMorningDuration,
          commute_evening_start: preferences.commuteEveningStart,
          commute_evening_duration: preferences.commuteEveningDuration,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    // Note: Custom meals beyond breakfast/lunch/dinner will be stored in Phase 5
    // when we add proper meals JSONB column to the schema

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

    // Store realms and actions in user_preferences as JSONB
    // This is a simple approach for onboarding - full actions CRUD comes in Phase 5
    const { error: realmsActionsError } = await supabase
      .from('user_preferences')
      .update({
        life_realms: sanitizedRealms,
        initial_actions: sanitizedActions,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    // Note: life_realms/initial_actions columns may not exist yet - we'll handle this gracefully
    if (realmsActionsError) {
      // Log but don't fail - realms/actions will be properly handled in Phase 5
      console.warn('Could not save realms/actions (columns may not exist):', realmsActionsError)
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
