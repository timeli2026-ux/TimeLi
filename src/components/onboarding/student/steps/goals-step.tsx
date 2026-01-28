'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Trash2, Clock, Target } from 'lucide-react'
import {
  PersonalGoalInput,
  GoalCategory,
  GOAL_CATEGORIES,
  GOAL_DURATION_OPTIONS,
  GOAL_FREQUENCY_OPTIONS,
} from '../types'

interface GoalsStepProps {
  personalGoals: PersonalGoalInput[]
  onAddGoal: (goal: Omit<PersonalGoalInput, 'id'>) => void
  onRemoveGoal: (id: string) => void
}

export function GoalsStep({
  personalGoals,
  onAddGoal,
  onRemoveGoal,
}: GoalsStepProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<GoalCategory>('health')
  const [timesPerWeek, setTimesPerWeek] = useState(3)
  const [minutesPerSession, setMinutesPerSession] = useState(60)

  const resetForm = () => {
    setTitle('')
    setCategory('health')
    setTimesPerWeek(3)
    setMinutesPerSession(60)
    setFormError(null)
  }

  const handleSubmit = () => {
    if (!title.trim()) {
      setFormError('Please enter a goal name')
      return
    }

    onAddGoal({
      title: title.trim(),
      category,
      timesPerWeek,
      minutesPerSession,
    })

    resetForm()
    setIsDialogOpen(false)
  }

  const handleQuickAdd = (suggestion: string, cat: GoalCategory) => {
    onAddGoal({
      title: suggestion,
      category: cat,
      timesPerWeek: 3,
      minutesPerSession: 60,
    })
  }

  // Calculate total weekly hours
  const totalWeeklyHours = personalGoals.reduce((sum, g) => {
    return sum + (g.timesPerWeek * g.minutesPerSession) / 60
  }, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Personal Goals</h2>
        <p className="text-muted-foreground mt-1">
          Add activities outside of academics that you want to make time for.
          These are optional but help create a balanced schedule.
        </p>
      </div>

      {/* Quick Add Suggestions */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm font-medium mb-3">Quick add:</p>
          <div className="space-y-3">
            {GOAL_CATEGORIES.map((cat) => (
              <div key={cat.id}>
                <div className="flex items-center gap-2 mb-2">
                  <span>{cat.icon}</span>
                  <span className="text-sm font-medium">{cat.name}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {cat.suggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAdd(suggestion, cat.id)}
                      className="h-7 text-xs"
                    >
                      + {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Goals */}
      {personalGoals.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Your Goals ({personalGoals.length})</h3>
            <span className="text-sm text-muted-foreground">
              {totalWeeklyHours.toFixed(1)}h / week
            </span>
          </div>

          {personalGoals.map((goal) => {
            const categoryInfo = GOAL_CATEGORIES.find((c) => c.id === goal.category)
            const hoursPerWeek = (goal.timesPerWeek * goal.minutesPerSession) / 60

            return (
              <Card key={goal.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{categoryInfo?.icon || '⭐'}</span>
                      <div>
                        <p className="font-medium">{goal.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {goal.timesPerWeek}x/week, {goal.minutesPerSession} min
                          <span className="mx-1">·</span>
                          {hoursPerWeek.toFixed(1)}h total
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveGoal(goal.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Custom Goal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Goal
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Personal Goal</DialogTitle>
            <DialogDescription>
              Add a recurring activity you want to make time for each week.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <div className="space-y-2">
              <Label htmlFor="goal-title">Goal Name</Label>
              <Input
                id="goal-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Go to gym"
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as GoalCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="other">⭐ Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={timesPerWeek.toString()}
                  onValueChange={(v) => setTimesPerWeek(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_FREQUENCY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Duration</Label>
                <Select
                  value={minutesPerSession.toString()}
                  onValueChange={(v) => setMinutesPerSession(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_DURATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {((timesPerWeek * minutesPerSession) / 60).toFixed(1)} hours/week
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Add Goal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skip hint */}
      {personalGoals.length === 0 && (
        <p className="text-sm text-center text-muted-foreground">
          No personal goals yet. You can skip this step if you only want to schedule academics.
        </p>
      )}
    </div>
  )
}
