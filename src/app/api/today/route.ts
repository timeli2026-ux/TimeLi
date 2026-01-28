import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/today
 * Returns today's schedule events, pending assignments sorted by urgency,
 * courses, and weekly stats for the Today View.
 */

function getCurrentWeekMonday(): string {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysSinceMonday)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const weekStart = getCurrentWeekMonday()
    const today = new Date()
    // JS getDay(): 0=Sunday. Schedule uses 0=Sunday too.
    const todayDayOfWeek = today.getDay()

    // Fetch schedule, assignments, courses, and profile in parallel
    const [scheduleResult, assignmentsResult, coursesResult, profileResult] = await Promise.all([
      (supabase as any)
        .from('generated_schedules')
        .select('events, stats')
        .eq('user_id', user.id)
        .eq('week_start', weekStart)
        .single(),
      (supabase as any)
        .from('assignments')
        .select('*, course:courses(id, name, color)')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true }),
      (supabase as any)
        .from('courses')
        .select('id, name, color, schedule, instructor')
        .eq('user_id', user.id)
        .eq('is_active', true),
      supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single(),
    ])

    // Filter today's schedule events
    const allEvents = (scheduleResult.data?.events || []) as Array<{
      id: string
      type: string
      title: string
      slot: { dayOfWeek: number; startTime: string; endTime: string; durationMinutes: number }
      goalId?: string
      realmId?: string
      isLocked: boolean
      rationale?: unknown
    }>

    const todayEvents = allEvents
      .filter((e) => e.slot.dayOfWeek === todayDayOfWeek)
      .sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime))

    // Process assignments
    const allAssignments = (assignmentsResult.data || []) as Array<{
      id: string
      title: string
      type: string
      due_date: string
      estimated_hours: number
      status: string
      priority: string
      notes: string | null
      course_id: string | null
      completed_at: string | null
      course: { id: string; name: string; color: string } | null
    }>

    const pendingAssignments = allAssignments
      .filter((a) => a.status !== 'completed')
      .map((a) => {
        const dueDate = new Date(a.due_date)
        const msUntilDue = dueDate.getTime() - today.getTime()
        const daysUntilDue = Math.max(0.1, msUntilDue / (1000 * 60 * 60 * 24))
        const urgency = a.estimated_hours / daysUntilDue

        return {
          id: a.id,
          title: a.title,
          type: a.type,
          dueDate: a.due_date,
          estimatedHours: a.estimated_hours,
          status: a.status,
          priority: a.priority,
          notes: a.notes,
          courseId: a.course_id,
          courseName: a.course?.name || null,
          courseColor: a.course?.color || null,
          urgency,
          daysUntilDue: Math.ceil(daysUntilDue),
        }
      })
      .sort((a, b) => b.urgency - a.urgency)

    const completedAssignments = allAssignments.filter((a) => a.status === 'completed')

    // Weekly stats
    const dueThisWeek = pendingAssignments.filter((a) => a.daysUntilDue <= 7).length
    const totalWeekHours = pendingAssignments.reduce((sum, a) => sum + a.estimatedHours, 0)
    const overdue = pendingAssignments.filter((a) => new Date(a.dueDate) < today).length

    // Today's classes from courses
    const courses = (coursesResult.data || []) as Array<{
      id: string
      name: string
      color: string
      schedule: Array<{ day: number; start: string; end: string }>
      instructor: string | null
    }>

    const todayClasses = courses
      .flatMap((c) =>
        (c.schedule || [])
          .filter((s) => s.day === todayDayOfWeek)
          .map((s) => ({
            courseId: c.id,
            courseName: c.name,
            courseColor: c.color,
            instructor: c.instructor,
            startTime: s.start,
            endTime: s.end,
          }))
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime))

    // Get user's first name from email
    const email = profileResult.data?.email || ''
    const name = email.split('@')[0] || 'there'

    return NextResponse.json({
      greeting: name,
      todayEvents,
      todayClasses,
      assignments: pendingAssignments,
      stats: {
        totalPending: pendingAssignments.length,
        dueThisWeek,
        overdue,
        totalWeekHours: +totalWeekHours.toFixed(1),
        completedCount: completedAssignments.length,
        todayEventCount: todayEvents.length,
        todayClassCount: todayClasses.length,
      },
      hasSchedule: !!scheduleResult.data,
    })
  } catch (error) {
    console.error('Today API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
