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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Trash2 } from 'lucide-react'
import type { ScheduleEventWithFlexibility } from '@/lib/scheduling/types'

// =============================================================================
// TYPES
// =============================================================================

interface Realm {
  id: string
  name: string
}

export interface EventEditData {
  title: string
  dayOfWeek: number
  startTime: string
  durationMinutes: number
  realmId?: string
}

interface EventEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: ScheduleEventWithFlexibility
  onSubmit: (eventId: string, data: EventEditData) => Promise<void>
  onDelete: (eventId: string) => Promise<void>
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

// =============================================================================
// COMPONENT
// =============================================================================

export function EventEditDialog({
  open,
  onOpenChange,
  event,
  onSubmit,
  onDelete,
}: EventEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [realms, setRealms] = useState<Realm[]>([])
  const [isLoadingRealms, setIsLoadingRealms] = useState(false)

  // Form state
  const [title, setTitle] = useState(event.title)
  const [dayOfWeek, setDayOfWeek] = useState(event.slot.dayOfWeek)
  const [startTime, setStartTime] = useState(event.slot.startTime)
  const [durationMinutes, setDurationMinutes] = useState(event.slot.durationMinutes)
  const [realmId, setRealmId] = useState(event.realmId || '')

  const isGoalEvent = event.type === 'goal'

  // Load realms and reset form when dialog opens
  useEffect(() => {
    if (open) {
      // Reset form state with event data
      setTitle(event.title)
      setDayOfWeek(event.slot.dayOfWeek)
      setStartTime(event.slot.startTime)
      setDurationMinutes(event.slot.durationMinutes)
      setRealmId(event.realmId || '')
      setErrors({})
      setShowDeleteConfirm(false)

      // Load realms for goal events
      if (isGoalEvent) {
        setIsLoadingRealms(true)
        fetch('/api/realms')
          .then((res) => res.json())
          .then((data) => {
            setRealms(data.realms || [])
          })
          .catch(console.error)
          .finally(() => setIsLoadingRealms(false))
      }
    }
  }, [open, event, isGoalEvent])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    const newErrors: Record<string, string> = {}
    if (!title.trim()) {
      newErrors.title = 'Title is required'
    }
    if (isGoalEvent && !realmId) {
      newErrors.realmId = 'Realm is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      await onSubmit(event.id, {
        title: title.trim(),
        dayOfWeek,
        startTime,
        durationMinutes,
        realmId: isGoalEvent ? realmId : undefined,
      })
      onOpenChange(false)
    } catch (err) {
      console.error('Form submission error:', err)
      setErrors({ _form: 'Failed to update event. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle delete
  const handleDelete = useCallback(async () => {
    setIsDeleting(true)
    try {
      await onDelete(event.id)
      setShowDeleteConfirm(false)
      onOpenChange(false)
    } catch (err) {
      console.error('Delete error:', err)
      setErrors({ _form: 'Failed to delete event. Please try again.' })
    } finally {
      setIsDeleting(false)
    }
  }, [event.id, onDelete, onOpenChange])

  // Delete confirmation view
  if (showDeleteConfirm) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{event.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Edit form view
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Make changes to this event. Locked events cannot be edited.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Form-level error */}
            {errors._form && (
              <div className="text-sm text-destructive">{errors._form}</div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="edit-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-title"
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
                <Label htmlFor="edit-dayOfWeek">Day</Label>
                <Select
                  value={String(dayOfWeek)}
                  onValueChange={(value) => setDayOfWeek(Number(value))}
                >
                  <SelectTrigger id="edit-dayOfWeek">
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
                <Label htmlFor="edit-startTime">Start Time</Label>
                <Input
                  id="edit-startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="edit-duration">Duration</Label>
              <Select
                value={String(durationMinutes)}
                onValueChange={(value) => setDurationMinutes(Number(value))}
              >
                <SelectTrigger id="edit-duration">
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
            {isGoalEvent && (
              <div className="space-y-2">
                <Label htmlFor="edit-realm">
                  Life Realm <span className="text-destructive">*</span>
                </Label>
                {isLoadingRealms ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading realms...
                  </div>
                ) : (
                  <Select value={realmId} onValueChange={setRealmId}>
                    <SelectTrigger id="edit-realm">
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
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSubmitting || isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting || isDeleting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isDeleting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
