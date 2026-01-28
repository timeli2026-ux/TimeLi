'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AssignmentResponse, AssignmentFormData, AssignmentUpdateData } from '@/lib/validations/assignments'

// =============================================================================
// TYPES
// =============================================================================

interface UseAssignmentsReturn {
  assignments: AssignmentResponse[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  createAssignment: (data: AssignmentFormData) => Promise<AssignmentResponse | null>
  updateAssignment: (id: string, data: AssignmentUpdateData) => Promise<AssignmentResponse | null>
  deleteAssignment: (id: string) => Promise<boolean>
  markComplete: (id: string) => Promise<AssignmentResponse | null>
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Custom hook for assignments CRUD operations
 * Fetches assignments on mount and provides mutation functions
 */
export function useAssignments(): UseAssignmentsReturn {
  const [assignments, setAssignments] = useState<AssignmentResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all assignments
  const fetchAssignments = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/assignments')

      if (!response.ok) {
        if (response.status === 401) {
          setError('Please log in to view your assignments')
        } else {
          setError('Failed to fetch assignments')
        }
        setAssignments([])
        return
      }

      const data = await response.json()
      setAssignments(data.assignments || [])
    } catch {
      setError('Network error - please try again')
      setAssignments([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch on mount
  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  // Create a new assignment
  const createAssignment = useCallback(async (data: AssignmentFormData): Promise<AssignmentResponse | null> => {
    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create assignment')
      }

      const result = await response.json()
      const newAssignment = result.assignment as AssignmentResponse

      // Add to local state (sorted by due date)
      setAssignments(prev => [...prev, newAssignment].sort((a, b) =>
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      ))

      return newAssignment
    } catch (err) {
      console.error('Create assignment error:', err)
      return null
    }
  }, [])

  // Update an existing assignment
  const updateAssignment = useCallback(async (id: string, data: AssignmentUpdateData): Promise<AssignmentResponse | null> => {
    try {
      const response = await fetch(`/api/assignments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update assignment')
      }

      const result = await response.json()
      const updatedAssignment = result.assignment as AssignmentResponse

      // Update in local state
      setAssignments(prev => prev.map(a => a.id === id ? updatedAssignment : a))

      return updatedAssignment
    } catch (err) {
      console.error('Update assignment error:', err)
      return null
    }
  }, [])

  // Delete an assignment
  const deleteAssignment = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/assignments/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete assignment')
      }

      // Remove from local state
      setAssignments(prev => prev.filter(a => a.id !== id))

      return true
    } catch (err) {
      console.error('Delete assignment error:', err)
      return false
    }
  }, [])

  // Mark an assignment as complete
  const markComplete = useCallback(async (id: string): Promise<AssignmentResponse | null> => {
    return updateAssignment(id, { status: 'completed' })
  }, [updateAssignment])

  return {
    assignments,
    isLoading,
    error,
    refetch: fetchAssignments,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    markComplete,
  }
}
