'use client'

import { useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

// =============================================================================
// TYPES
// =============================================================================

export type RecalibrateScope = 'local' | 'global'

interface RecalibrateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (scope: RecalibrateScope, feedback?: string) => void
}

// =============================================================================
// SCOPE OPTIONS
// =============================================================================

const SCOPE_OPTIONS: Array<{
  value: RecalibrateScope
  label: string
  description: string
}> = [
  {
    value: 'local',
    label: 'This week only',
    description: 'Keeps other weeks unchanged',
  },
  {
    value: 'global',
    label: 'All weeks',
    description: 'Regenerates your entire schedule',
  },
]

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * RecalibrateDialog - Modal for regenerating the schedule
 *
 * Features:
 * - Scope selection (local/global)
 * - Warning for global scope
 * - Confirmation action
 */
export function RecalibrateDialog({
  open,
  onOpenChange,
  onConfirm,
}: RecalibrateDialogProps) {
  const [selectedScope, setSelectedScope] = useState<RecalibrateScope>('local')
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Handle form submission
  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Pass feedback if provided, otherwise undefined
      await onConfirm(selectedScope, feedback.trim() || undefined)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle close with reset
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedScope('local')
      setFeedback('')
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Recalibrate Schedule
          </DialogTitle>
          <DialogDescription>
            Generate a new schedule based on your current goals and preferences.
          </DialogDescription>
        </DialogHeader>

        {/* Scope selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Scope</label>
          <div className="grid gap-2">
            {SCOPE_OPTIONS.map((option) => {
              const isSelected = selectedScope === option.value

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedScope(option.value)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all',
                    'hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-background hover:bg-accent/50'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full border-2',
                      isSelected
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground/50'
                    )}
                  >
                    {isSelected && (
                      <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Feedback textarea (optional) */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Feedback <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What would you like to change? (e.g., 'Move gym to evenings', 'More time for studying')"
            className="resize-none"
            rows={3}
          />
        </div>

        {/* Warning for global scope */}
        {selectedScope === 'global' && (
          <div className="flex items-start gap-3 rounded-lg border border-yellow-500/50 bg-yellow-50 p-3 dark:bg-yellow-950/30">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium">This will replace all manual changes</p>
              <p className="mt-0.5 opacity-90">
                Any events you&apos;ve moved or adjusted in future weeks will be overwritten.
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant={selectedScope === 'global' ? 'destructive' : 'default'}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Recalibrating...
              </>
            ) : (
              'Recalibrate'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
