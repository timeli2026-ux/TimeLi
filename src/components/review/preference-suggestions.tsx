'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Lightbulb, X, Check, TrendingUp, TrendingDown, Clock } from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

interface RealmCompletion {
  realmId: string
  realmName: string
  completed: number
  skipped: number
  partial: number
  total: number
  completionRate: number
}

interface ProductiveTime {
  hour: number
  label: string
  count: number
}

interface ReviewStats {
  totalScheduled: number
  completed: number
  skipped: number
  partial: number
  completionRate: number
}

interface Suggestion {
  id: string
  type: 'productivity' | 'reduction' | 'timing'
  icon: typeof Lightbulb
  title: string
  description: string
  action?: string
}

interface PreferenceSuggestionsProps {
  stats: ReviewStats
  completionsByRealm: RealmCompletion[]
  productiveTimes: ProductiveTime[]
}

// =============================================================================
// HELPERS
// =============================================================================

function generateSuggestions(
  stats: ReviewStats,
  completionsByRealm: RealmCompletion[],
  productiveTimes: ProductiveTime[]
): Suggestion[] {
  const suggestions: Suggestion[] = []

  // Productive time suggestion
  if (productiveTimes.length > 0 && productiveTimes[0].count >= 2) {
    const topTime = productiveTimes[0]
    const period = topTime.hour < 12 ? 'morning' : topTime.hour < 17 ? 'afternoon' : 'evening'

    suggestions.push({
      id: 'productive-time',
      type: 'productivity',
      icon: TrendingUp,
      title: `You're most productive in the ${period}`,
      description: `You completed ${topTime.count} events at ${topTime.label}. Consider scheduling important tasks during this time.`,
      action: `Schedule deep work at ${topTime.label}`
    })
  }

  // Low completion realm suggestion
  const lowCompletionRealms = completionsByRealm.filter(r => r.completionRate < 50 && r.total >= 2)
  if (lowCompletionRealms.length > 0) {
    const lowestRealm = lowCompletionRealms.sort((a, b) => a.completionRate - b.completionRate)[0]

    suggestions.push({
      id: `reduce-${lowestRealm.realmId}`,
      type: 'reduction',
      icon: TrendingDown,
      title: `Consider reducing ${lowestRealm.realmName} goals`,
      description: `You completed only ${lowestRealm.completionRate}% of ${lowestRealm.realmName} events. You might be over-committing in this area.`,
      action: `Review ${lowestRealm.realmName} goals`
    })
  }

  // High skip rate at certain times - analyze patterns
  if (stats.skipped > 0 && stats.skipped >= stats.totalScheduled * 0.3) {
    suggestions.push({
      id: 'high-skip-rate',
      type: 'timing',
      icon: Clock,
      title: 'Review your scheduling',
      description: `You skipped ${stats.skipped} events this week (${Math.round((stats.skipped / stats.totalScheduled) * 100)}%). Consider if your schedule is realistic.`,
      action: 'Reduce weekly commitments'
    })
  }

  // Overall good performance
  if (stats.completionRate >= 80 && suggestions.length === 0) {
    suggestions.push({
      id: 'great-week',
      type: 'productivity',
      icon: TrendingUp,
      title: 'Great week!',
      description: `You completed ${stats.completionRate}% of your scheduled events. Keep up the momentum!`,
    })
  }

  // If very few completions, encourage
  if (stats.totalScheduled > 0 && stats.completed === 0) {
    suggestions.push({
      id: 'get-started',
      type: 'productivity',
      icon: Lightbulb,
      title: 'Ready to build momentum?',
      description: 'Start with your smallest, easiest task. Completing one thing creates energy for the next.',
    })
  }

  return suggestions
}

// =============================================================================
// COMPONENT
// =============================================================================

export function PreferenceSuggestions({
  stats,
  completionsByRealm,
  productiveTimes
}: PreferenceSuggestionsProps) {
  const allSuggestions = generateSuggestions(stats, completionsByRealm, productiveTimes)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  const suggestions = allSuggestions.filter(s => !dismissedIds.has(s.id))

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]))
  }

  const handleConfirm = (id: string) => {
    // For now, just dismiss - future enhancement: save as preference
    setDismissedIds(prev => new Set([...prev, id]))
  }

  if (suggestions.length === 0 && allSuggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Complete more events to get personalized insights about your productivity patterns.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All suggestions reviewed. Check back next week for new insights!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Insights & Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onDismiss={() => handleDismiss(suggestion.id)}
              onConfirm={() => handleConfirm(suggestion.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// SUGGESTION CARD
// =============================================================================

interface SuggestionCardProps {
  suggestion: Suggestion
  onDismiss: () => void
  onConfirm: () => void
}

function SuggestionCard({ suggestion, onDismiss, onConfirm }: SuggestionCardProps) {
  const Icon = suggestion.icon

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border">
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-medium">{suggestion.title}</h4>
          <Badge variant="outline" className="text-xs">
            {suggestion.type === 'productivity' ? 'Productivity' :
             suggestion.type === 'reduction' ? 'Balance' : 'Timing'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{suggestion.description}</p>
        {suggestion.action && (
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={onConfirm}
            >
              <Check className="h-3 w-3 mr-1" />
              {suggestion.action}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={onDismiss}
            >
              <X className="h-3 w-3 mr-1" />
              Dismiss
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
