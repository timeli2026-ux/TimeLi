'use client'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'

interface CommuteData {
  hasCommute: boolean
  morningStart: string
  morningDuration: number
  eveningStart: string
  eveningDuration: number
}

interface CommuteStepProps {
  commute: CommuteData
  onChange: (commute: CommuteData) => void
}

export function CommuteStep({ commute, onChange }: CommuteStepProps) {
  const handleToggle = (hasCommute: boolean) => {
    onChange({
      ...commute,
      hasCommute,
    })
  }

  const handleMorningStartChange = (morningStart: string) => {
    onChange({ ...commute, morningStart })
  }

  const handleMorningDurationChange = (morningDuration: number) => {
    onChange({ ...commute, morningDuration })
  }

  const handleEveningStartChange = (eveningStart: string) => {
    onChange({ ...commute, eveningStart })
  }

  const handleEveningDurationChange = (eveningDuration: number) => {
    onChange({ ...commute, eveningDuration })
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Do you have a regular commute?</h2>
        <p className="text-muted-foreground">
          We&apos;ll block out travel time so nothing gets scheduled during your commute.
        </p>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-center gap-3">
        <Switch
          id="commute-toggle"
          checked={commute.hasCommute}
          onCheckedChange={handleToggle}
        />
        <Label htmlFor="commute-toggle" className="text-base cursor-pointer">
          I have a regular commute
        </Label>
      </div>

      {/* Commute Fields - Show when enabled */}
      <div
        className={`space-y-6 transition-all duration-300 ease-in-out ${
          commute.hasCommute
            ? 'opacity-100 max-h-[500px]'
            : 'opacity-0 max-h-0 overflow-hidden'
        }`}
      >
        {/* Morning Commute Section */}
        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="font-medium text-center">Morning Commute</h3>

          <div className="space-y-2">
            <Label htmlFor="morning-start">Leave home at</Label>
            <Input
              id="morning-start"
              type="time"
              value={commute.morningStart}
              onChange={(e) => handleMorningStartChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Duration</Label>
              <span className="text-sm text-muted-foreground">
                {commute.morningDuration} minutes
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>15 min</span>
              <span>90 min</span>
            </div>
            <Slider
              id="morning-duration"
              min={15}
              max={90}
              step={15}
              value={[commute.morningDuration]}
              onValueChange={([value]) => handleMorningDurationChange(value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Evening Commute Section */}
        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="font-medium text-center">Evening Commute</h3>

          <div className="space-y-2">
            <Label htmlFor="evening-start">Leave work/school at</Label>
            <Input
              id="evening-start"
              type="time"
              value={commute.eveningStart}
              onChange={(e) => handleEveningStartChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Duration</Label>
              <span className="text-sm text-muted-foreground">
                {commute.eveningDuration} minutes
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>15 min</span>
              <span>90 min</span>
            </div>
            <Slider
              id="evening-duration"
              min={15}
              max={90}
              step={15}
              value={[commute.eveningDuration]}
              onValueChange={([value]) => handleEveningDurationChange(value)}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {!commute.hasCommute && (
        <p className="text-sm text-muted-foreground text-center">
          No problem! You can always add commute times later in your settings.
        </p>
      )}
    </div>
  )
}
