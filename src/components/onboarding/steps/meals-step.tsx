'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Plus, X } from 'lucide-react'

export interface Meal {
  id: string
  name: string
  enabled: boolean
  start: string
  duration: number
}

interface MealsStepProps {
  meals: Meal[]
  isVariable: boolean
  onChange: (meals: Meal[], isVariable: boolean) => void
}

// Default meals that users can toggle
const DEFAULT_MEALS: Omit<Meal, 'id'>[] = [
  { name: 'Breakfast', enabled: true, start: '08:00', duration: 30 },
  { name: 'Lunch', enabled: true, start: '12:00', duration: 45 },
  { name: 'Dinner', enabled: true, start: '18:30', duration: 60 },
]

export function MealsStep({ meals = [], isVariable, onChange }: MealsStepProps) {
  const [newMealName, setNewMealName] = useState('')

  const toggleVariable = () => {
    onChange(meals, !isVariable)
  }

  const toggleMeal = (id: string) => {
    const updated = meals.map((m) =>
      m.id === id ? { ...m, enabled: !m.enabled } : m
    )
    onChange(updated, isVariable)
  }

  const updateMeal = (id: string, field: 'start' | 'duration', value: string | number) => {
    const updated = meals.map((m) =>
      m.id === id ? { ...m, [field]: value } : m
    )
    onChange(updated, isVariable)
  }

  const addMeal = () => {
    if (!newMealName.trim()) return
    if (meals.length >= 8) return // Max 8 meals

    const newMeal: Meal = {
      id: crypto.randomUUID(),
      name: newMealName.trim(),
      enabled: true,
      start: '15:00', // Default to afternoon for snacks
      duration: 30,
    }
    onChange([...meals, newMeal], isVariable)
    setNewMealName('')
  }

  const removeMeal = (id: string) => {
    // Only allow removing custom meals (not default ones)
    const meal = meals.find((m) => m.id === id)
    if (!meal) return

    const isDefaultMeal = DEFAULT_MEALS.some((d) => d.name === meal.name)
    if (isDefaultMeal) return // Can't remove default meals, only disable them

    onChange(meals.filter((m) => m.id !== id), isVariable)
  }

  const isDefaultMeal = (name: string) => DEFAULT_MEALS.some((d) => d.name === name)
  const enabledMealsCount = meals.filter((m) => m.enabled).length

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">When do you eat?</h2>
        <p className="text-muted-foreground">
          Toggle the meals you have and set their times. Add extra meals if needed.
        </p>
      </div>

      {/* Variable meals toggle */}
      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
        <div className="space-y-0.5">
          <Label htmlFor="variable-meals" className="font-medium">
            Variable meal times
          </Label>
          <p className="text-sm text-muted-foreground">
            My meal times change day to day
          </p>
        </div>
        <Switch
          id="variable-meals"
          checked={isVariable}
          onCheckedChange={toggleVariable}
        />
      </div>

      {isVariable ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No problem! We won&apos;t block off specific meal times.</p>
          <p className="text-sm mt-2">
            You can always add meal breaks manually when scheduling your day.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Meals list */}
          <div className="space-y-3">
            {meals.map((meal) => (
              <div
                key={meal.id}
                className={`p-4 border rounded-lg transition-colors ${
                  meal.enabled ? 'bg-background' : 'bg-muted/30 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={meal.enabled}
                      onCheckedChange={() => toggleMeal(meal.id)}
                      aria-label={`Toggle ${meal.name}`}
                    />
                    <span className="font-medium">{meal.name}</span>
                  </div>
                  {!isDefaultMeal(meal.name) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMeal(meal.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${meal.name}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {meal.enabled && (
                  <div className="grid grid-cols-2 gap-4 pl-10">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Time</Label>
                      <Input
                        type="time"
                        value={meal.start}
                        onChange={(e) => updateMeal(meal.id, 'start', e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Duration</Label>
                        <span className="text-xs text-muted-foreground">{meal.duration} min</span>
                      </div>
                      <Slider
                        min={15}
                        max={90}
                        step={15}
                        value={[meal.duration]}
                        onValueChange={([value]) => updateMeal(meal.id, 'duration', value)}
                        className="py-2"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add custom meal */}
          {meals.length < 8 && (
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Add a meal (e.g., Snack, Brunch)"
                value={newMealName}
                onChange={(e) => setNewMealName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addMeal()}
                maxLength={30}
                className="flex-1"
              />
              <Button
                onClick={addMeal}
                disabled={!newMealName.trim()}
                size="icon"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            {enabledMealsCount} meal{enabledMealsCount !== 1 ? 's' : ''} enabled
          </p>
        </div>
      )}
    </div>
  )
}
