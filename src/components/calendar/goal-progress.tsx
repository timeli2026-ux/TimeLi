'use client'

import { useMemo } from 'react'
import { Progress } from '@/components/ui/progress'
import type { ScheduleEventWithFlexibility } from '@/lib/scheduling/types'
import { REALM_CHART_COLORS } from './realm-pie-chart'
import { cn } from '@/lib/utils'

// =============================================================================
// TYPES
// =============================================================================

interface GoalProgressData {
  goalId: string
  title: string
  realmId: string
  scheduledMinutes: number
  scheduledHours: number
  targetHours?: number
  percentage: number
  color: string
}

interface GoalProgressProps {
  events: ScheduleEventWithFlexibility[]
  className?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

export function GoalProgress({ events, className }: GoalProgressProps) {
  // Calculate scheduled time per goal
  const goalData = useMemo(() => {
    const goalMinutes: Record<string, { minutes: number; title: string; realmId: string }> = {}

    // Sum up minutes per goal
    for (const event of events) {
      if (event.type === 'goal' && event.goalId) {
        if (!goalMinutes[event.goalId]) {
          goalMinutes[event.goalId] = {
            minutes: 0,
            title: event.title,
            realmId: event.realmId || 'default',
          }
        }
        goalMinutes[event.goalId].minutes += event.slot.durationMinutes
      }
    }

    // Convert to display data
    const data: GoalProgressData[] = Object.entries(goalMinutes)
      .map(([goalId, { minutes, title, realmId }]) => {
        const hours = Math.round((minutes / 60) * 10) / 10
        // For now, assume 100% means scheduled = target
        // In the future, we can load actual target hours from goals
        return {
          goalId,
          title,
          realmId,
          scheduledMinutes: minutes,
          scheduledHours: hours,
          percentage: 100, // Placeholder - will be calculated when we have target data
          color: REALM_CHART_COLORS[realmId.toLowerCase()] || REALM_CHART_COLORS.default,
        }
      })
      .sort((a, b) => b.scheduledMinutes - a.scheduledMinutes)

    // Calculate total scheduled hours
    const totalScheduledHours = data.reduce((sum, g) => sum + g.scheduledHours, 0)

    return { goals: data, totalScheduledHours }
  }, [events])

  // If no goals, show empty state
  if (goalData.goals.length === 0) {
    return (
      <div className={className}>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Goal Progress</h3>
        <p className="text-sm text-muted-foreground">No goals scheduled</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">Goal Progress</h3>
        <span className="text-xs text-muted-foreground">
          {goalData.totalScheduledHours}h scheduled
        </span>
      </div>

      <div className="space-y-3">
        {goalData.goals.slice(0, 5).map((goal) => (
          <GoalProgressItem key={goal.goalId} goal={goal} />
        ))}

        {goalData.goals.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            +{goalData.goals.length - 5} more goals
          </p>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// GOAL PROGRESS ITEM
// =============================================================================

interface GoalProgressItemProps {
  goal: GoalProgressData
}

function GoalProgressItem({ goal }: GoalProgressItemProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium truncate max-w-[140px]" title={goal.title}>
          {goal.title}
        </span>
        <span className="text-muted-foreground ml-2 flex-shrink-0">
          {goal.scheduledHours}h
        </span>
      </div>
      <div className="relative">
        <Progress value={goal.percentage} className="h-2" />
        {/* Colored overlay based on realm */}
        <div
          className={cn(
            'absolute inset-0 h-2 rounded-full opacity-80',
            'pointer-events-none'
          )}
          style={{
            width: `${goal.percentage}%`,
            backgroundColor: goal.color,
          }}
        />
      </div>
    </div>
  )
}
