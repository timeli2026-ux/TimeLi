'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================

interface Realm {
  id: string
  name: string
}

export interface EventCreateData {
  title: string
  eventType: 'goal' | 'simple'
  dayOfWeek: number
  startTime: string
  durationMinutes: number
  realmId?: string
  isRecurring: boolean
  recurringDays: number[]
}

interface EventCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialDayOfWeek: number
  initialStartTime: string
  onSubmit: (data: EventCreateData) => Promise<void>
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

const DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
]

const EVENT_TYPE_OPTIONS = [
  { value: 'goal', label: 'Goal Event', description: 'Linked to a life realm, appears in pie chart' },
  { value: 'simple', label: 'Simple Event', description: 'Just title and time, no tracking' },
]

// =============================================================================
// COMPONENT
// =============================================================================

export function EventCreateDialog({
  open,
  onOpenChange,
  initialDayOfWeek,
  initialStartTime,
  onSubmit,
}: EventCreateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [realms, setRealms] = useState<Realm[]>([])
  const [isLoadingRealms, setIsLoadingRealms] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState<'goal' | 'simple'>('simple')
  const [dayOfWeek, setDayOfWeek] = useState(initialDayOfWeek)
  const [startTime, setStartTime] = useState(initialStartTime)
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [realmId, setRealmId] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringDays, setRecurringDays] = useState<number[]>([])

  // Load realms when dialog opens
  useEffect(() => {
    if (open) {
      // Reset form state
      setTitle('')
      setEventType('simple')
      setDayOfWeek(initialDayOfWeek)
      setStartTime(initialStartTime)
      setDurationMinutes(60)
      setRealmId('')
      setIsRecurring(false)
      setRecurringDays([])
      setErrors({})

      // Load realms
      setIsLoadingRealms(true)
      fetch('/api/realms')
        .then((res) => res.json())
        .then((data) => {
          setRealms(data.realms || [])
          if (data.realms?.length > 0) {
            setRealmId(data.realms[0].id)
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingRealms(false))
    }
  }, [open, initialDayOfWeek, initialStartTime])

  // Toggle recurring day
  const toggleRecurringDay = useCallback((day: number) => {
    setRecurringDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }, [])

  // Format time for display
  const formatTimeDisplay = (time: string): string => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours, 10)
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    const period = hour < 12 ? 'AM' : 'PM'
    return `${displayHour}:${minutes} ${period}`
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    const newErrors: Record<string, string> = {}
    if (!title.trim()) {
      newErrors.title = 'Title is required'
    }
    if (eventType === 'goal' && !realmId) {
      newErrors.realmId = 'Realm is required for goal events'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      await onSubmit({
        title: title.trim(),
        eventType,
        dayOfWeek,
        startTime,
        durationMinutes,
        realmId: eventType === 'goal' ? realmId : undefined,
        isRecurring,
        recurringDays: isRecurring ? recurringDays : [],
      })
      onOpenChange(false)
    } catch (err) {
      console.error('Form submission error:', err)
      setErrors({ _form: 'Failed to create event. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>
              Add a new event to your schedule at {formatTimeDisplay(initialStartTime)} on{' '}
              {DAYS_OF_WEEK.find((d) => d.value === initialDayOfWeek)?.label}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Form-level error */}
            {errors._form && (
              <div className="text-sm text-destructive">{errors._form}</div>
            )}

            {/* Event Type */}
            <div className="space-y-2">
              <Label>Event Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {EVENT_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setEventType(option.value as 'goal' | 'simple')}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      eventType === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-accent/50'
                    }`}
                  >
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Team meeting"
                maxLength={100}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
            </div>

            {/* Day and Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dayOfWeek">Day</Label>
                <Select
                  value={String(dayOfWeek)}
                  onValueChange={(value) => setDayOfWeek(Number(value))}
                >
                  <SelectTrigger id="dayOfWeek">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={String(day.value)}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select
                value={String(durationMinutes)}
                onValueChange={(value) => setDurationMinutes(Number(value))}
              >
                <SelectTrigger id="duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Realm (only for goal events) */}
            {eventType === 'goal' && (
              <div className="space-y-2">
                <Label htmlFor="realm">
                  Life Realm <span className="text-destructive">*</span>
                </Label>
                {isLoadingRealms ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading realms...
                  </div>
                ) : realms.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No realms found. Create realms in your goals settings first.
                  </div>
                ) : (
                  <Select value={realmId} onValueChange={setRealmId}>
                    <SelectTrigger id="realm">
                      <SelectValue placeholder="Select a realm" />
                    </SelectTrigger>
                    <SelectContent>
                      {realms.map((realm) => (
                        <SelectItem key={realm.id} value={realm.id}>
                          {realm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {errors.realmId && (
                  <p className="text-sm text-destructive">{errors.realmId}</p>
                )}
              </div>
            )}

            {/* Recurring Section */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRecurring"
                  checked={isRecurring}
                  onCheckedChange={(checked) => setIsRecurring(!!checked)}
                />
                <Label htmlFor="isRecurring" className="cursor-pointer">
                  Repeat weekly
                </Label>
              </div>

              {isRecurring && (
                <div className="space-y-2 pl-6">
                  <Label className="text-sm text-muted-foreground">
                    Also create on these days:
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <div key={day.value} className="flex items-center space-x-1">
                        <Checkbox
                          id={`recurring-day-${day.value}`}
                          checked={recurringDays.includes(day.value)}
                          onCheckedChange={() => toggleRecurringDay(day.value)}
                          disabled={day.value === dayOfWeek}
                        />
                        <Label
                          htmlFor={`recurring-day-${day.value}`}
                          className={`cursor-pointer text-sm ${
                            day.value === dayOfWeek ? 'text-muted-foreground' : ''
                          }`}
                        >
                          {day.label.slice(0, 3)}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Events will be created at {formatTimeDisplay(startTime)} on each selected day.
                  </p>
                </div>
              )}
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
                  Creating...
                </>
              ) : (
                'Create Event'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
