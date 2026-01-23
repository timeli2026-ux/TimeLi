'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { GoalResponse, GoalFormData, GoalUpdateData } from '@/lib/validations/goals'

// =============================================================================
// TYPES
// =============================================================================

interface UseGoalsReturn {
  goals: GoalResponse[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  createGoal: (data: GoalFormData) => Promise<GoalResponse | null>
  updateGoal: (id: string, data: GoalUpdateData) => Promise<GoalResponse | null>
  deleteGoal: (id: string) => Promise<boolean>
  archiveGoal: (id: string) => Promise<GoalResponse | null>
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Custom hook for goals CRUD operations
 * Fetches goals on mount and provides mutation functions
 */
export function useGoals(): UseGoalsReturn {
  const [goals, setGoals] = useState<GoalResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasMigrated = useRef(false)

  // Fetch all goals
  const fetchGoals = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/goals')

      if (!response.ok) {
        if (response.status === 401) {
          setError('Please log in to view your goals')
        } else {
          setError('Failed to fetch goals')
        }
        setGoals([])
        return
      }

      const data = await response.json()
      setGoals(data.goals || [])

      // Handle migration: if goals empty and haven't migrated yet, call migrate endpoint
      if ((data.goals || []).length === 0 && !hasMigrated.current) {
        hasMigrated.current = true
        try {
          const migrateResponse = await fetch('/api/goals/migrate', {
            method: 'POST',
          })

          if (migrateResponse.ok) {
            // Refetch after migration
            const refetchResponse = await fetch('/api/goals')
            if (refetchResponse.ok) {
              const refetchData = await refetchResponse.json()
              setGoals(refetchData.goals || [])
            }
          }
        } catch {
          // Migration is optional, don't fail on error
          console.log('Migration not needed or failed')
        }
      }
    } catch {
      setError('Network error - please try again')
      setGoals([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch on mount
  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  // Create a new goal
  const createGoal = useCallback(async (data: GoalFormData): Promise<GoalResponse | null> => {
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create goal')
      }

      const result = await response.json()
      const newGoal = result.goal as GoalResponse

      // Add to local state
      setGoals(prev => [newGoal, ...prev])

      return newGoal
    } catch (err) {
      console.error('Create goal error:', err)
      return null
    }
  }, [])

  // Update an existing goal
  const updateGoal = useCallback(async (id: string, data: GoalUpdateData): Promise<GoalResponse | null> => {
    try {
      const response = await fetch(`/api/goals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update goal')
      }

      const result = await response.json()
      const updatedGoal = result.goal as GoalResponse

      // Update in local state
      setGoals(prev => prev.map(g => g.id === id ? updatedGoal : g))

      return updatedGoal
    } catch (err) {
      console.error('Update goal error:', err)
      return null
    }
  }, [])

  // Delete a goal
  const deleteGoal = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/goals/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete goal')
      }

      // Remove from local state
      setGoals(prev => prev.filter(g => g.id !== id))

      return true
    } catch (err) {
      console.error('Delete goal error:', err)
      return false
    }
  }, [])

  // Archive/unarchive a goal (toggle isActive)
  const archiveGoal = useCallback(async (id: string): Promise<GoalResponse | null> => {
    // Find current goal to get current isActive state
    const currentGoal = goals.find(g => g.id === id)
    if (!currentGoal) return null

    return updateGoal(id, { isActive: !currentGoal.isActive })
  }, [goals, updateGoal])

  return {
    goals,
    isLoading,
    error,
    refetch: fetchGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    archiveGoal,
  }
}
