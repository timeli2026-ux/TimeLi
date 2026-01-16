'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X } from 'lucide-react'

interface Goal {
  id: string
  title: string
  hoursPerWeek: number
}

interface GoalsIntroStepProps {
  goals: Goal[]
  onAdd: (goal: Omit<Goal, 'id'>) => void
  onRemove: (id: string) => void
}

const MAX_GOALS = 10

export function GoalsIntroStep({ goals, onAdd, onRemove }: GoalsIntroStepProps) {
  const [title, setTitle] = useState('')
  const [hoursPerWeek, setHoursPerWeek] = useState<string>('5')

  const handleAdd = () => {
    if (!title.trim()) return
    if (goals.length >= MAX_GOALS) return

    const hours = parseInt(hoursPerWeek, 10)
    if (isNaN(hours) || hours < 1 || hours > 40) return

    onAdd({
      title: title.trim(),
      hoursPerWeek: hours,
    })

    // Reset form
    setTitle('')
    setHoursPerWeek('5')
  }

  const handleHoursChange = (value: string) => {
    // Allow empty string for typing
    if (value === '') {
      setHoursPerWeek('')
      return
    }
    // Parse and clamp between 1 and 40
    const num = parseInt(value, 10)
    if (!isNaN(num)) {
      setHoursPerWeek(String(Math.max(1, Math.min(40, num))))
    }
  }

  const isAtLimit = goals.length >= MAX_GOALS
  const totalHours = goals.reduce((sum, g) => sum + g.hoursPerWeek, 0)

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">What do you want to accomplish?</h2>
        <p className="text-muted-foreground">
          Add your goals - things you want to make time for each week. We&apos;ll
          help schedule them around your commitments.
        </p>
        <p className="text-sm text-muted-foreground">
          You can always add more goals later from the Goals page.
        </p>
      </div>

      {/* Add Goal Form */}
      {!isAtLimit && (
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="goal-title">Goal</Label>
            <Input
              id="goal-title"
              type="text"
              placeholder="e.g., Study for finals, Exercise"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-hours">Hours per week</Label>
            <div className="flex items-center gap-2">
              <Input
                id="goal-hours"
                type="number"
                min={1}
                max={40}
                value={hoursPerWeek}
                onChange={(e) => handleHoursChange(e.target.value)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">
                hours/week
              </span>
            </div>
          </div>

          <Button
            onClick={handleAdd}
            disabled={!title.trim() || !hoursPerWeek}
            className="w-full"
          >
            Add Goal
          </Button>
        </div>
      )}

      {isAtLimit && (
        <p className="text-sm text-amber-600 text-center">
          Maximum of {MAX_GOALS} goals during onboarding. You can add more later.
        </p>
      )}

      {/* Goals List */}
      <div className="space-y-2">
        {goals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Add at least one goal to continue
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {goals.length} goal{goals.length !== 1 ? 's' : ''} added
              </span>
              <span>{totalHours} hours/week total</span>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{goal.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {goal.hoursPerWeek} hours/week
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(goal.id)}
                    className="ml-2 shrink-0"
                    aria-label={`Remove ${goal.title}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
