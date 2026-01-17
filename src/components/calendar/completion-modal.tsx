'use client'

import { useState } from 'react'
import { Check, Circle, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { ScheduleEventWithFlexibility } from '@/lib/scheduling/types'
import { cn } from '@/lib/utils'

// =============================================================================
// TYPES
// =============================================================================

export type CompletionStatus = 'completed' | 'skipped' | 'partial'

interface CompletionModalProps {
  event: ScheduleEventWithFlexibility
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: (status: CompletionStatus, notes?: string) => void
}

// =============================================================================
// STATUS OPTIONS
// =============================================================================

const STATUS_OPTIONS: Array<{
  value: CompletionStatus
  label: string
  description: string
  icon: typeof Check
  colorClass: string
}> = [
  {
    value: 'completed',
    label: 'Completed',
    description: 'I finished this task',
    icon: Check,
    colorClass: 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  },
  {
    value: 'partial',
    label: 'Partial',
    description: 'I made some progress',
    icon: Circle,
    colorClass: 'border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  },
  {
    value: 'skipped',
    label: 'Skipped',
    description: "I didn't do this",
    icon: X,
    colorClass: 'border-muted-foreground bg-muted text-muted-foreground',
  },
]

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * CompletionModal - Modal for logging task completion status
 *
 * Features:
 * - Radio-style status selection (completed/partial/skipped)
 * - Optional notes field
 * - Visual status indicators
 */
export function CompletionModal({
  event,
  open,
  onOpenChange,
  onComplete,
}: CompletionModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<CompletionStatus | null>(null)
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours, 10)
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    const period = hour < 12 ? 'AM' : 'PM'
    return `${displayHour}:${minutes} ${period}`
  }

  const timeRange = `${formatTime(event.slot.startTime)} - ${formatTime(event.slot.endTime)}`

  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedStatus) return

    setIsSubmitting(true)
    try {
      await onComplete(selectedStatus, notes.trim() || undefined)
      // Reset state
      setSelectedStatus(null)
      setNotes('')
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle close with reset
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedStatus(null)
      setNotes('')
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">How did it go?</DialogTitle>
        </DialogHeader>

        {/* Event info */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <h4 className="font-medium">{event.title}</h4>
          <p className="text-sm text-muted-foreground mt-0.5">{timeRange}</p>
        </div>

        {/* Status selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <div className="grid gap-2">
            {STATUS_OPTIONS.map((option) => {
              const Icon = option.icon
              const isSelected = selectedStatus === option.value

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedStatus(option.value)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all',
                    'hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isSelected
                      ? option.colorClass
                      : 'border-border bg-background hover:bg-accent/50'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full',
                      isSelected ? 'bg-current/20' : 'bg-muted'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4',
                        isSelected ? 'text-current' : 'text-muted-foreground'
                      )}
                    />
                  </div>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div
                      className={cn(
                        'text-sm',
                        isSelected ? 'text-current/80' : 'text-muted-foreground'
                      )}
                    >
                      {option.description}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Notes field */}
        <div className="space-y-2">
          <label htmlFor="completion-notes" className="text-sm font-medium">
            Notes
          </label>
          <Textarea
            id="completion-notes"
            placeholder="Any notes? (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Submit button */}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedStatus || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
