/**
 * LLM Configuration
 * Phase 6.5: Schedule Chat - Plan 01
 *
 * Handles time-window based routing for self-hosted LLM availability.
 * Supports scheduling GPU runtime windows for cost optimization.
 */

import { DAILY_API_LIMIT } from '@/lib/services/api-usage'

export interface TimeWindow {
  start: string  // "09:00" (24h format)
  end: string    // "14:00"
}

export interface LLMConfig {
  selfHosted: {
    baseUrl: string | undefined
    model: string | undefined
    schedule: {
      timezone: string
      windows: TimeWindow[]
    }
  }
  apiFallback: {
    enabled: boolean
    apiKey: string | undefined
    model: string
    dailyLimit: number
  }
}

/**
 * Get LLM configuration from environment variables
 */
export function getLLMConfig(): LLMConfig {
  // Parse schedule from env: "09:00-14:00,18:00-22:00"
  const scheduleStr = process.env.LLM_SCHEDULE || ''
  const windows: TimeWindow[] = scheduleStr
    .split(',')
    .filter(Boolean)
    .map(w => {
      const [start, end] = w.trim().split('-')
      return { start: start || '00:00', end: end || '23:59' }
    })

  return {
    selfHosted: {
      baseUrl: process.env.LLM_BASE_URL,
      model: process.env.LLM_MODEL,
      schedule: {
        timezone: process.env.LLM_TIMEZONE || 'America/New_York',
        // If no schedule specified, assume always available
        windows: windows.length > 0 ? windows : [{ start: '00:00', end: '23:59' }],
      },
    },
    apiFallback: {
      enabled: !!process.env.OPENAI_API_KEY,
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      dailyLimit: DAILY_API_LIMIT,
    },
  }
}

/**
 * Check if current time is within any availability window
 */
export function isInAvailabilityWindow(schedule: LLMConfig['selfHosted']['schedule']): boolean {
  const now = new Date()

  // Format current time in configured timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: schedule.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const timeStr = formatter.format(now)  // e.g., "09:30"

  return schedule.windows.some(w => timeStr >= w.start && timeStr <= w.end)
}

/**
 * Get human-readable schedule string for display
 */
export function getScheduleString(schedule: LLMConfig['selfHosted']['schedule']): string {
  if (schedule.windows.length === 0) {
    return 'Not scheduled'
  }

  const windowStr = schedule.windows.map(w => `${w.start}-${w.end}`).join(', ')
  return `${windowStr} ${schedule.timezone}`
}
