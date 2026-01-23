'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Moon, Sun, Sunrise, Clock, Car, Utensils, Timer } from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

export interface PreferencesFormData {
  timezone: string
  sleepStart: string
  sleepEnd: string
  weekendSleepStart: string | null
  weekendSleepEnd: string | null
  chronotype: 'early_bird' | 'night_owl' | 'intermediate'
  bufferMinutes: number
  mealBreakfastStart: string | null
  mealBreakfastDuration: number | null
  mealLunchStart: string | null
  mealLunchDuration: number | null
  mealDinnerStart: string | null
  mealDinnerDuration: number | null
  commuteMorningStart: string | null
  commuteMorningDuration: number | null
  commuteEveningStart: string | null
  commuteEveningDuration: number | null
}

interface SchedulePreferencesFormProps {
  initialData: PreferencesFormData
  onSubmit: (data: PreferencesFormData) => Promise<void>
  isSubmitting: boolean
}

// =============================================================================
// CHRONOTYPE DATA
// =============================================================================

const chronotypeOptions = [
  {
    value: 'early_bird' as const,
    label: 'Early Bird',
    description: 'Peak energy in the morning (6am-10am)',
    icon: Sunrise,
  },
  {
    value: 'intermediate' as const,
    label: 'Intermediate',
    description: 'Balanced energy throughout the day',
    icon: Sun,
  },
  {
    value: 'night_owl' as const,
    label: 'Night Owl',
    description: 'Peak energy in the evening (4pm-10pm)',
    icon: Moon,
  },
]

// =============================================================================
// COMPONENT
// =============================================================================

export function SchedulePreferencesForm({
  initialData,
  onSubmit,
  isSubmitting,
}: SchedulePreferencesFormProps) {
  // Form state
  const [formData, setFormData] = useState<PreferencesFormData>(initialData)
  const [hasChanges, setHasChanges] = useState(false)

  // UI toggles for optional sections
  const [sameWeekendSleep, setSameWeekendSleep] = useState(
    !initialData.weekendSleepStart && !initialData.weekendSleepEnd
  )
  const [breakfastEnabled, setBreakfastEnabled] = useState(!!initialData.mealBreakfastStart)
  const [lunchEnabled, setLunchEnabled] = useState(!!initialData.mealLunchStart)
  const [dinnerEnabled, setDinnerEnabled] = useState(!!initialData.mealDinnerStart)
  const [morningCommuteEnabled, setMorningCommuteEnabled] = useState(!!initialData.commuteMorningStart)
  const [eveningCommuteEnabled, setEveningCommuteEnabled] = useState(!!initialData.commuteEveningStart)

  // Track changes
  useEffect(() => {
    const changed = JSON.stringify(formData) !== JSON.stringify(initialData)
    setHasChanges(changed)
  }, [formData, initialData])

  // Reset form to initial data
  const handleReset = () => {
    setFormData(initialData)
    setSameWeekendSleep(!initialData.weekendSleepStart && !initialData.weekendSleepEnd)
    setBreakfastEnabled(!!initialData.mealBreakfastStart)
    setLunchEnabled(!!initialData.mealLunchStart)
    setDinnerEnabled(!!initialData.mealDinnerStart)
    setMorningCommuteEnabled(!!initialData.commuteMorningStart)
    setEveningCommuteEnabled(!!initialData.commuteEveningStart)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  // Generic update handler
  const updateField = <K extends keyof PreferencesFormData>(
    field: K,
    value: PreferencesFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Toggle weekend sleep same as weekday
  const handleSameWeekendToggle = (same: boolean) => {
    setSameWeekendSleep(same)
    if (same) {
      updateField('weekendSleepStart', null)
      updateField('weekendSleepEnd', null)
    } else {
      // Default to weekday times
      updateField('weekendSleepStart', formData.sleepStart)
      updateField('weekendSleepEnd', formData.sleepEnd)
    }
  }

  // Toggle meal handlers
  const handleBreakfastToggle = (enabled: boolean) => {
    setBreakfastEnabled(enabled)
    if (!enabled) {
      updateField('mealBreakfastStart', null)
      updateField('mealBreakfastDuration', null)
    } else {
      updateField('mealBreakfastStart', '08:00')
      updateField('mealBreakfastDuration', 30)
    }
  }

  const handleLunchToggle = (enabled: boolean) => {
    setLunchEnabled(enabled)
    if (!enabled) {
      updateField('mealLunchStart', null)
      updateField('mealLunchDuration', null)
    } else {
      updateField('mealLunchStart', '12:00')
      updateField('mealLunchDuration', 45)
    }
  }

  const handleDinnerToggle = (enabled: boolean) => {
    setDinnerEnabled(enabled)
    if (!enabled) {
      updateField('mealDinnerStart', null)
      updateField('mealDinnerDuration', null)
    } else {
      updateField('mealDinnerStart', '18:30')
      updateField('mealDinnerDuration', 60)
    }
  }

  // Toggle commute handlers
  const handleMorningCommuteToggle = (enabled: boolean) => {
    setMorningCommuteEnabled(enabled)
    if (!enabled) {
      updateField('commuteMorningStart', null)
      updateField('commuteMorningDuration', null)
    } else {
      updateField('commuteMorningStart', '08:00')
      updateField('commuteMorningDuration', 30)
    }
  }

  const handleEveningCommuteToggle = (enabled: boolean) => {
    setEveningCommuteEnabled(enabled)
    if (!enabled) {
      updateField('commuteEveningStart', null)
      updateField('commuteEveningDuration', null)
    } else {
      updateField('commuteEveningStart', '17:30')
      updateField('commuteEveningDuration', 30)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Unsaved changes indicator */}
      {hasChanges && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-200">
          You have unsaved changes
        </div>
      )}

      {/* =================================================================== */}
      {/* SLEEP SCHEDULE */}
      {/* =================================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Sleep Schedule
          </CardTitle>
          <CardDescription>
            Set your regular sleep times. Nothing will be scheduled during sleep hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Weekday Sleep */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Weekdays</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sleep-start" className="text-sm text-muted-foreground">
                  Bedtime
                </Label>
                <Input
                  id="sleep-start"
                  type="time"
                  value={formData.sleepStart}
                  onChange={(e) => updateField('sleepStart', e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sleep-end" className="text-sm text-muted-foreground">
                  Wake up
                </Label>
                <Input
                  id="sleep-end"
                  type="time"
                  value={formData.sleepEnd}
                  onChange={(e) => updateField('sleepEnd', e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Weekend Sleep Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div className="space-y-0.5">
              <Label htmlFor="same-weekend" className="font-medium">
                Same on weekends
              </Label>
              <p className="text-sm text-muted-foreground">
                Use the same sleep schedule for Sat/Sun
              </p>
            </div>
            <Switch
              id="same-weekend"
              checked={sameWeekendSleep}
              onCheckedChange={handleSameWeekendToggle}
            />
          </div>

          {/* Weekend Sleep Times */}
          {!sameWeekendSleep && (
            <div className="space-y-4 pl-4 border-l-2 border-muted">
              <Label className="text-base font-medium">Weekends</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weekend-sleep-start" className="text-sm text-muted-foreground">
                    Bedtime
                  </Label>
                  <Input
                    id="weekend-sleep-start"
                    type="time"
                    value={formData.weekendSleepStart || ''}
                    onChange={(e) => updateField('weekendSleepStart', e.target.value || null)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weekend-sleep-end" className="text-sm text-muted-foreground">
                    Wake up
                  </Label>
                  <Input
                    id="weekend-sleep-end"
                    type="time"
                    value={formData.weekendSleepEnd || ''}
                    onChange={(e) => updateField('weekendSleepEnd', e.target.value || null)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* =================================================================== */}
      {/* ENERGY PROFILE / CHRONOTYPE */}
      {/* =================================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Energy Profile
          </CardTitle>
          <CardDescription>
            Your chronotype determines when high-focus tasks are scheduled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={formData.chronotype}
            onValueChange={(value) => updateField('chronotype', value as PreferencesFormData['chronotype'])}
            className="space-y-3"
          >
            {chronotypeOptions.map((option) => {
              const Icon = option.icon
              return (
                <div key={option.value} className="flex items-center space-x-3">
                  <RadioGroupItem value={option.value} id={`chronotype-${option.value}`} />
                  <Label
                    htmlFor={`chronotype-${option.value}`}
                    className="flex items-center gap-3 cursor-pointer flex-1 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.description}</div>
                    </div>
                  </Label>
                </div>
              )
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* =================================================================== */}
      {/* MEALS */}
      {/* =================================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Meals
          </CardTitle>
          <CardDescription>
            Meal times are blocked as unavailable time in your schedule.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Breakfast */}
          <div className={`p-4 border rounded-lg transition-colors ${breakfastEnabled ? 'bg-background' : 'bg-muted/30 opacity-60'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={breakfastEnabled}
                  onCheckedChange={handleBreakfastToggle}
                  aria-label="Toggle Breakfast"
                />
                <span className="font-medium">Breakfast</span>
              </div>
            </div>
            {breakfastEnabled && (
              <div className="grid grid-cols-2 gap-4 pl-10">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <Input
                    type="time"
                    value={formData.mealBreakfastStart || '08:00'}
                    onChange={(e) => updateField('mealBreakfastStart', e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Duration</Label>
                    <span className="text-xs text-muted-foreground">{formData.mealBreakfastDuration || 30} min</span>
                  </div>
                  <Slider
                    min={15}
                    max={90}
                    step={15}
                    value={[formData.mealBreakfastDuration || 30]}
                    onValueChange={([value]) => updateField('mealBreakfastDuration', value)}
                    className="py-2"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Lunch */}
          <div className={`p-4 border rounded-lg transition-colors ${lunchEnabled ? 'bg-background' : 'bg-muted/30 opacity-60'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={lunchEnabled}
                  onCheckedChange={handleLunchToggle}
                  aria-label="Toggle Lunch"
                />
                <span className="font-medium">Lunch</span>
              </div>
            </div>
            {lunchEnabled && (
              <div className="grid grid-cols-2 gap-4 pl-10">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <Input
                    type="time"
                    value={formData.mealLunchStart || '12:00'}
                    onChange={(e) => updateField('mealLunchStart', e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Duration</Label>
                    <span className="text-xs text-muted-foreground">{formData.mealLunchDuration || 45} min</span>
                  </div>
                  <Slider
                    min={15}
                    max={90}
                    step={15}
                    value={[formData.mealLunchDuration || 45]}
                    onValueChange={([value]) => updateField('mealLunchDuration', value)}
                    className="py-2"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Dinner */}
          <div className={`p-4 border rounded-lg transition-colors ${dinnerEnabled ? 'bg-background' : 'bg-muted/30 opacity-60'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={dinnerEnabled}
                  onCheckedChange={handleDinnerToggle}
                  aria-label="Toggle Dinner"
                />
                <span className="font-medium">Dinner</span>
              </div>
            </div>
            {dinnerEnabled && (
              <div className="grid grid-cols-2 gap-4 pl-10">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <Input
                    type="time"
                    value={formData.mealDinnerStart || '18:30'}
                    onChange={(e) => updateField('mealDinnerStart', e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Duration</Label>
                    <span className="text-xs text-muted-foreground">{formData.mealDinnerDuration || 60} min</span>
                  </div>
                  <Slider
                    min={15}
                    max={90}
                    step={15}
                    value={[formData.mealDinnerDuration || 60]}
                    onValueChange={([value]) => updateField('mealDinnerDuration', value)}
                    className="py-2"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* =================================================================== */}
      {/* COMMUTE */}
      {/* =================================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Commute
          </CardTitle>
          <CardDescription>
            Block travel time so nothing gets scheduled during your commute.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Morning Commute */}
          <div className={`p-4 border rounded-lg transition-colors ${morningCommuteEnabled ? 'bg-background' : 'bg-muted/30 opacity-60'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={morningCommuteEnabled}
                  onCheckedChange={handleMorningCommuteToggle}
                  aria-label="Toggle Morning Commute"
                />
                <span className="font-medium">Morning Commute</span>
              </div>
            </div>
            {morningCommuteEnabled && (
              <div className="space-y-4 pl-10">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Leave home at</Label>
                  <Input
                    type="time"
                    value={formData.commuteMorningStart || '08:00'}
                    onChange={(e) => updateField('commuteMorningStart', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">Duration</Label>
                    <span className="text-sm text-muted-foreground">{formData.commuteMorningDuration || 30} min</span>
                  </div>
                  <Slider
                    min={15}
                    max={90}
                    step={15}
                    value={[formData.commuteMorningDuration || 30]}
                    onValueChange={([value]) => updateField('commuteMorningDuration', value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Evening Commute */}
          <div className={`p-4 border rounded-lg transition-colors ${eveningCommuteEnabled ? 'bg-background' : 'bg-muted/30 opacity-60'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={eveningCommuteEnabled}
                  onCheckedChange={handleEveningCommuteToggle}
                  aria-label="Toggle Evening Commute"
                />
                <span className="font-medium">Evening Commute</span>
              </div>
            </div>
            {eveningCommuteEnabled && (
              <div className="space-y-4 pl-10">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Leave work at</Label>
                  <Input
                    type="time"
                    value={formData.commuteEveningStart || '17:30'}
                    onChange={(e) => updateField('commuteEveningStart', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">Duration</Label>
                    <span className="text-sm text-muted-foreground">{formData.commuteEveningDuration || 30} min</span>
                  </div>
                  <Slider
                    min={15}
                    max={90}
                    step={15}
                    value={[formData.commuteEveningDuration || 30]}
                    onValueChange={([value]) => updateField('commuteEveningDuration', value)}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* =================================================================== */}
      {/* BUFFER TIME */}
      {/* =================================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Buffer Time
          </CardTitle>
          <CardDescription>
            Time between activities for transitions and mental breaks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Buffer between tasks</Label>
              <span className="text-sm font-medium">{formData.bufferMinutes} minutes</span>
            </div>
            <Slider
              min={5}
              max={30}
              step={5}
              value={[formData.bufferMinutes]}
              onValueChange={([value]) => updateField('bufferMinutes', value)}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>5 min</span>
              <span>30 min</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* =================================================================== */}
      {/* FORM ACTIONS */}
      {/* =================================================================== */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={!hasChanges || isSubmitting}
        >
          Discard Changes
        </Button>
        <Button type="submit" disabled={!hasChanges || isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </form>
  )
}
