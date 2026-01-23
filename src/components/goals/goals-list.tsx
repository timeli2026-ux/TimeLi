'use client'

import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import type { GoalResponse } from '@/lib/validations/goals'
import { GoalCard } from './goal-card'
import { cn } from '@/lib/utils'

// =============================================================================
// REALM ICONS
// =============================================================================

const REALM_ICONS: Record<string, string> = {
  health: '💪',
  career: '💼',
  learning: '📚',
  relationships: '❤️',
  creativity: '🎨',
  finance: '💰',
  personal: '🌟',
  spiritual: '🧘',
  default: '🎯',
}

// =============================================================================
// TYPES
// =============================================================================

interface GoalsListProps {
  goals: GoalResponse[]
  isLoading: boolean
  showArchived: boolean
  onEditGoal: (goal: GoalResponse) => void
  onArchiveGoal: (id: string) => void
  onDeleteGoal: (id: string) => void
  className?: string
}

interface GoalsByRealm {
  realmId: string
  realmName: string
  goals: GoalResponse[]
  totalHours: number
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * GoalsList - Container component that groups goals by realm
 */
export function GoalsList({
  goals,
  isLoading,
  showArchived,
  onEditGoal,
  onArchiveGoal,
  onDeleteGoal,
  className,
}: GoalsListProps) {
  // Filter goals based on archived toggle
  const filteredGoals = useMemo(() => {
    if (showArchived) return goals
    return goals.filter(g => g.isActive)
  }, [goals, showArchived])

  // Group goals by realm
  const goalsByRealm = useMemo((): GoalsByRealm[] => {
    const groups = new Map<string, GoalsByRealm>()

    for (const goal of filteredGoals) {
      const realmId = goal.realmId || 'unknown'
      const realmName = goal.realmName || 'Unknown'

      if (!groups.has(realmId)) {
        groups.set(realmId, {
          realmId,
          realmName,
          goals: [],
          totalHours: 0,
        })
      }

      const group = groups.get(realmId)!
      group.goals.push(goal)
      group.totalHours += goal.hoursPerWeek || 0
    }

    // Convert to array and sort by realm name
    return Array.from(groups.values()).sort((a, b) =>
      a.realmName.localeCompare(b.realmName)
    )
  }, [filteredGoals])

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('w-full', className)}>
        {/* Skeleton cards */}
        <div className="space-y-6">
          {[1, 2].map(i => (
            <div key={i} className="space-y-3">
              {/* Realm header skeleton */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-muted animate-pulse" />
                <div className="h-5 w-32 rounded bg-muted animate-pulse" />
              </div>
              {/* Goal cards skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(j => (
                  <div
                    key={j}
                    className="h-32 rounded-lg border bg-card animate-pulse"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Empty state
  if (filteredGoals.length === 0) {
    return (
      <div className={cn('w-full', className)}>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-4">🎯</div>
          <h3 className="text-lg font-medium mb-2">No goals yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Add your first goal to start scheduling your time effectively.
          </p>
        </div>
      </div>
    )
  }

  // Get realm icon
  const getRealmIcon = (realmName: string): string => {
    const key = realmName.toLowerCase()
    return REALM_ICONS[key] || REALM_ICONS.default
  }

  return (
    <div className={cn('w-full space-y-8', className)}>
      {goalsByRealm.map(({ realmId, realmName, goals: realmGoals, totalHours }) => (
        <div key={realmId} className="space-y-4">
          {/* Realm Header */}
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl" role="img" aria-hidden="true">
                {getRealmIcon(realmName)}
              </span>
              <h3 className="text-lg font-semibold">{realmName}</h3>
              <span className="text-sm text-muted-foreground">
                ({realmGoals.length} goal{realmGoals.length !== 1 ? 's' : ''})
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {totalHours.toFixed(1)} hrs/week
            </div>
          </div>

          {/* Goals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {realmGoals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={() => onEditGoal(goal)}
                onArchive={() => onArchiveGoal(goal.id)}
                onDelete={() => onDeleteGoal(goal.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
