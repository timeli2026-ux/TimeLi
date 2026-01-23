import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// =============================================================================
// Types for onboarding data stored in JSONB
// =============================================================================

interface OnboardingRealm {
  id: string
  name: string
  icon?: string
  isCustom: boolean
}

interface OnboardingAction {
  title: string
  realmId: string
  timesPerWeek: number
  minutesPerSession: number
  hoursPerWeek: number
}

// =============================================================================
// POST /api/goals/migrate - Migrate onboarding actions to user_goals table
// =============================================================================

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Read user_preferences for initial_actions and life_realms JSONB
    // Using (supabase as any) because these JSONB columns are not in generated types
    const { data: preferences, error: preferencesError } = await (supabase as any)
      .from('user_preferences')
      .select('initial_actions, life_realms')
      .eq('user_id', user.id)
      .single()

    if (preferencesError) {
      if (preferencesError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'User preferences not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching preferences:', preferencesError)
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      )
    }

    const initialActions = (preferences?.initial_actions ?? null) as OnboardingAction[] | null
    const lifeRealms = (preferences?.life_realms ?? null) as OnboardingRealm[] | null

    // Check if already migrated
    if (!initialActions || initialActions.length === 0) {
      return NextResponse.json({
        migrated: 0,
        alreadyMigrated: true,
        message: 'No initial actions to migrate or already migrated',
      })
    }

    // Create a map of realm IDs from onboarding to lookup
    const realmIdMap = new Map<string, string>()
    const warnings: string[] = []

    // First, ensure all realms exist in life_realms table
    if (lifeRealms && lifeRealms.length > 0) {
      for (const realm of lifeRealms) {
        // Check if realm already exists in life_realms table by name
        const { data: existingRealm, error: realmCheckError } = await (supabase as any)
          .from('life_realms')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', realm.name)
          .single()

        if (realmCheckError && realmCheckError.code !== 'PGRST116') {
          console.error('Error checking realm:', realmCheckError)
          continue
        }

        if (existingRealm) {
          // Realm exists, map the onboarding ID to the actual database ID
          realmIdMap.set(realm.id, existingRealm.id as string)
        } else {
          // Create the realm
          const { data: newRealm, error: createRealmError } = await (supabase as any)
            .from('life_realms')
            .insert({
              user_id: user.id,
              name: realm.name,
              icon: realm.icon || null,
              is_custom: realm.isCustom,
            })
            .select('id')
            .single()

          if (createRealmError) {
            console.error('Error creating realm:', createRealmError)
            warnings.push(`Failed to create realm: ${realm.name}`)
            continue
          }

          realmIdMap.set(realm.id, newRealm.id as string)
        }
      }
    }

    // Now migrate each action to user_goals
    let migratedCount = 0
    const skippedGoals: string[] = []

    for (const action of initialActions) {
      // Get the actual realm ID from our map
      const actualRealmId = realmIdMap.get(action.realmId)

      if (!actualRealmId) {
        warnings.push(`Skipping action "${action.title}": realm not found`)
        skippedGoals.push(action.title)
        continue
      }

      // Check for duplicate (same title in same realm)
      const { data: existingGoal, error: duplicateCheckError } = await (supabase as any)
        .from('user_goals')
        .select('id')
        .eq('user_id', user.id)
        .eq('realm_id', actualRealmId)
        .eq('title', action.title)
        .single()

      if (duplicateCheckError && duplicateCheckError.code !== 'PGRST116') {
        console.error('Error checking duplicate:', duplicateCheckError)
        continue
      }

      if (existingGoal) {
        warnings.push(`Skipping duplicate goal: "${action.title}"`)
        skippedGoals.push(action.title)
        continue
      }

      // Calculate hours_per_week from action data
      // hoursPerWeek is already calculated in onboarding: timesPerWeek * minutesPerSession / 60
      const hoursPerWeek = action.hoursPerWeek ||
        (action.timesPerWeek * action.minutesPerSession / 60)

      // Insert the goal
      const { error: insertError } = await (supabase as any)
        .from('user_goals')
        .insert({
          user_id: user.id,
          realm_id: actualRealmId,
          title: action.title,
          hours_per_week: hoursPerWeek,
          is_active: true,
          // Default values for new fields
          cognitive_load: 'medium',
          requires_deep_work: false,
          deadline_type: 'none',
          minimum_session_minutes: Math.min(action.minutesPerSession, 90),
          preferred_session_minutes: action.minutesPerSession,
          intensity_level: 3,
        })

      if (insertError) {
        console.error('Error inserting goal:', insertError)
        warnings.push(`Failed to create goal: ${action.title}`)
        continue
      }

      migratedCount++
    }

    // Clear initial_actions after successful migration (only if at least one was migrated)
    if (migratedCount > 0) {
      const { error: clearError } = await (supabase as any)
        .from('user_preferences')
        .update({ initial_actions: null })
        .eq('user_id', user.id)

      if (clearError) {
        console.error('Error clearing initial_actions:', clearError)
        // Don't fail the request, just warn
        warnings.push('Could not clear initial_actions after migration')
      }
    }

    return NextResponse.json({
      migrated: migratedCount,
      alreadyMigrated: false,
      skipped: skippedGoals.length,
      skippedGoals,
      warnings: warnings.length > 0 ? warnings : undefined,
      message: migratedCount > 0
        ? `Successfully migrated ${migratedCount} goal(s)`
        : 'No goals were migrated',
    })
  } catch (error) {
    console.error('Goals migrate error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
