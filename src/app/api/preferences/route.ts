import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

// Time format validation (HH:mm)
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
const timeSchema = z.string().regex(timeRegex, 'Invalid time format (HH:mm)')
const nullableTimeSchema = z.union([
  z.string().regex(timeRegex),
  z.string().length(0).transform(() => null),
  z.null(),
])

// Preferences update schema (partial update allowed)
const preferencesUpdateSchema = z.object({
  timezone: z.string().min(1).max(100).optional(),
  sleepStart: timeSchema.optional(),
  sleepEnd: timeSchema.optional(),
  weekendSleepStart: nullableTimeSchema.optional(),
  weekendSleepEnd: nullableTimeSchema.optional(),
  chronotype: z.enum(['early_bird', 'night_owl', 'intermediate']).optional(),
  bufferMinutes: z.number().min(5).max(30).optional(),
  mealBreakfastStart: nullableTimeSchema.optional(),
  mealBreakfastDuration: z.number().min(15).max(90).nullable().optional(),
  mealLunchStart: nullableTimeSchema.optional(),
  mealLunchDuration: z.number().min(15).max(90).nullable().optional(),
  mealDinnerStart: nullableTimeSchema.optional(),
  mealDinnerDuration: z.number().min(15).max(90).nullable().optional(),
  commuteMorningStart: nullableTimeSchema.optional(),
  commuteMorningDuration: z.number().min(15).max(90).nullable().optional(),
  commuteEveningStart: nullableTimeSchema.optional(),
  commuteEveningDuration: z.number().min(15).max(90).nullable().optional(),
})

// =============================================================================
// RESPONSE TYPES
// =============================================================================

interface PreferencesResponse {
  timezone: string
  sleepStart: string
  sleepEnd: string
  weekendSleepStart: string | null
  weekendSleepEnd: string | null
  chronotype: 'early_bird' | 'night_owl' | 'intermediate'
  bufferMinutes: number
  mealBreakfastStart: string | null
  mealBreakfastDuration: number | null
  mealLunchStart: string | null
  mealLunchDuration: number | null
  mealDinnerStart: string | null
  mealDinnerDuration: number | null
  commuteMorningStart: string | null
  commuteMorningDuration: number | null
  commuteEveningStart: string | null
  commuteEveningDuration: number | null
}

// =============================================================================
// GET: Fetch current user preferences
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

    // Fetch user preferences
    const { data: preferences, error: fetchError } = await (supabase as any)
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (fetchError || !preferences) {
      return NextResponse.json(
        { error: 'No preferences found' },
        { status: 404 }
      )
    }

    // Transform to response format (camelCase)
    const response: PreferencesResponse = {
      timezone: preferences.timezone,
      sleepStart: preferences.sleep_start,
      sleepEnd: preferences.sleep_end,
      weekendSleepStart: preferences.weekend_sleep_start,
      weekendSleepEnd: preferences.weekend_sleep_end,
      chronotype: preferences.chronotype || 'intermediate',
      bufferMinutes: preferences.buffer_minutes || 10,
      mealBreakfastStart: preferences.meal_breakfast_start,
      mealBreakfastDuration: preferences.meal_breakfast_duration,
      mealLunchStart: preferences.meal_lunch_start,
      mealLunchDuration: preferences.meal_lunch_duration,
      mealDinnerStart: preferences.meal_dinner_start,
      mealDinnerDuration: preferences.meal_dinner_duration,
      commuteMorningStart: preferences.commute_morning_start,
      commuteMorningDuration: preferences.commute_morning_duration,
      commuteEveningStart: preferences.commute_evening_start,
      commuteEveningDuration: preferences.commute_evening_duration,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// PUT: Update user preferences
// =============================================================================

export async function PUT(request: Request) {
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
    const validationResult = preferencesUpdateSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const updates = validationResult.data

    // Transform to database format (snake_case)
    const dbUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (updates.timezone !== undefined) dbUpdates.timezone = updates.timezone
    if (updates.sleepStart !== undefined) dbUpdates.sleep_start = updates.sleepStart
    if (updates.sleepEnd !== undefined) dbUpdates.sleep_end = updates.sleepEnd
    if (updates.weekendSleepStart !== undefined) dbUpdates.weekend_sleep_start = updates.weekendSleepStart
    if (updates.weekendSleepEnd !== undefined) dbUpdates.weekend_sleep_end = updates.weekendSleepEnd
    if (updates.chronotype !== undefined) dbUpdates.chronotype = updates.chronotype
    if (updates.bufferMinutes !== undefined) dbUpdates.buffer_minutes = updates.bufferMinutes
    if (updates.mealBreakfastStart !== undefined) dbUpdates.meal_breakfast_start = updates.mealBreakfastStart
    if (updates.mealBreakfastDuration !== undefined) dbUpdates.meal_breakfast_duration = updates.mealBreakfastDuration
    if (updates.mealLunchStart !== undefined) dbUpdates.meal_lunch_start = updates.mealLunchStart
    if (updates.mealLunchDuration !== undefined) dbUpdates.meal_lunch_duration = updates.mealLunchDuration
    if (updates.mealDinnerStart !== undefined) dbUpdates.meal_dinner_start = updates.mealDinnerStart
    if (updates.mealDinnerDuration !== undefined) dbUpdates.meal_dinner_duration = updates.mealDinnerDuration
    if (updates.commuteMorningStart !== undefined) dbUpdates.commute_morning_start = updates.commuteMorningStart
    if (updates.commuteMorningDuration !== undefined) dbUpdates.commute_morning_duration = updates.commuteMorningDuration
    if (updates.commuteEveningStart !== undefined) dbUpdates.commute_evening_start = updates.commuteEveningStart
    if (updates.commuteEveningDuration !== undefined) dbUpdates.commute_evening_duration = updates.commuteEveningDuration

    // Update preferences
    const { error: updateError } = await (supabase as any)
      .from('user_preferences')
      .update(dbUpdates)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating preferences:', updateError)
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      )
    }

    // Fetch updated preferences to return
    const { data: updatedPreferences, error: fetchError } = await (supabase as any)
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (fetchError || !updatedPreferences) {
      return NextResponse.json(
        { error: 'Failed to fetch updated preferences' },
        { status: 500 }
      )
    }

    // Transform to response format
    const response: PreferencesResponse = {
      timezone: updatedPreferences.timezone,
      sleepStart: updatedPreferences.sleep_start,
      sleepEnd: updatedPreferences.sleep_end,
      weekendSleepStart: updatedPreferences.weekend_sleep_start,
      weekendSleepEnd: updatedPreferences.weekend_sleep_end,
      chronotype: updatedPreferences.chronotype || 'intermediate',
      bufferMinutes: updatedPreferences.buffer_minutes || 10,
      mealBreakfastStart: updatedPreferences.meal_breakfast_start,
      mealBreakfastDuration: updatedPreferences.meal_breakfast_duration,
      mealLunchStart: updatedPreferences.meal_lunch_start,
      mealLunchDuration: updatedPreferences.meal_lunch_duration,
      mealDinnerStart: updatedPreferences.meal_dinner_start,
      mealDinnerDuration: updatedPreferences.meal_dinner_duration,
      commuteMorningStart: updatedPreferences.commute_morning_start,
      commuteMorningDuration: updatedPreferences.commute_morning_duration,
      commuteEveningStart: updatedPreferences.commute_evening_start,
      commuteEveningDuration: updatedPreferences.commute_evening_duration,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error updating preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
