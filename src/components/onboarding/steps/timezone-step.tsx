'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

// Comprehensive timezone list with GMT offsets and readable city names
// Organized by region, sorted by GMT offset within each region
const TIMEZONES = [
  // UTC
  { value: 'UTC', label: 'UTC (GMT+0)', region: 'UTC' },

  // Americas
  { value: 'Pacific/Honolulu', label: 'Honolulu (GMT-10)', region: 'Americas' },
  { value: 'America/Anchorage', label: 'Anchorage (GMT-9)', region: 'Americas' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8)', region: 'Americas' },
  { value: 'America/Vancouver', label: 'Vancouver (GMT-8)', region: 'Americas' },
  { value: 'America/Phoenix', label: 'Phoenix (GMT-7)', region: 'Americas' },
  { value: 'America/Denver', label: 'Denver (GMT-7)', region: 'Americas' },
  { value: 'America/Chicago', label: 'Chicago (GMT-6)', region: 'Americas' },
  { value: 'America/Mexico_City', label: 'Mexico City (GMT-6)', region: 'Americas' },
  { value: 'America/New_York', label: 'New York (GMT-5)', region: 'Americas' },
  { value: 'America/Toronto', label: 'Toronto (GMT-5)', region: 'Americas' },
  { value: 'America/Bogota', label: 'Bogota (GMT-5)', region: 'Americas' },
  { value: 'America/Lima', label: 'Lima (GMT-5)', region: 'Americas' },
  { value: 'America/Caracas', label: 'Caracas (GMT-4)', region: 'Americas' },
  { value: 'America/Halifax', label: 'Halifax (GMT-4)', region: 'Americas' },
  { value: 'America/Santiago', label: 'Santiago (GMT-4)', region: 'Americas' },
  { value: 'America/Sao_Paulo', label: 'Sao Paulo (GMT-3)', region: 'Americas' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (GMT-3)', region: 'Americas' },
  { value: 'Atlantic/South_Georgia', label: 'South Georgia (GMT-2)', region: 'Americas' },
  { value: 'Atlantic/Azores', label: 'Azores (GMT-1)', region: 'Americas' },

  // Europe
  { value: 'Europe/London', label: 'London (GMT+0)', region: 'Europe' },
  { value: 'Europe/Dublin', label: 'Dublin (GMT+0)', region: 'Europe' },
  { value: 'Europe/Lisbon', label: 'Lisbon (GMT+0)', region: 'Europe' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1)', region: 'Europe' },
  { value: 'Europe/Berlin', label: 'Berlin (GMT+1)', region: 'Europe' },
  { value: 'Europe/Madrid', label: 'Madrid (GMT+1)', region: 'Europe' },
  { value: 'Europe/Rome', label: 'Rome (GMT+1)', region: 'Europe' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (GMT+1)', region: 'Europe' },
  { value: 'Europe/Brussels', label: 'Brussels (GMT+1)', region: 'Europe' },
  { value: 'Europe/Vienna', label: 'Vienna (GMT+1)', region: 'Europe' },
  { value: 'Europe/Warsaw', label: 'Warsaw (GMT+1)', region: 'Europe' },
  { value: 'Europe/Stockholm', label: 'Stockholm (GMT+1)', region: 'Europe' },
  { value: 'Europe/Oslo', label: 'Oslo (GMT+1)', region: 'Europe' },
  { value: 'Europe/Copenhagen', label: 'Copenhagen (GMT+1)', region: 'Europe' },
  { value: 'Europe/Zurich', label: 'Zurich (GMT+1)', region: 'Europe' },
  { value: 'Europe/Athens', label: 'Athens (GMT+2)', region: 'Europe' },
  { value: 'Europe/Helsinki', label: 'Helsinki (GMT+2)', region: 'Europe' },
  { value: 'Europe/Bucharest', label: 'Bucharest (GMT+2)', region: 'Europe' },
  { value: 'Europe/Kiev', label: 'Kyiv (GMT+2)', region: 'Europe' },
  { value: 'Europe/Istanbul', label: 'Istanbul (GMT+3)', region: 'Europe' },
  { value: 'Europe/Moscow', label: 'Moscow (GMT+3)', region: 'Europe' },

  // Africa
  { value: 'Africa/Casablanca', label: 'Casablanca (GMT+0)', region: 'Africa' },
  { value: 'Africa/Lagos', label: 'Lagos (GMT+1)', region: 'Africa' },
  { value: 'Africa/Cairo', label: 'Cairo (GMT+2)', region: 'Africa' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (GMT+2)', region: 'Africa' },
  { value: 'Africa/Nairobi', label: 'Nairobi (GMT+3)', region: 'Africa' },

  // Middle East
  { value: 'Asia/Jerusalem', label: 'Jerusalem (GMT+2)', region: 'Middle East' },
  { value: 'Asia/Riyadh', label: 'Riyadh (GMT+3)', region: 'Middle East' },
  { value: 'Asia/Kuwait', label: 'Kuwait (GMT+3)', region: 'Middle East' },
  { value: 'Asia/Dubai', label: 'Dubai (GMT+4)', region: 'Middle East' },
  { value: 'Asia/Tehran', label: 'Tehran (GMT+3:30)', region: 'Middle East' },

  // Asia
  { value: 'Asia/Karachi', label: 'Karachi (GMT+5)', region: 'Asia' },
  { value: 'Asia/Kolkata', label: 'Kolkata (GMT+5:30)', region: 'Asia' },
  { value: 'Asia/Mumbai', label: 'Mumbai (GMT+5:30)', region: 'Asia' },
  { value: 'Asia/Dhaka', label: 'Dhaka (GMT+6)', region: 'Asia' },
  { value: 'Asia/Bangkok', label: 'Bangkok (GMT+7)', region: 'Asia' },
  { value: 'Asia/Jakarta', label: 'Jakarta (GMT+7)', region: 'Asia' },
  { value: 'Asia/Ho_Chi_Minh', label: 'Ho Chi Minh City (GMT+7)', region: 'Asia' },
  { value: 'Asia/Singapore', label: 'Singapore (GMT+8)', region: 'Asia' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (GMT+8)', region: 'Asia' },
  { value: 'Asia/Shanghai', label: 'Shanghai (GMT+8)', region: 'Asia' },
  { value: 'Asia/Taipei', label: 'Taipei (GMT+8)', region: 'Asia' },
  { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur (GMT+8)', region: 'Asia' },
  { value: 'Asia/Manila', label: 'Manila (GMT+8)', region: 'Asia' },
  { value: 'Asia/Seoul', label: 'Seoul (GMT+9)', region: 'Asia' },
  { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)', region: 'Asia' },

  // Australia & Pacific
  { value: 'Australia/Perth', label: 'Perth (GMT+8)', region: 'Australia & Pacific' },
  { value: 'Australia/Darwin', label: 'Darwin (GMT+9:30)', region: 'Australia & Pacific' },
  { value: 'Australia/Adelaide', label: 'Adelaide (GMT+9:30)', region: 'Australia & Pacific' },
  { value: 'Australia/Brisbane', label: 'Brisbane (GMT+10)', region: 'Australia & Pacific' },
  { value: 'Australia/Sydney', label: 'Sydney (GMT+10)', region: 'Australia & Pacific' },
  { value: 'Australia/Melbourne', label: 'Melbourne (GMT+10)', region: 'Australia & Pacific' },
  { value: 'Pacific/Auckland', label: 'Auckland (GMT+12)', region: 'Australia & Pacific' },
  { value: 'Pacific/Fiji', label: 'Fiji (GMT+12)', region: 'Australia & Pacific' },
]

// Group timezones by region for better organization
const TIMEZONE_GROUPS = [
  'UTC',
  'Americas',
  'Europe',
  'Africa',
  'Middle East',
  'Asia',
  'Australia & Pacific',
]

interface TimezoneStepProps {
  value: string
  onChange: (timezone: string) => void
}

export function TimezoneStep({ value, onChange }: TimezoneStepProps) {
  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">What&apos;s your timezone?</h2>
        <p className="text-muted-foreground">
          We&apos;ll use this to schedule events at the right times.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id="timezone" className="w-full">
            <SelectValue placeholder="Select your timezone" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {TIMEZONE_GROUPS.map((region) => (
              <div key={region}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                  {region}
                </div>
                {TIMEZONES.filter((tz) => tz.region === region).map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
