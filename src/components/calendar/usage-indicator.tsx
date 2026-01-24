'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

// =============================================================================
// TYPES
// =============================================================================

interface UsageData {
  status: 'inactive' | 'trialing' | 'active' | 'canceled' | 'past_due'
  trialDaysRemaining: number | null
  generations: { used: number; limit: number }
  recalibrations: { used: number; limit: number }
  periodEnd: string | null
}

interface UsageIndicatorProps {
  className?: string
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get color based on usage percentage
 * green (<50%), yellow (50-80%), red (>80%)
 */
function getUsageColor(used: number, limit: number): string {
  const percentage = (used / limit) * 100
  if (percentage < 50) return 'bg-green-500'
  if (percentage < 80) return 'bg-yellow-500'
  return 'bg-red-500'
}

/**
 * Get text color based on usage percentage
 */
function getUsageTextColor(used: number, limit: number): string {
  const percentage = (used / limit) * 100
  if (percentage < 50) return 'text-green-600'
  if (percentage < 80) return 'text-yellow-600'
  return 'text-red-600'
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

function UsageSkeleton() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 animate-pulse">
      <div className="h-4 w-4 rounded bg-muted" />
      <div className="h-4 w-16 rounded bg-muted" />
    </div>
  )
}

// =============================================================================
// COMPONENT
// =============================================================================

export function UsageIndicator({ className }: UsageIndicatorProps) {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch usage data on mount
  useEffect(() => {
    async function fetchUsage() {
      try {
        const response = await fetch('/api/usage')
        if (!response.ok) {
          if (response.status === 401) {
            // Not logged in - don't show indicator
            setUsage(null)
            return
          }
          throw new Error('Failed to fetch usage')
        }
        const data = await response.json()
        setUsage(data)
      } catch (err) {
        console.error('Usage fetch error:', err)
        setError('Failed to load usage')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsage()
  }, [])

  // Loading state
  if (isLoading) {
    return <UsageSkeleton />
  }

  // Error state - hide indicator
  if (error || !usage) {
    return null
  }

  // Inactive - show "Start free trial" or nothing
  if (usage.status === 'inactive') {
    return null
  }

  // Trial state
  if (usage.status === 'trialing') {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium',
              'bg-green-50 text-green-700 hover:bg-green-100 transition-colors',
              'border border-green-200',
              className
            )}
          >
            <Activity className="h-4 w-4" />
            <span>Trial ({usage.trialDaysRemaining} days left)</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64">
          <div className="space-y-3">
            <div className="font-medium">Free Trial</div>
            <p className="text-sm text-muted-foreground">
              You have {usage.trialDaysRemaining} days remaining in your free
              trial. Enjoy unlimited access to all features.
            </p>
            <Link
              href="/settings/subscription"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View subscription details
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  // Canceled state
  if (usage.status === 'canceled') {
    return (
      <Link
        href="/settings/subscription"
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium',
          'bg-muted text-muted-foreground hover:bg-muted/80 transition-colors',
          className
        )}
      >
        <Activity className="h-4 w-4" />
        <span>Subscription ended</span>
      </Link>
    )
  }

  // Past due state
  if (usage.status === 'past_due') {
    return (
      <Link
        href="/settings/subscription"
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium',
          'bg-red-50 text-red-700 hover:bg-red-100 transition-colors',
          'border border-red-200',
          className
        )}
      >
        <Activity className="h-4 w-4" />
        <span>Payment issue</span>
      </Link>
    )
  }

  // Active state - show usage
  const genPercent = (usage.generations.used / usage.generations.limit) * 100
  const genColorClass = getUsageColor(
    usage.generations.used,
    usage.generations.limit
  )
  const genTextColorClass = getUsageTextColor(
    usage.generations.used,
    usage.generations.limit
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium',
            'bg-muted hover:bg-muted/80 transition-colors',
            className
          )}
        >
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className={genTextColorClass}>
            {usage.generations.used}/{usage.generations.limit}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="space-y-4">
          <div className="font-medium">Usage This Month</div>

          {/* Schedule Generations */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Schedule Generations</span>
              <span className={genTextColorClass}>
                {usage.generations.used} / {usage.generations.limit}
              </span>
            </div>
            <Progress
              value={genPercent}
              className="h-2"
              style={
                {
                  '--tw-progress-bar-color': genColorClass,
                } as React.CSSProperties
              }
            />
          </div>

          {/* Recalibrations */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Recalibrations</span>
              <span
                className={getUsageTextColor(
                  usage.recalibrations.used,
                  usage.recalibrations.limit
                )}
              >
                {usage.recalibrations.used} / {usage.recalibrations.limit}
              </span>
            </div>
            <Progress
              value={
                (usage.recalibrations.used / usage.recalibrations.limit) * 100
              }
              className="h-2"
            />
          </div>

          {/* Period end */}
          {usage.periodEnd && (
            <p className="text-xs text-muted-foreground">
              Resets on{' '}
              {new Date(usage.periodEnd).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </p>
          )}

          {/* Link to subscription */}
          <Link
            href="/settings/subscription"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Manage subscription
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
