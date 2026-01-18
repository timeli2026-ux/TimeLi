'use client'

import { useMemo } from 'react'
import { BarChart3, Clock, Target, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { RealmPieChart } from './realm-pie-chart'
import { GoalProgress } from './goal-progress'
import type { ScheduleEventWithFlexibility, SchedulerStats } from '@/lib/scheduling/types'
import { cn } from '@/lib/utils'

// =============================================================================
// TYPES
// =============================================================================

interface DashboardSidebarProps {
  events: ScheduleEventWithFlexibility[]
  stats?: SchedulerStats
  className?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

export function DashboardSidebar({ events, stats, className }: DashboardSidebarProps) {
  // Calculate summary stats from events
  const summaryStats = useMemo(() => {
    let goalMinutes = 0
    let totalMinutes = 0
    let deepWorkMinutes = 0
    const uniqueGoals = new Set<string>()

    for (const event of events) {
      totalMinutes += event.slot.durationMinutes

      if (event.type === 'goal') {
        goalMinutes += event.slot.durationMinutes
        if (event.goalId) {
          uniqueGoals.add(event.goalId)
        }
        // Check for deep work (high cognitive load or requires deep work)
        if (event.cognitiveLoad === 'high') {
          deepWorkMinutes += event.slot.durationMinutes
        }
      }
    }

    return {
      goalHours: Math.round((goalMinutes / 60) * 10) / 10,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      deepWorkHours: Math.round((deepWorkMinutes / 60) * 10) / 10,
      goalCount: uniqueGoals.size,
      utilizationPercent: stats?.utilizationPercent ?? 0,
    }
  }, [events, stats])

  return (
    <div className={cn('w-64 flex flex-col gap-4 p-4 border-r bg-muted/30', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="font-semibold">Dashboard</h2>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Goal Hours"
          value={`${summaryStats.goalHours}h`}
        />
        <StatCard
          icon={<Target className="h-4 w-4" />}
          label="Goals"
          value={`${summaryStats.goalCount}`}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Deep Work"
          value={`${summaryStats.deepWorkHours}h`}
        />
        <StatCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="Utilization"
          value={`${Math.round(summaryStats.utilizationPercent)}%`}
        />
      </div>

      <Separator />

      {/* Realm Pie Chart */}
      <RealmPieChart events={events} />

      <Separator />

      {/* Goal Progress */}
      <GoalProgress events={events} className="flex-1 overflow-auto" />
    </div>
  )
}

// =============================================================================
// STAT CARD
// =============================================================================

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <Card className="p-2">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-lg font-semibold">{value}</p>
    </Card>
  )
}
