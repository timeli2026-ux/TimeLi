// Schedule generation API endpoint
// Phase 5: Scheduling Engine - Plan 03
// POST /api/schedule/generate

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSchedule } from '@/lib/scheduling/engine'
import { detectInfeasibility } from '@/lib/scheduling/infeasibility'
import { addFlexibilityToSchedule } from '@/lib/scheduling/flexibility'
import {
  GoalWithMetadata,
  SchedulerInput,
  UserPreferences,
  FixedCommitment,
  WeekSchedule,
  CognitiveLoad,
} from '@/lib/scheduling/types'

// =============================================================================
// REQUEST/RESPONSE TYPES
// =============================================================================

interface GenerateScheduleRequest {
  previousWeekSchedule?: WeekSchedule
  customWeights?: Partial<{
    ultradianAlignment: number
    spacedPractice: number
    consistency: number
    deepWorkProtection: number
    decisionFatigue: number
    commitmentStrength: number
    stability: number
    realmBalance: number
    deadlineProximity: number
  }>
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get the next Monday date
 */
function getNextMonday(): Date {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + daysUntilMonday)
  monday.setHours(0, 0, 0, 0)
  return monday
}

/**
 * Transform database preferences to scheduler format
 */
function transformPreferences(dbPrefs: Record<string, unknown>): UserPreferences {
  return {
    timezone: (dbPrefs.timezone as string) || 'UTC',
    sleepStart: (dbPrefs.sleep_start as string) || '23:00',
    sleepEnd: (dbPrefs.sleep_end as string) || '07:00',
    weekendSleepStart: dbPrefs.weekend_sleep_start as string | null,
    weekendSleepEnd: dbPrefs.weekend_sleep_end as string | null,
    chronotype: ((dbPrefs.chronotype as string) || 'intermediate') as UserPreferences['chronotype'],
    bufferMinutes: (dbPrefs.buffer_minutes as number) || 15,
    mealBreakfastStart: dbPrefs.meal_breakfast_start as string | null,
    mealBreakfastDuration: dbPrefs.meal_breakfast_duration as number | null,
    mealLunchStart: dbPrefs.meal_lunch_start as string | null,
    mealLunchDuration: dbPrefs.meal_lunch_duration as number | null,
    mealDinnerStart: dbPrefs.meal_dinner_start as string | null,
    mealDinnerDuration: dbPrefs.meal_dinner_duration as number | null,
    commuteMorningStart: dbPrefs.commute_morning_start as string | null,
    commuteMorningDuration: dbPrefs.commute_morning_duration as number | null,
    commuteEveningStart: dbPrefs.commute_evening_start as string | null,
    commuteEveningDuration: dbPrefs.commute_evening_duration as number | null,
  }
}

/**
 * Transform database commitments to scheduler format
 */
function transformCommitments(dbCommitments: Record<string, unknown>[]): FixedCommitment[] {
  return dbCommitments.map(c => ({
    id: c.id as string,
    title: c.title as string,
    dayOfWeek: c.day_of_week as number,
    startTime: c.start_time as string,
    endTime: c.end_time as string,
    isRecurring: (c.is_recurring as boolean) ?? true,
  }))
}

/**
 * Transform database goals to scheduler format
 */
function transformGoals(dbGoals: Record<string, unknown>[]): GoalWithMetadata[] {
  return dbGoals.map(g => ({
    id: g.id as string,
    title: g.title as string,
    realmId: g.realm_id as string,
    hoursPerWeek: g.hours_per_week as number,
    cognitiveLoad: ((g.cognitive_load as string) || 'medium') as CognitiveLoad,
    requiresDeepWork: (g.requires_deep_work as boolean) || false,
    deadline: g.deadline ? new Date(g.deadline as string) : undefined,
    deadlineType: ((g.deadline_type as string) || 'none') as 'hard' | 'soft' | 'none',
    anchor: g.anchor_type !== 'none' && g.anchor_event_id ? {
      type: g.anchor_type as 'after_event' | 'before_event',
      anchorId: g.anchor_event_id as string,
      bufferMinutes: 5
    } : undefined,
    intensityLevel: ((g.intensity_level as number) || 3) as 1 | 2 | 3 | 4 | 5,
    sessionStrategy: {
      preferredDuration: (g.preferred_session_minutes as number) || 60,
      minimumDuration: (g.minimum_session_minutes as number) || 30,
      maximumDuration: 90,
      allowSplitting: true
    }
  }))
}

// =============================================================================
// API HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Parse request body (optional: previousWeekSchedule, customWeights)
    let body: GenerateScheduleRequest = {}
    try {
      body = await request.json()
    } catch {
      // Empty body is valid
    }
    const { previousWeekSchedule, customWeights } = body

    // 3. Load user data from Supabase
    const [preferencesResult, commitmentsResult, goalsResult] = await Promise.all([
      supabase.from('user_preferences').select('*').eq('user_id', user.id).single(),
      supabase.from('fixed_commitments').select('*').eq('user_id', user.id),
      supabase.from('user_goals').select(`
        *,
        realm:life_realms(id, name, icon)
      `).eq('user_id', user.id).eq('is_active', true)
    ])

    if (preferencesResult.error) {
      return NextResponse.json(
        { error: 'User preferences not found. Complete onboarding first.' },
        { status: 400 }
      )
    }

    // 4. Transform database rows to scheduler types
    const preferences = transformPreferences(preferencesResult.data as Record<string, unknown>)
    const commitments = transformCommitments((commitmentsResult.data || []) as Record<string, unknown>[])
    const goals = transformGoals((goalsResult.data || []) as Record<string, unknown>[])

    // 5. Build scheduler input
    const weekStart = getNextMonday()
    const schedulerInput: SchedulerInput = {
      preferences,
      commitments,
      goals,
      weekStart,
      previousWeekSchedule
    }

    // 6. Check for infeasibility FIRST
    const infeasibility = detectInfeasibility(schedulerInput)

    if (infeasibility.isInfeasible) {
      // Return 409 Conflict with infeasibility report
      // Include minimum viable schedule so user sees what CAN work
      return NextResponse.json({
        infeasibility,
        message: infeasibility.summary
      }, { status: 409 })
    }

    // 7. Generate schedule
    const result = generateSchedule(schedulerInput, { customWeights, previousWeekSchedule })

    // 8. Add flexibility classification
    const scheduleWithFlexibility = addFlexibilityToSchedule(result.schedule, schedulerInput)

    // 9. Return success
    return NextResponse.json({
      schedule: scheduleWithFlexibility,
      stats: result.stats,
      unscheduledGoals: result.unscheduledGoals
    })

  } catch (error) {
    console.error('Schedule generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate schedule' },
      { status: 500 }
    )
  }
}
