'use client'

import { useState, useEffect, useCallback } from 'react'

export interface TodayEvent {
  id: string
  type: string
  title: string
  slot: {
    dayOfWeek: number
    startTime: string
    endTime: string
    durationMinutes: number
  }
  goalId?: string
  realmId?: string
  isLocked: boolean
  rationale?: unknown
}

export interface TodayClass {
  courseId: string
  courseName: string
  courseColor: string
  instructor: string | null
  startTime: string
  endTime: string
}

export interface TodayAssignment {
  id: string
  title: string
  type: string
  dueDate: string
  estimatedHours: number
  status: string
  priority: string
  notes: string | null
  courseId: string | null
  courseName: string | null
  courseColor: string | null
  urgency: number
  daysUntilDue: number
}

export interface TodayStats {
  totalPending: number
  dueThisWeek: number
  overdue: number
  totalWeekHours: number
  completedCount: number
  todayEventCount: number
  todayClassCount: number
}

export interface TodayData {
  greeting: string
  todayEvents: TodayEvent[]
  todayClasses: TodayClass[]
  assignments: TodayAssignment[]
  stats: TodayStats
  hasSchedule: boolean
}

export function useToday() {
  const [data, setData] = useState<TodayData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchToday = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/today')
      if (!response.ok) {
        throw new Error('Failed to load today data')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchToday()
  }, [fetchToday])

  const regenerateSchedule = useCallback(async () => {
    try {
      const response = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to regenerate schedule')
      }
      // Refresh today data after regeneration
      await fetchToday()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate')
      return false
    }
  }, [fetchToday])

  const markAssignmentComplete = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/assignments/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        })
        if (!response.ok) throw new Error('Failed to update assignment')
        // Update local state
        setData((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            assignments: prev.assignments.filter((a) => a.id !== id),
            stats: {
              ...prev.stats,
              totalPending: prev.stats.totalPending - 1,
              completedCount: prev.stats.completedCount + 1,
            },
          }
        })
        return true
      } catch {
        return false
      }
    },
    []
  )

  return {
    data,
    isLoading,
    error,
    refetch: fetchToday,
    regenerateSchedule,
    markAssignmentComplete,
  }
}
