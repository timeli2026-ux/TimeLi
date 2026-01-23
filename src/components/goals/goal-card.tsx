'use client'

import { Brain, Calendar, Clock, Edit, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { GoalResponse, CognitiveLoad } from '@/lib/validations/goals'
import { cn } from '@/lib/utils'
import { REALM_COLORS } from '@/components/calendar/calendar-event'

// =============================================================================
// TYPES
// =============================================================================

interface GoalCardProps {
  goal: GoalResponse
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
}

// =============================================================================
// COGNITIVE LOAD STYLES
// =============================================================================

const COGNITIVE_LOAD_STYLES: Record<CognitiveLoad, { color: string; label: string }> = {
  high: { color: 'text-red-500', label: 'High' },
  medium: { color: 'text-yellow-500', label: 'Medium' },
  low: { color: 'text-green-500', label: 'Low' },
}

// =============================================================================
// INTENSITY DISPLAY
// =============================================================================

function IntensityDots({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            i <= level ? 'bg-primary' : 'bg-muted-foreground/30'
          )}
        />
      ))}
    </div>
  )
}

// =============================================================================
// REALM BADGE COLORS
// =============================================================================

const REALM_BADGE_COLORS: Record<string, string> = {
  health: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  career: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  learning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  relationships: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  creativity: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  finance: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  personal: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  spiritual: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  default: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
}

function getRealmBadgeColor(realmName?: string): string {
  if (!realmName) return REALM_BADGE_COLORS.default
  const key = realmName.toLowerCase()
  return REALM_BADGE_COLORS[key] || REALM_BADGE_COLORS.default
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * GoalCard - Displays a single goal with stats and actions
 */
export function GoalCard({ goal, onEdit, onArchive, onDelete }: GoalCardProps) {
  const isArchived = !goal.isActive
  const cognitiveStyle = COGNITIVE_LOAD_STYLES[goal.cognitiveLoad || 'medium']

  // Format deadline date
  const formatDeadline = (deadline: string | null | undefined): string | null => {
    if (!deadline) return null
    try {
      const date = new Date(deadline)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      })
    } catch {
      return null
    }
  }

  const deadlineDisplay = formatDeadline(goal.deadline)

  return (
    <Card
      className={cn(
        'relative transition-all hover:shadow-md',
        isArchived && 'opacity-60 bg-muted/30'
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className={cn('text-base leading-tight', isArchived && 'line-through')}>
            {goal.title}
          </CardTitle>
          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onEdit}
              aria-label="Edit goal"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onArchive}
              aria-label={isArchived ? 'Restore goal' : 'Archive goal'}
            >
              {isArchived ? (
                <ArchiveRestore className="h-3.5 w-3.5" />
              ) : (
                <Archive className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              onClick={onDelete}
              aria-label="Delete goal"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Stats Row */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {/* Hours per week */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{goal.hoursPerWeek}h/wk</span>
          </div>

          {/* Intensity dots */}
          <div className="flex items-center gap-1" title={`Intensity: ${goal.intensityLevel}/5`}>
            <IntensityDots level={goal.intensityLevel || 3} />
          </div>
        </div>

        {/* Badges Row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Realm Badge */}
          {goal.realmName && (
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                getRealmBadgeColor(goal.realmName)
              )}
            >
              {goal.realmName}
            </span>
          )}

          {/* Cognitive Load */}
          <div
            className="flex items-center gap-1 text-xs"
            title={`Cognitive load: ${cognitiveStyle.label}`}
          >
            <Brain className={cn('h-3.5 w-3.5', cognitiveStyle.color)} />
            <span className={cognitiveStyle.color}>{cognitiveStyle.label}</span>
          </div>

          {/* Deep Work Badge */}
          {goal.requiresDeepWork && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              Deep Work
            </span>
          )}
        </div>

        {/* Deadline Badge */}
        {deadlineDisplay && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              Due: {deadlineDisplay}
              {goal.deadlineType && goal.deadlineType !== 'none' && (
                <span className={cn(
                  'ml-1',
                  goal.deadlineType === 'hard' ? 'text-red-500' : 'text-yellow-500'
                )}>
                  ({goal.deadlineType})
                </span>
              )}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
