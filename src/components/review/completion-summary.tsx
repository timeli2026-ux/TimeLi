'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { CheckCircle2, Clock, MinusCircle, XCircle } from 'lucide-react'

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

interface CompletionSummaryProps {
  stats: ReviewStats
  completionsByRealm: RealmCompletion[]
  productiveTimes: ProductiveTime[]
}

// =============================================================================
// REALM COLORS (matching calendar)
// =============================================================================

const REALM_COLORS: Record<string, string> = {
  default: '#3b82f6',
  health: '#22c55e',
  career: '#a855f7',
  learning: '#f59e0b',
  relationships: '#ec4899',
  creativity: '#f97316',
  finance: '#10b981',
  personal: '#06b6d4',
  spiritual: '#8b5cf6',
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CompletionSummary({
  stats,
  completionsByRealm,
  productiveTimes
}: CompletionSummaryProps) {
  return (
    <div className="space-y-6">
      {/* Main completion rate */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Completion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            {/* Large percentage display */}
            <div className="flex-shrink-0">
              <div className={cn(
                'text-5xl font-bold',
                stats.completionRate >= 80 ? 'text-green-500' :
                stats.completionRate >= 50 ? 'text-yellow-500' : 'text-red-500'
              )}>
                {stats.completionRate}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                completion rate
              </div>
            </div>

            {/* Breakdown */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">{stats.completed}</span>
                <span className="text-sm text-muted-foreground">completed</span>
              </div>
              <div className="flex items-center gap-3">
                <MinusCircle className="h-5 w-5 text-yellow-500" />
                <span className="text-sm font-medium">{stats.partial}</span>
                <span className="text-sm text-muted-foreground">partial</span>
              </div>
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium">{stats.skipped}</span>
                <span className="text-sm text-muted-foreground">skipped</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6">
            <Progress value={stats.completionRate} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>0%</span>
              <span>{stats.totalScheduled} events total</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two column layout for realm breakdown and productive times */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Completions by realm */}
        <Card>
          <CardHeader>
            <CardTitle>By Realm</CardTitle>
          </CardHeader>
          <CardContent>
            {completionsByRealm.length === 0 ? (
              <p className="text-sm text-muted-foreground">No realm data available</p>
            ) : (
              <div className="space-y-4">
                {completionsByRealm.map((realm) => (
                  <RealmProgressBar key={realm.realmId} realm={realm} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most productive times */}
        <Card>
          <CardHeader>
            <CardTitle>Most Productive Times</CardTitle>
          </CardHeader>
          <CardContent>
            {productiveTimes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Complete more events to see your productive times
              </p>
            ) : (
              <div className="space-y-4">
                {productiveTimes.map((time, index) => (
                  <div key={time.hour} className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                      index === 0 ? 'bg-primary text-primary-foreground' :
                      index === 1 ? 'bg-primary/70 text-primary-foreground' :
                      'bg-primary/40 text-primary-foreground'
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{time.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {time.count} event{time.count !== 1 ? 's' : ''} completed
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// =============================================================================
// REALM PROGRESS BAR
// =============================================================================

interface RealmProgressBarProps {
  realm: RealmCompletion
}

function RealmProgressBar({ realm }: RealmProgressBarProps) {
  const color = REALM_COLORS[realm.realmName.toLowerCase()] || REALM_COLORS.default

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium capitalize">{realm.realmName}</span>
        <span className="text-muted-foreground">
          {realm.completed}/{realm.total} ({realm.completionRate}%)
        </span>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute inset-0 h-full rounded-full transition-all"
          style={{
            width: `${realm.completionRate}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  )
}
