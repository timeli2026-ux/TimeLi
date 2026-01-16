'use client'

import { useState } from 'react'
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
import { X } from 'lucide-react'

const DAYS_OF_WEEK = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
]

interface Commitment {
  id: string
  title: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

interface CommitmentsStepProps {
  commitments: Commitment[]
  onAdd: (commitment: Omit<Commitment, 'id'>) => void
  onRemove: (id: string) => void
}

const MAX_COMMITMENTS = 20

export function CommitmentsStep({
  commitments,
  onAdd,
  onRemove,
}: CommitmentsStepProps) {
  const [title, setTitle] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState<string>('1')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')

  const handleAdd = () => {
    if (!title.trim()) return
    if (commitments.length >= MAX_COMMITMENTS) return

    onAdd({
      title: title.trim(),
      dayOfWeek: parseInt(dayOfWeek, 10),
      startTime,
      endTime,
    })

    // Reset form
    setTitle('')
    setStartTime('09:00')
    setEndTime('10:00')
  }

  const getDayLabel = (day: number): string => {
    return DAYS_OF_WEEK.find((d) => d.value === String(day))?.label || ''
  }

  const formatTimeRange = (start: string, end: string): string => {
    const format = (time: string) => {
      const [hours, minutes] = time.split(':')
      const hour = parseInt(hours, 10)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour % 12 || 12
      return `${displayHour}:${minutes} ${ampm}`
    }
    return `${format(start)} - ${format(end)}`
  }

  const isAtLimit = commitments.length >= MAX_COMMITMENTS

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">
          What are your fixed weekly commitments?
        </h2>
        <p className="text-muted-foreground">
          Classes, work shifts, recurring meetings - things that happen at the
          same time each week.
        </p>
      </div>

      {/* Add Commitment Form */}
      {!isAtLimit && (
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="commitment-title">Title</Label>
            <Input
              id="commitment-title"
              type="text"
              placeholder="e.g., CS101 Lecture"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commitment-day">Day of week</Label>
            <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
              <SelectTrigger id="commitment-day" className="w-full">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((day) => (
                  <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commitment-start">Start time</Label>
              <Input
                id="commitment-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commitment-end">End time</Label>
              <Input
                id="commitment-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleAdd}
            disabled={!title.trim()}
            className="w-full"
          >
            Add Commitment
          </Button>
        </div>
      )}

      {isAtLimit && (
        <p className="text-sm text-amber-600 text-center">
          Maximum of {MAX_COMMITMENTS} commitments reached. Remove some to add
          more.
        </p>
      )}

      {/* Commitments List */}
      <div className="space-y-2">
        {commitments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No commitments added yet
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {commitments.length} commitment{commitments.length !== 1 ? 's' : ''}{' '}
              added
            </p>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {commitments.map((commitment) => (
                <div
                  key={commitment.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{commitment.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {getDayLabel(commitment.dayOfWeek)} -{' '}
                      {formatTimeRange(commitment.startTime, commitment.endTime)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(commitment.id)}
                    className="ml-2 shrink-0"
                    aria-label={`Remove ${commitment.title}`}
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
