'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Clock,
  BookOpen,
  Calendar,
  CheckCircle2,
  Circle,
  RefreshCw,
  ArrowRight,
  AlertTriangle,
  Loader2,
  GraduationCap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  useToday,
  type TodayEvent,
  type TodayClass,
  type TodayAssignment,
} from '@/lib/hooks/use-today'

// =============================================================================
// HELPERS
// =============================================================================

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (diffDays < 0) return 'Overdue'
  if (diffDays === 0) return 'Due today'
  if (diffDays === 1) return 'Due tomorrow'
  if (diffDays <= 7) return `Due in ${diffDays} days`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getDueDateUrgencyColor(daysUntilDue: number): string {
  if (daysUntilDue <= 0) return 'text-red-600 dark:text-red-400'
  if (daysUntilDue <= 2) return 'text-orange-600 dark:text-orange-400'
  if (daysUntilDue <= 5) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-muted-foreground'
}

const typeLabels: Record<string, string> = {
  homework: 'HW',
  exam: 'Exam',
  project: 'Project',
  reading: 'Reading',
  quiz: 'Quiz',
  paper: 'Paper',
  other: 'Task',
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function ScheduleTimeline({
  events,
  classes,
}: {
  events: TodayEvent[]
  classes: TodayClass[]
}) {
  // Merge classes and study events into a unified timeline
  type TimelineItem = {
    id: string
    title: string
    startTime: string
    endTime: string
    type: 'class' | 'study' | 'goal' | 'other'
    color?: string
    isLocked: boolean
  }

  const timeline: TimelineItem[] = [
    ...classes.map((c) => ({
      id: `class-${c.courseId}-${c.startTime}`,
      title: c.courseName,
      startTime: c.startTime,
      endTime: c.endTime,
      type: 'class' as const,
      color: c.courseColor,
      isLocked: true,
    })),
    ...events
      .filter(
        (e) => e.type === 'goal' && !e.isLocked
      )
      .map((e) => ({
        id: e.id,
        title: e.title,
        startTime: e.slot.startTime,
        endTime: e.slot.endTime,
        type: 'study' as const,
        isLocked: false,
      })),
    ...events
      .filter(
        (e) => e.type !== 'goal' && e.type !== 'fixed' && e.type !== 'sleep'
      )
      .map((e) => ({
        id: e.id,
        title: e.title,
        startTime: e.slot.startTime,
        endTime: e.slot.endTime,
        type: 'other' as const,
        isLocked: e.isLocked,
      })),
  ].sort((a, b) => a.startTime.localeCompare(b.startTime))

  if (timeline.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No scheduled events today. Enjoy your free time!
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {timeline.map((item) => (
        <div
          key={item.id}
          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
            item.type === 'class'
              ? 'bg-primary/5 border-primary/20'
              : 'bg-card hover:bg-accent/50'
          }`}
        >
          <div className="flex-shrink-0 w-20 text-right">
            <span className="text-sm font-medium">
              {formatTime(item.startTime)}
            </span>
          </div>
          <div
            className="w-1 h-10 rounded-full flex-shrink-0"
            style={{
              backgroundColor:
                item.color ||
                (item.type === 'class'
                  ? 'var(--primary)'
                  : item.type === 'study'
                  ? '#3B82F6'
                  : '#6B7280'),
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{item.title}</p>
            <p className="text-xs text-muted-foreground">
              {formatTime(item.startTime)} - {formatTime(item.endTime)}
            </p>
          </div>
          <Badge
            variant="secondary"
            className={`flex-shrink-0 text-xs ${
              item.type === 'class'
                ? 'bg-primary/10 text-primary'
                : item.type === 'study'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : ''
            }`}
          >
            {item.type === 'class'
              ? 'Class'
              : item.type === 'study'
              ? 'Study'
              : item.title.length > 10
              ? 'Activity'
              : ''}
          </Badge>
        </div>
      ))}
    </div>
  )
}

function UrgentAssignmentCard({
  assignment,
  onMarkComplete,
}: {
  assignment: TodayAssignment
  onMarkComplete: (id: string) => void
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <button
        onClick={() => onMarkComplete(assignment.id)}
        className="mt-0.5 flex-shrink-0"
      >
        <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm">{assignment.title}</h4>
          <Badge variant="outline" className="flex-shrink-0 text-xs">
            {typeLabels[assignment.type] || assignment.type}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
          {assignment.courseName && (
            <span className="text-muted-foreground flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {assignment.courseName}
            </span>
          )}
          <span
            className={`flex items-center gap-1 ${getDueDateUrgencyColor(
              assignment.daysUntilDue
            )}`}
          >
            <Calendar className="h-3 w-3" />
            {formatDueDate(assignment.dueDate)}
          </span>
          <span className="text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {assignment.estimatedHours}h estimated
          </span>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

function TodayViewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-64 bg-muted rounded" />
        <div className="h-5 w-48 bg-muted rounded" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded-lg" />
        ))}
      </div>
      <div className="h-64 bg-muted rounded-lg" />
      <div className="h-48 bg-muted rounded-lg" />
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TodayView() {
  const { data, isLoading, error, refetch, regenerateSchedule, markAssignmentComplete } =
    useToday()
  const [isRegenerating, setIsRegenerating] = useState(false)

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    const success = await regenerateSchedule()
    if (success) {
      toast.success('Schedule regenerated')
    } else {
      toast.error('Failed to regenerate schedule')
    }
    setIsRegenerating(false)
  }

  const handleMarkComplete = async (id: string) => {
    const success = await markAssignmentComplete(id)
    if (success) {
      toast.success('Assignment completed!')
    } else {
      toast.error('Failed to update assignment')
    }
  }

  if (isLoading) return <TodayViewSkeleton />

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground mb-4" />
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={refetch} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  if (!data) return null

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const urgentAssignments = data.assignments.slice(0, 5)
  const hasMoreAssignments = data.assignments.length > 5

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {getGreeting()}, {data.greeting}
        </h1>
        <p className="text-muted-foreground">{dateStr}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-semibold">
              {data.stats.todayClassCount + data.stats.todayEventCount}
            </div>
            <p className="text-xs text-muted-foreground">Today's events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-semibold">
              {data.stats.dueThisWeek}
            </div>
            <p className="text-xs text-muted-foreground">Due this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div
              className={`text-2xl font-semibold ${
                data.stats.overdue > 0 ? 'text-red-600' : ''
              }`}
            >
              {data.stats.overdue}
            </div>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-semibold">
              {data.stats.totalWeekHours}h
            </div>
            <p className="text-xs text-muted-foreground">Work remaining</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today's Schedule
          </CardTitle>
          <Link
            href="/calendar"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            See full week
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {!data.hasSchedule ? (
            <div className="text-center py-6">
              <GraduationCap className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                No schedule generated yet. Generate one to see your day planned
                out.
              </p>
              <Button onClick={handleRegenerate} disabled={isRegenerating}>
                {isRegenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Schedule'
                )}
              </Button>
            </div>
          ) : (
            <ScheduleTimeline
              events={data.todayEvents}
              classes={data.todayClasses}
            />
          )}
        </CardContent>
      </Card>

      {/* Urgent Assignments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Urgent Work
            {data.stats.totalPending > 0 && (
              <Badge variant="secondary">{data.stats.totalPending}</Badge>
            )}
          </CardTitle>
          <Link
            href="/assignments"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {urgentAssignments.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-8 w-8 mx-auto text-green-600 mb-3" />
              <p className="text-sm text-muted-foreground">
                All caught up! No pending assignments.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {urgentAssignments.map((assignment) => (
                <UrgentAssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  onMarkComplete={handleMarkComplete}
                />
              ))}
              {hasMoreAssignments && (
                <Link
                  href="/assignments"
                  className="block text-center text-sm text-primary hover:underline pt-2"
                >
                  +{data.assignments.length - 5} more assignments
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* This Week Summary + Regenerate */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            This Week
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total work</span>
              <p className="font-semibold">{data.stats.totalWeekHours} hours</p>
            </div>
            <div>
              <span className="text-muted-foreground">Assignments</span>
              <p className="font-semibold">
                {data.stats.completedCount} / {data.stats.completedCount + data.stats.totalPending} completed
              </p>
            </div>
          </div>

          {data.hasSchedule && (
            <Button
              variant="outline"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="w-full"
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate Schedule
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
