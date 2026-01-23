'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Target, Clock, Archive, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GoalsList } from '@/components/goals/goals-list'
import { GoalFormDialog } from '@/components/goals/goal-form-dialog'
import { useGoals } from '@/lib/hooks/use-goals'
import type { GoalResponse, GoalFormData } from '@/lib/validations/goals'

// =============================================================================
// TYPES
// =============================================================================

interface Realm {
  id: string
  name: string
  icon?: string
  description?: string
}

type SortOption = 'realm' | 'hours' | 'deadline'

// =============================================================================
// COMPONENT
// =============================================================================

export default function GoalsPage() {
  // Goals data from hook
  const {
    goals,
    isLoading,
    error,
    refetch,
    createGoal,
    updateGoal,
    deleteGoal,
    archiveGoal,
  } = useGoals()

  // Realms data
  const [realms, setRealms] = useState<Realm[]>([])
  const [realmsLoading, setRealmsLoading] = useState(true)

  // UI state
  const [showArchived, setShowArchived] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('realm')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<GoalResponse | null>(null)

  // Fetch realms on mount
  useEffect(() => {
    const fetchRealms = async () => {
      setRealmsLoading(true)
      try {
        const response = await fetch('/api/realms')
        if (response.ok) {
          const data = await response.json()
          setRealms(data.realms || [])
        }
      } catch {
        console.error('Failed to fetch realms')
      } finally {
        setRealmsLoading(false)
      }
    }

    fetchRealms()
  }, [])

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const activeGoals = goals.filter(g => g.isActive)
    const archivedGoals = goals.filter(g => !g.isActive)
    const totalHours = activeGoals.reduce((sum, g) => sum + (g.hoursPerWeek || 0), 0)

    return {
      totalGoals: goals.length,
      activeCount: activeGoals.length,
      archivedCount: archivedGoals.length,
      totalHours: totalHours.toFixed(1),
    }
  }, [goals])

  // Sort goals
  const sortedGoals = useMemo(() => {
    const sorted = [...goals]

    switch (sortBy) {
      case 'hours':
        sorted.sort((a, b) => (b.hoursPerWeek || 0) - (a.hoursPerWeek || 0))
        break
      case 'deadline':
        sorted.sort((a, b) => {
          // Goals without deadline go to the end
          if (!a.deadline && !b.deadline) return 0
          if (!a.deadline) return 1
          if (!b.deadline) return -1
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        })
        break
      case 'realm':
      default:
        // Sort by realm name (already handled by GoalsList grouping)
        break
    }

    return sorted
  }, [goals, sortBy])

  // Handle opening add dialog
  const handleAddGoal = () => {
    setEditingGoal(null)
    setIsDialogOpen(true)
  }

  // Handle opening edit dialog
  const handleEditGoal = (goal: GoalResponse) => {
    setEditingGoal(goal)
    setIsDialogOpen(true)
  }

  // Handle form submission (create or update)
  const handleSubmit = async (data: GoalFormData) => {
    if (editingGoal) {
      // Update existing goal
      const result = await updateGoal(editingGoal.id, data)
      if (result) {
        toast.success('Goal updated successfully')
      } else {
        toast.error('Failed to update goal')
        throw new Error('Update failed')
      }
    } else {
      // Create new goal
      const result = await createGoal(data)
      if (result) {
        toast.success('Goal created successfully')
      } else {
        toast.error('Failed to create goal')
        throw new Error('Create failed')
      }
    }
  }

  // Handle archive toggle
  const handleArchiveGoal = async (id: string) => {
    const goal = goals.find(g => g.id === id)
    if (!goal) return

    const result = await archiveGoal(id)
    if (result) {
      toast.success(goal.isActive ? 'Goal archived' : 'Goal restored')
    } else {
      toast.error('Failed to archive goal')
    }
  }

  // Handle delete
  const handleDeleteGoal = async (id: string) => {
    const goal = goals.find(g => g.id === id)
    if (!goal) return

    // Confirm before deleting
    if (!window.confirm(`Are you sure you want to delete "${goal.title}"? This cannot be undone.`)) {
      return
    }

    const result = await deleteGoal(id)
    if (result) {
      toast.success('Goal deleted')
    } else {
      toast.error('Failed to delete goal')
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Target className="h-6 w-6" />
                Goals & Actions
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your weekly commitments
              </p>
            </div>
            <Button onClick={handleAddGoal} disabled={realmsLoading || realms.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 container py-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Target className="h-4 w-4" />
                <span className="text-sm">Total Goals</span>
              </div>
              <p className="text-2xl font-semibold">{summaryStats.totalGoals}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Hours/Week</span>
              </div>
              <p className="text-2xl font-semibold">{summaryStats.totalHours}h</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <Target className="h-4 w-4" />
                <span className="text-sm">Active</span>
              </div>
              <p className="text-2xl font-semibold">{summaryStats.activeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Archive className="h-4 w-4" />
                <span className="text-sm">Archived</span>
              </div>
              <p className="text-2xl font-semibold">{summaryStats.archivedCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter/Sort Options */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Switch
              id="show-archived"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <Label htmlFor="show-archived" className="cursor-pointer">
              Show archived
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realm">By Realm</SelectItem>
                <SelectItem value="hours">By Hours</SelectItem>
                <SelectItem value="deadline">By Deadline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {/* Goals List */}
        {!error && (
          <GoalsList
            goals={sortedGoals}
            isLoading={isLoading || realmsLoading}
            showArchived={showArchived}
            onEditGoal={handleEditGoal}
            onArchiveGoal={handleArchiveGoal}
            onDeleteGoal={handleDeleteGoal}
          />
        )}

        {/* No Realms Warning */}
        {!realmsLoading && realms.length === 0 && !isLoading && (
          <div className="text-center py-8 mt-4 border rounded-lg bg-muted/30">
            <p className="text-muted-foreground">
              No life realms found. Please complete onboarding to set up your realms before adding goals.
            </p>
          </div>
        )}
      </div>

      {/* Goal Form Dialog */}
      <GoalFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        goal={editingGoal}
        realms={realms}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
