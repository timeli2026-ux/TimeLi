'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import type { ScheduleEventWithFlexibility } from '@/lib/scheduling/types'

// =============================================================================
// REALM COLOR MAPPING (matches calendar-event.tsx)
// =============================================================================

const REALM_CHART_COLORS: Record<string, string> = {
  default: '#3b82f6', // blue-500
  health: '#22c55e', // green-500
  career: '#a855f7', // purple-500
  learning: '#f59e0b', // amber-500
  relationships: '#ec4899', // pink-500
  creativity: '#f97316', // orange-500
  finance: '#10b981', // emerald-500
  personal: '#06b6d4', // cyan-500
  spiritual: '#8b5cf6', // violet-500
}

// =============================================================================
// TYPES
// =============================================================================

interface RealmData {
  name: string
  minutes: number
  hours: number
  color: string
  percentage: number
  [key: string]: string | number // Index signature for recharts compatibility
}

interface RealmPieChartProps {
  events: ScheduleEventWithFlexibility[]
  className?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

export function RealmPieChart({ events, className }: RealmPieChartProps) {
  // Calculate time per realm from events
  const realmData = useMemo(() => {
    const realmMinutes: Record<string, number> = {}

    // Sum up minutes per realm (only goal events have realms)
    // Use realmName if available, otherwise skip UUID-based grouping
    for (const event of events) {
      if (event.type === 'goal' && event.realmName) {
        const realmKey = event.realmName.toLowerCase()
        realmMinutes[realmKey] = (realmMinutes[realmKey] || 0) + event.slot.durationMinutes
      }
    }

    // Calculate total for percentages
    const totalMinutes = Object.values(realmMinutes).reduce((sum, min) => sum + min, 0)

    // Convert to chart data
    const data: RealmData[] = Object.entries(realmMinutes)
      .map(([realm, minutes]) => ({
        name: realm.charAt(0).toUpperCase() + realm.slice(1),
        minutes,
        hours: Math.round((minutes / 60) * 10) / 10,
        color: REALM_CHART_COLORS[realm] || REALM_CHART_COLORS.default,
        percentage: totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0,
      }))
      .sort((a, b) => b.minutes - a.minutes)

    return { data, totalMinutes, totalHours: Math.round((totalMinutes / 60) * 10) / 10 }
  }, [events])

  // If no realm data, show empty state
  if (realmData.data.length === 0) {
    return (
      <div className={className}>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Time by Realm</h3>
        <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
          No scheduled activities
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">Time by Realm</h3>
        <span className="text-xs text-muted-foreground">{realmData.totalHours}h total</span>
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={realmData.data}
              cx="50%"
              cy="45%"
              innerRadius={35}
              outerRadius={55}
              paddingAngle={2}
              dataKey="minutes"
              nameKey="name"
            >
              {realmData.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const data = payload[0].payload as RealmData
                return (
                  <div className="bg-popover border rounded-md shadow-md px-3 py-2 text-sm">
                    <p className="font-medium">{data.name}</p>
                    <p className="text-muted-foreground">
                      {data.hours}h ({data.percentage}%)
                    </p>
                  </div>
                )
              }}
            />
            <Legend
              layout="horizontal"
              align="center"
              verticalAlign="bottom"
              iconSize={8}
              iconType="circle"
              wrapperStyle={{ paddingTop: '8px' }}
              formatter={(value: string) => (
                <span className="text-xs text-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export { REALM_CHART_COLORS }
