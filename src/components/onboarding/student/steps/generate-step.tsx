'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pencil, Clock, BookOpen, FileText, Target, Sparkles } from 'lucide-react'
import { StudentOnboardingData, DAYS_OF_WEEK, ASSIGNMENT_TYPES, GOAL_CATEGORIES } from '../types'

interface GenerateStepProps {
  data: StudentOnboardingData
  onGoToStep: (step: number) => void
}

export function GenerateStep({ data, onGoToStep }: GenerateStepProps) {
  // Format sleep schedule display
  const formatSleepSchedule = () => {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number)
      const period = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours % 12 || 12
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
    }
    return `${formatTime(data.sleepStart)} - ${formatTime(data.sleepEnd)}`
  }

  // Format meeting times for a course
  const formatMeetingTimes = (schedule: { day: number; start: string; end: string }[]) => {
    if (schedule.length === 0) return 'No meeting times'

    // Group consecutive days with same times
    const days = schedule.map(s => DAYS_OF_WEEK.find(d => d.value === s.day)?.short || '').join('/')
    const time = schedule[0]
    const formatTime = (t: string) => {
      const [hours, minutes] = t.split(':').map(Number)
      const period = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours % 12 || 12
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
    }
    return `${days} ${formatTime(time.start)} - ${formatTime(time.end)}`
  }

  // Calculate total estimated hours
  const totalHours = data.assignments.reduce((sum, a) => sum + a.estimatedHours, 0)

  // Group assignments by type
  const assignmentsByType = data.assignments.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const typeBreakdown = Object.entries(assignmentsByType)
    .map(([type, count]) => {
      const label = ASSIGNMENT_TYPES.find(t => t.value === type)?.label || type
      return `${count} ${label.toLowerCase()}${count > 1 ? 's' : ''}`
    })
    .join(', ')

  // Calculate total personal goal hours
  const personalGoalHours = data.personalGoals.reduce(
    (sum, g) => sum + (g.timesPerWeek * g.minutesPerSession) / 60,
    0
  )

  return (
    <div className="w-full space-y-6">
      {/* Schedule Settings Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Schedule Settings
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary"
            onClick={() => onGoToStep(0)}
          >
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Timezone</span>
            <span>{data.timezone}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Sleep Schedule</span>
            <span>{formatSleepSchedule()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Classes Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Classes
            <Badge variant="secondary">{data.courses.length}</Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary"
            onClick={() => onGoToStep(1)}
          >
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          {data.courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No classes added</p>
          ) : (
            <ul className="space-y-2">
              {data.courses.map((course) => (
                <li key={course.id} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: course.color }}
                  />
                  <span className="font-medium">{course.name}</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="text-muted-foreground">
                    {formatMeetingTimes(course.schedule)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Assignments Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Assignments
            <Badge variant="secondary">{data.assignments.length}</Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary"
            onClick={() => onGoToStep(2)}
          >
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assignments added</p>
          ) : (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total hours to schedule</span>
                <span>{totalHours.toFixed(1)} hours</span>
              </div>
              {typeBreakdown && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Breakdown</span>
                  <span>{typeBreakdown}</span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Personal Goals Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Target className="w-5 h-5" />
            Personal Goals
            <Badge variant="secondary">{data.personalGoals.length}</Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary"
            onClick={() => onGoToStep(3)}
          >
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          {data.personalGoals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No personal goals added (optional)</p>
          ) : (
            <ul className="space-y-2">
              {data.personalGoals.map((goal) => {
                const categoryInfo = GOAL_CATEGORIES.find(c => c.id === goal.category)
                const hoursPerWeek = (goal.timesPerWeek * goal.minutesPerSession) / 60
                return (
                  <li key={goal.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span>{categoryInfo?.icon || '⭐'}</span>
                      <span>{goal.title}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {hoursPerWeek.toFixed(1)}h/week
                    </span>
                  </li>
                )
              })}
              <li className="flex justify-between text-sm pt-2 border-t">
                <span className="text-muted-foreground">Total personal time</span>
                <span>{personalGoalHours.toFixed(1)} hours/week</span>
              </li>
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Call to Action */}
      <div className="text-center space-y-4 pt-4">
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          We'll create your courses, add your assignments, and generate a study schedule based on your deadlines.
        </p>
        <div className="flex items-center justify-center gap-2 text-primary">
          <Sparkles className="w-5 h-5" />
          <span className="font-medium">Ready to generate your schedule</span>
        </div>
      </div>
    </div>
  )
}
