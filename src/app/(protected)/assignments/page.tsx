'use client'

import { useMemo } from 'react'
import { BookOpen, Clock, Calendar, CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAssignments } from '@/lib/hooks/use-assignments'
import type { AssignmentResponse, AssignmentType } from '@/lib/validations/assignments'

// =============================================================================
// HELPERS
// =============================================================================

const typeLabels: Record<AssignmentType, string> = {
  homework: 'Homework',
  exam: 'Exam',
  project: 'Project',
  reading: 'Reading',
  quiz: 'Quiz',
  paper: 'Paper',
  other: 'Other',
}

const typeColors: Record<AssignmentType, string> = {
  homework: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  exam: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  project: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  reading: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  quiz: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  paper: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
}

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'Overdue'
  if (diffDays === 0) return 'Due today'
  if (diffDays === 1) return 'Due tomorrow'
  if (diffDays <= 7) return `Due in ${diffDays} days`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getDueDateColor(dateStr: string, status: string): string {
  if (status === 'completed') return 'text-muted-foreground'
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'text-red-600 dark:text-red-400'
  if (diffDays <= 3) return 'text-orange-600 dark:text-orange-400'
  return 'text-muted-foreground'
}

// =============================================================================
// ASSIGNMENT CARD
// =============================================================================

function AssignmentCard({
  assignment,
  onMarkComplete,
}: {
  assignment: AssignmentResponse
  onMarkComplete: (id: string) => void
}) {
  const isCompleted = assignment.status === 'completed'

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${
        isCompleted ? 'bg-muted/30 opacity-60' : 'bg-card hover:bg-accent/50'
      }`}
    >
      <button
        onClick={() => onMarkComplete(assignment.id)}
        className="mt-0.5 flex-shrink-0"
        disabled={isCompleted}
      >
        {isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
            {assignment.title}
          </h3>
          <Badge variant="secondary" className={typeColors[assignment.type]}>
            {typeLabels[assignment.type]}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
          {assignment.courseName && (
            <span className="text-muted-foreground">
              <BookOpen className="inline h-3.5 w-3.5 mr-1" />
              {assignment.courseName}
            </span>
          )}
          <span className={getDueDateColor(assignment.dueDate, assignment.status)}>
            <Calendar className="inline h-3.5 w-3.5 mr-1" />
            {formatDueDate(assignment.dueDate)}
          </span>
          <span className="text-muted-foreground">
            <Clock className="inline h-3.5 w-3.5 mr-1" />
            {assignment.estimatedHours}h
          </span>
        </div>

        {assignment.notes && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {assignment.notes}
          </p>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function AssignmentsPage() {
  const { assignments, isLoading, error, refetch, markComplete } = useAssignments()

  // Separate assignments by status
  const { pending, completed } = useMemo(() => {
    const pending: AssignmentResponse[] = []
    const completed: AssignmentResponse[] = []

    for (const a of assignments) {
      if (a.status === 'completed') {
        completed.push(a)
      } else {
        pending.push(a)
      }
    }

    return { pending, completed }
  }, [assignments])

  // Summary stats
  const stats = useMemo(() => {
    const totalHours = pending.reduce((sum, a) => sum + a.estimatedHours, 0)
    const overdue = pending.filter(a => new Date(a.dueDate) < new Date()).length
    const dueThisWeek = pending.filter(a => {
      const due = new Date(a.dueDate)
      const now = new Date()
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      return due >= now && due <= weekFromNow
    }).length

    return { totalHours, overdue, dueThisWeek, completed: completed.length }
  }, [pending, completed])

  const handleMarkComplete = async (id: string) => {
    const result = await markComplete(id)
    if (result) {
      toast.success('Assignment marked as complete')
    } else {
      toast.error('Failed to update assignment')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={refetch} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          Assignments
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your coursework and deadlines
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold">{pending.length}</div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold">{stats.dueThisWeek}</div>
            <p className="text-sm text-muted-foreground">Due this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className={`text-2xl font-semibold ${stats.overdue > 0 ? 'text-red-600' : ''}`}>
              {stats.overdue}
            </div>
            <p className="text-sm text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-semibold">{stats.totalHours.toFixed(1)}h</div>
            <p className="text-sm text-muted-foreground">Remaining work</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming</CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No pending assignments. Great job!
            </p>
          ) : (
            <div className="space-y-3">
              {pending.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  onMarkComplete={handleMarkComplete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Assignments */}
      {completed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Completed ({completed.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completed.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  onMarkComplete={handleMarkComplete}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
