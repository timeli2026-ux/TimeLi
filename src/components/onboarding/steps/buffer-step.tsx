'use client'

import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

interface BufferStepProps {
  bufferMinutes: number
  onChange: (minutes: number) => void
}

export function BufferStep({ bufferMinutes, onChange }: BufferStepProps) {
  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">
          How much buffer time between activities?
        </h2>
        <p className="text-muted-foreground">
          This helps you transition between tasks without feeling rushed.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-center">
          <span className="text-4xl font-bold">{bufferMinutes}</span>
          <span className="text-xl text-muted-foreground ml-2">minutes</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>5 min</span>
            <Label htmlFor="buffer-slider" className="sr-only">
              Buffer time in minutes
            </Label>
            <span>30 min</span>
          </div>
          <Slider
            id="buffer-slider"
            min={5}
            max={30}
            step={5}
            value={[bufferMinutes]}
            onValueChange={([value]) => onChange(value)}
            className="w-full"
          />
        </div>

        <p className="text-sm text-muted-foreground text-center">
          Buffer time is added between scheduled activities to give you time to wrap up,
          take a short break, or prepare for what&apos;s next.
        </p>
      </div>
    </div>
  )
}
