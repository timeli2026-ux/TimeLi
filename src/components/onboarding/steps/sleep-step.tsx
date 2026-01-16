'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SleepStepProps {
  sleepStart: string
  sleepEnd: string
  onSleepStartChange: (time: string) => void
  onSleepEndChange: (time: string) => void
}

export function SleepStep({
  sleepStart,
  sleepEnd,
  onSleepStartChange,
  onSleepEndChange,
}: SleepStepProps) {
  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">When do you sleep?</h2>
        <p className="text-muted-foreground">
          We&apos;ll never schedule anything during your sleep hours.
        </p>
      </div>

      <div className="flex gap-6 justify-center">
        <div className="space-y-2">
          <Label htmlFor="sleep-start">Bedtime</Label>
          <Input
            id="sleep-start"
            type="time"
            value={sleepStart}
            onChange={(e) => onSleepStartChange(e.target.value)}
            className="w-[140px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sleep-end">Wake up</Label>
          <Input
            id="sleep-end"
            type="time"
            value={sleepEnd}
            onChange={(e) => onSleepEndChange(e.target.value)}
            className="w-[140px]"
          />
        </div>
      </div>
    </div>
  )
}
