'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'

interface MealData {
  start: string | null
  duration: number | null
}

interface MealsData {
  breakfast: MealData
  lunch: MealData
  dinner: MealData
  isVariable?: boolean
}

interface MealsStepProps {
  meals: MealsData
  onChange: (meals: MealsData) => void
}

export function MealsStep({ meals, onChange }: MealsStepProps) {
  const updateMeal = (
    meal: 'breakfast' | 'lunch' | 'dinner',
    field: 'start' | 'duration',
    value: string | number | null
  ) => {
    onChange({
      ...meals,
      [meal]: {
        ...meals[meal],
        [field]: value,
      },
    })
  }

  const toggleVariable = () => {
    onChange({
      ...meals,
      isVariable: !meals.isVariable,
    })
  }

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">When do you eat?</h2>
        <p className="text-muted-foreground">
          We&apos;ll keep these times clear for meals.
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
          checked={meals.isVariable || false}
          onCheckedChange={toggleVariable}
        />
      </div>

      {meals.isVariable ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No problem! We won&apos;t block off specific meal times.</p>
          <p className="text-sm mt-2">
            You can always add meal breaks manually when scheduling your day.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Breakfast */}
        <div className="grid grid-cols-2 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="breakfast-time">Breakfast</Label>
            <Input
              id="breakfast-time"
              type="time"
              value={meals.breakfast.start || ''}
              onChange={(e) => updateMeal('breakfast', 'start', e.target.value || null)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="breakfast-duration">Duration</Label>
              <span className="text-sm text-muted-foreground">
                {meals.breakfast.duration || 30} min
              </span>
            </div>
            <Slider
              id="breakfast-duration"
              min={15}
              max={90}
              step={15}
              value={[meals.breakfast.duration || 30]}
              onValueChange={([value]) => updateMeal('breakfast', 'duration', value)}
            />
          </div>
        </div>

        {/* Lunch */}
        <div className="grid grid-cols-2 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="lunch-time">Lunch</Label>
            <Input
              id="lunch-time"
              type="time"
              value={meals.lunch.start || ''}
              onChange={(e) => updateMeal('lunch', 'start', e.target.value || null)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="lunch-duration">Duration</Label>
              <span className="text-sm text-muted-foreground">
                {meals.lunch.duration || 45} min
              </span>
            </div>
            <Slider
              id="lunch-duration"
              min={15}
              max={90}
              step={15}
              value={[meals.lunch.duration || 45]}
              onValueChange={([value]) => updateMeal('lunch', 'duration', value)}
            />
          </div>
        </div>

        {/* Dinner */}
        <div className="grid grid-cols-2 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="dinner-time">Dinner</Label>
            <Input
              id="dinner-time"
              type="time"
              value={meals.dinner.start || ''}
              onChange={(e) => updateMeal('dinner', 'start', e.target.value || null)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="dinner-duration">Duration</Label>
              <span className="text-sm text-muted-foreground">
                {meals.dinner.duration || 60} min
              </span>
            </div>
            <Slider
              id="dinner-duration"
              min={15}
              max={90}
              step={15}
              value={[meals.dinner.duration || 60]}
              onValueChange={([value]) => updateMeal('dinner', 'duration', value)}
            />
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
