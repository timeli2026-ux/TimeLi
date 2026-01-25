// Weekly review API endpoint
// Phase 10: Hardening & Launch - Plan 02
// GET /api/review - Fetch weekly review data

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// TYPES
// =============================================================================

interface ProductiveTime {
  hour: number
  label: string
  count: number
}

interface RealmCompletion {
  realmId: string
  realmName: string
  completed: number
  skipped: number
  partial: number
  total: number
  completionRate: number
}

interface ReviewStats {
  totalScheduled: number
  completed: number
  skipped: number
  partial: number
  completionRate: number
}

interface ReviewData {
  stats: ReviewStats
  completionsByRealm: RealmCompletion[]
  productiveTimes: ProductiveTime[]
  weekStart: string
  notes: string | null
}

// =============================================================================
// HELPERS
// =============================================================================

function getHourLabel(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return '12 PM'
  return `${hour - 12} PM`
}

function getWeekStart(date: Date): string {
  // Get Monday of the week
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Sunday
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

function getLastCompletedWeekStart(): string {
  const now = new Date()
  const currentWeekStart = getWeekStart(now)

  // Go back one week from current week start
  const lastWeek = new Date(currentWeekStart)
  lastWeek.setDate(lastWeek.getDate() - 7)
  return lastWeek.toISOString().split('T')[0]
}

// =============================================================================
// API HANDLER
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse<ReviewData | { error: string }>> {
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

    // 2. Get week start from query params (default: last completed week)
    const { searchParams } = new URL(request.url)
    const weekStart = searchParams.get('weekStart') || getLastCompletedWeekStart()

    // 3. Calculate week end (Sunday)
    const weekStartDate = new Date(weekStart)
    const weekEndDate = new Date(weekStartDate)
    weekEndDate.setDate(weekEndDate.getDate() + 6)
    const weekEnd = weekEndDate.toISOString().split('T')[0]

    // 4. Fetch completions for this week
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: completions, error: completionsError } = await (supabase as any)
      .from('schedule_completions')
      .select(`
        id,
        event_id,
        goal_id,
        status,
        scheduled_date,
        scheduled_start_time
      `)
      .eq('user_id', user.id)
      .gte('scheduled_date', weekStart)
      .lte('scheduled_date', weekEnd) as { data: Array<{
        id: string
        event_id: string
        goal_id: string | null
        status: 'completed' | 'skipped' | 'partial'
        scheduled_date: string
        scheduled_start_time: string | null
      }> | null, error: Error | null }

    if (completionsError) {
      console.error('Failed to fetch completions:', completionsError)
      return NextResponse.json(
        { error: 'Failed to fetch review data' },
        { status: 500 }
      )
    }

    // 5. Fetch goals with realm info for the completions
    const goalIds = [...new Set((completions || []).map(c => c.goal_id).filter(Boolean))]
    let goalsWithRealms: Record<string, { realmId: string, realmName: string }> = {}

    if (goalIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: goals } = await (supabase as any)
        .from('user_goals')
        .select(`
          id,
          realm_id,
          life_realms!inner(name)
        `)
        .in('id', goalIds) as { data: Array<{
          id: string
          realm_id: string
          life_realms: { name: string }
        }> | null }

      if (goals) {
        for (const goal of goals) {
          goalsWithRealms[goal.id] = {
            realmId: goal.realm_id,
            realmName: goal.life_realms.name
          }
        }
      }
    }

    // 6. Calculate stats
    const total = completions?.length || 0
    const completed = (completions || []).filter(c => c.status === 'completed').length
    const skipped = (completions || []).filter(c => c.status === 'skipped').length
    const partial = (completions || []).filter(c => c.status === 'partial').length
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    const stats: ReviewStats = {
      totalScheduled: total,
      completed,
      skipped,
      partial,
      completionRate
    }

    // 7. Calculate completions by realm
    const realmStats: Record<string, { completed: number, skipped: number, partial: number, realmName: string }> = {}

    for (const completion of completions || []) {
      if (completion.goal_id && goalsWithRealms[completion.goal_id]) {
        const { realmId, realmName } = goalsWithRealms[completion.goal_id]
        if (!realmStats[realmId]) {
          realmStats[realmId] = { completed: 0, skipped: 0, partial: 0, realmName }
        }
        if (completion.status === 'completed') {
          realmStats[realmId].completed++
        } else if (completion.status === 'skipped') {
          realmStats[realmId].skipped++
        } else {
          realmStats[realmId].partial++
        }
      }
    }

    const completionsByRealm: RealmCompletion[] = Object.entries(realmStats)
      .map(([realmId, data]) => {
        const realmTotal = data.completed + data.skipped + data.partial
        return {
          realmId,
          realmName: data.realmName,
          completed: data.completed,
          skipped: data.skipped,
          partial: data.partial,
          total: realmTotal,
          completionRate: realmTotal > 0 ? Math.round((data.completed / realmTotal) * 100) : 0
        }
      })
      .sort((a, b) => b.total - a.total)

    // 8. Calculate productive times (top 3 hours with most completions)
    const hourCounts: Record<number, number> = {}

    for (const completion of completions || []) {
      if (completion.status === 'completed' && completion.scheduled_start_time) {
        const hour = parseInt(completion.scheduled_start_time.split(':')[0], 10)
        hourCounts[hour] = (hourCounts[hour] || 0) + 1
      }
    }

    const productiveTimes: ProductiveTime[] = Object.entries(hourCounts)
      .map(([hour, count]) => ({
        hour: parseInt(hour, 10),
        label: getHourLabel(parseInt(hour, 10)),
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    // 9. Fetch review notes for this week
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: schedule } = await (supabase as any)
      .from('generated_schedules')
      .select('review_notes')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .single() as { data: { review_notes: string | null } | null }

    // 10. Return data
    return NextResponse.json({
      stats,
      completionsByRealm,
      productiveTimes,
      weekStart,
      notes: schedule?.review_notes || null
    })

  } catch (error) {
    console.error('Review API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch review data' },
      { status: 500 }
    )
  }
}
