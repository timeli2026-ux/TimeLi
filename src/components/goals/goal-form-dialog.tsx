'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { goalFormSchema, type GoalFormData, type GoalResponse } from '@/lib/validations/goals'
import { Loader2 } from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

interface Realm {
  id: string
  name: string
}

interface GoalFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal?: GoalResponse | null // If provided, we're in edit mode
  realms: Realm[]
  onSubmit: (data: GoalFormData) => Promise<void>
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

const COGNITIVE_LOAD_OPTIONS = [
  { value: 'low', label: 'Low - Easy, routine tasks' },
  { value: 'medium', label: 'Medium - Moderate focus required' },
  { value: 'high', label: 'High - Deep concentration needed' },
]

const DEADLINE_TYPE_OPTIONS = [
  { value: 'none', label: 'No deadline' },
  { value: 'soft', label: 'Soft - Flexible target date' },
  { value: 'hard', label: 'Hard - Must complete by date' },
]

const PREFERRED_TIME_OPTIONS = [
  { value: 'any', label: 'Any time' },
  { value: 'morning', label: 'Morning (6am - 12pm)' },
  { value: 'afternoon', label: 'Afternoon (12pm - 6pm)' },
  { value: 'evening', label: 'Evening (6pm - 10pm)' },
]

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const getDefaultFormData = (): GoalFormData => ({
  title: '',
  realmId: '',
  hoursPerWeek: 3,
  isActive: true,
  cognitiveLoad: 'medium',
  requiresDeepWork: false,
  deadline: null,
  deadlineType: 'none',
  preferredTimeWindow: 'any',
  excludedDays: [],
  minimumSessionMinutes: 30,
  preferredSessionMinutes: 60,
  intensityLevel: 3,
})

// =============================================================================
// COMPONENT
// =============================================================================

export function GoalFormDialog({
  open,
  onOpenChange,
  goal,
  realms,
  onSubmit,
}: GoalFormDialogProps) {
  const isEditMode = !!goal
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Form state
  const [formData, setFormData] = useState<GoalFormData>(getDefaultFormData)

  // Reset form when dialog opens/closes or goal changes
  useEffect(() => {
    if (open) {
      if (goal) {
        // Edit mode: populate with goal data
        setFormData({
          title: goal.title,
          realmId: goal.realmId,
          hoursPerWeek: goal.hoursPerWeek,
          isActive: goal.isActive ?? true,
          cognitiveLoad: goal.cognitiveLoad ?? 'medium',
          requiresDeepWork: goal.requiresDeepWork ?? false,
          deadline: goal.deadline ?? null,
          deadlineType: goal.deadlineType ?? 'none',
          preferredTimeWindow: goal.preferredTimeWindow ?? 'any',
          excludedDays: goal.excludedDays ?? [],
          minimumSessionMinutes: goal.minimumSessionMinutes ?? 30,
          preferredSessionMinutes: goal.preferredSessionMinutes ?? 60,
          intensityLevel: goal.intensityLevel ?? 3,
        })
      } else {
        // Add mode: reset to defaults
        setFormData({
          ...getDefaultFormData(),
          realmId: realms.length > 0 ? realms[0].id : '',
        })
      }
      setErrors({})
    }
  }, [open, goal, realms])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate with Zod
    const result = goalFormSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const path = issue.path[0] as string
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      await onSubmit(result.data)
      onOpenChange(false)
    } catch (err) {
      console.error('Form submission error:', err)
      setErrors({ _form: 'Failed to save goal. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update form field
  const updateField = <K extends keyof GoalFormData>(
    field: K,
    value: GoalFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear field error when user edits
    if (errors[field]) {
      setErrors(prev => {
        const { [field]: _, ...rest } = prev
        return rest
      })
    }
  }

  // Toggle excluded day
  const toggleExcludedDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      excludedDays: prev.excludedDays?.includes(day)
        ? prev.excludedDays.filter(d => d !== day)
        : [...(prev.excludedDays || []), day],
    }))
  }

  // Format duration display
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) return `${hours} hr`
    return `${hours}h ${mins}m`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Goal' : 'Add Goal'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? 'Update your goal settings and preferences.'
                : 'Create a new goal to schedule in your week.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Form-level error */}
            {errors._form && (
              <div className="text-sm text-destructive">{errors._form}</div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={e => updateField('title', e.target.value)}
                placeholder="e.g., Go to the gym"
                maxLength={100}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
            </div>

            {/* Realm */}
            <div className="space-y-2">
              <Label htmlFor="realm">
                Life Realm <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.realmId}
                onValueChange={value => updateField('realmId', value)}
              >
                <SelectTrigger id="realm">
                  <SelectValue placeholder="Select a realm" />
                </SelectTrigger>
                <SelectContent>
                  {realms.map(realm => (
                    <SelectItem key={realm.id} value={realm.id}>
                      {realm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.realmId && (
                <p className="text-sm text-destructive">{errors.realmId}</p>
              )}
            </div>

            {/* Hours per Week */}
            <div className="space-y-2">
              <Label>
                Hours per Week: {formData.hoursPerWeek}h
              </Label>
              <Slider
                min={0.5}
                max={40}
                step={0.5}
                value={[formData.hoursPerWeek]}
                onValueChange={([value]) => updateField('hoursPerWeek', value)}
              />
              {errors.hoursPerWeek && (
                <p className="text-sm text-destructive">{errors.hoursPerWeek}</p>
              )}
            </div>

            {/* Cognitive Load */}
            <div className="space-y-2">
              <Label htmlFor="cognitiveLoad">Cognitive Load</Label>
              <Select
                value={formData.cognitiveLoad}
                onValueChange={value => updateField('cognitiveLoad', value as 'high' | 'medium' | 'low')}
              >
                <SelectTrigger id="cognitiveLoad">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COGNITIVE_LOAD_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Requires Deep Work */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requiresDeepWork"
                checked={formData.requiresDeepWork}
                onCheckedChange={checked => updateField('requiresDeepWork', !!checked)}
              />
              <Label htmlFor="requiresDeepWork" className="cursor-pointer">
                Requires deep work / uninterrupted focus
              </Label>
            </div>

            {/* Deadline */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline ? formData.deadline.split('T')[0] : ''}
                  onChange={e =>
                    updateField(
                      'deadline',
                      e.target.value ? new Date(e.target.value).toISOString() : null
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadlineType">Deadline Type</Label>
                <Select
                  value={formData.deadlineType}
                  onValueChange={value => updateField('deadlineType', value as 'hard' | 'soft' | 'none')}
                >
                  <SelectTrigger id="deadlineType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEADLINE_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preferred Time */}
            <div className="space-y-2">
              <Label htmlFor="preferredTime">Preferred Time</Label>
              <Select
                value={formData.preferredTimeWindow}
                onValueChange={value => updateField('preferredTimeWindow', value as 'morning' | 'afternoon' | 'evening' | 'any')}
              >
                <SelectTrigger id="preferredTime">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PREFERRED_TIME_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Excluded Days */}
            <div className="space-y-2">
              <Label>Excluded Days</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map(day => (
                  <div key={day.value} className="flex items-center space-x-1">
                    <Checkbox
                      id={`day-${day.value}`}
                      checked={formData.excludedDays?.includes(day.value)}
                      onCheckedChange={() => toggleExcludedDay(day.value)}
                    />
                    <Label
                      htmlFor={`day-${day.value}`}
                      className="cursor-pointer text-sm"
                    >
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Session Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>
                  Min Session: {formatDuration(formData.minimumSessionMinutes || 30)}
                </Label>
                <Slider
                  min={15}
                  max={90}
                  step={15}
                  value={[formData.minimumSessionMinutes || 30]}
                  onValueChange={([value]) => updateField('minimumSessionMinutes', value)}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Preferred: {formatDuration(formData.preferredSessionMinutes || 60)}
                </Label>
                <Slider
                  min={30}
                  max={180}
                  step={15}
                  value={[formData.preferredSessionMinutes || 60]}
                  onValueChange={([value]) => updateField('preferredSessionMinutes', value)}
                />
              </div>
            </div>

            {/* Intensity */}
            <div className="space-y-2">
              <Label>
                Intensity: {formData.intensityLevel}/5
              </Label>
              <Slider
                min={1}
                max={5}
                step={1}
                value={[formData.intensityLevel || 3]}
                onValueChange={([value]) => updateField('intensityLevel', value)}
              />
              <p className="text-xs text-muted-foreground">
                Higher intensity goals need more recovery buffer between sessions.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditMode ? (
                'Save Changes'
              ) : (
                'Add Goal'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
