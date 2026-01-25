/**
 * Schedule Modification Prompts
 * Phase 6.5: Schedule Chat - Plan 03
 *
 * System prompts and helpers for schedule modification via chat.
 * Enables natural language schedule changes with structured response format.
 */

import type { ScheduleEventWithFlexibility } from '@/lib/scheduling/types'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Modification action types supported by chat
 */
export type ModificationAction = 'move' | 'delete' | 'feedback'

/**
 * Structured modification response format
 * Claude returns this in a JSON code block when user requests a change
 */
export interface ModificationResponse {
  action: ModificationAction
  eventId?: string
  newSlot?: {
    dayOfWeek: number  // 0=Sunday, 6=Saturday
    startTime: string  // HH:mm format
  }
  feedback?: string  // User preference feedback to store
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format a schedule event for inclusion in the prompt
 * Format: "Monday 9:00-10:00: Deep Work (high flex, id: evt_xxx)"
 */
function formatEventForPrompt(event: ScheduleEventWithFlexibility): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayName = days[event.slot.dayOfWeek]
  const flexLevel = event.flexibility?.level || 'medium'
  const isLocked = event.isLocked ? ', locked' : ''

  return `${dayName} ${event.slot.startTime}-${event.slot.endTime}: ${event.title} (${flexLevel} flex${isLocked}, id: ${event.id})`
}

/**
 * Format an entire schedule for inclusion in the system prompt
 * Groups events by day for readability
 */
export function formatScheduleForPrompt(events: ScheduleEventWithFlexibility[]): string {
  if (events.length === 0) {
    return 'No events scheduled for this week.'
  }

  // Group events by day
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const eventsByDay: Record<number, ScheduleEventWithFlexibility[]> = {}

  for (const event of events) {
    const day = event.slot.dayOfWeek
    if (!eventsByDay[day]) {
      eventsByDay[day] = []
    }
    eventsByDay[day].push(event)
  }

  // Sort events within each day by start time
  for (const day of Object.keys(eventsByDay)) {
    eventsByDay[Number(day)].sort((a, b) =>
      a.slot.startTime.localeCompare(b.slot.startTime)
    )
  }

  // Format output
  const lines: string[] = []
  for (let day = 0; day < 7; day++) {
    const dayEvents = eventsByDay[day]
    if (dayEvents && dayEvents.length > 0) {
      lines.push(`**${days[day]}:**`)
      for (const event of dayEvents) {
        const flexLevel = event.flexibility?.level || 'medium'
        const isLocked = event.isLocked ? ' [LOCKED]' : ''
        lines.push(`  - ${event.slot.startTime}-${event.slot.endTime}: ${event.title} (${flexLevel} flex${isLocked}) [id: ${event.id}]`)
      }
    }
  }

  return lines.join('\n')
}

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

/**
 * Build the system prompt for schedule modification chat
 * Includes the current schedule context and instructions for modifications
 */
export function buildScheduleSystemPrompt(schedule: ScheduleEventWithFlexibility[]): string {
  const formattedSchedule = formatScheduleForPrompt(schedule)

  return `You are a helpful schedule assistant for TimeLi, a cognitive science-backed scheduling app.

## Your Role
Help users understand and modify their weekly schedule. Be concise (this is chat, not essay format). Be friendly but efficient - users are busy.

## Current Schedule
${formattedSchedule}

## What You Can Do
1. **Answer questions** about the schedule (what's scheduled, when, free time, etc.)
2. **Move events** when the user requests (only non-locked events)
3. **Delete events** when the user requests (only non-locked events)
4. **Store feedback** about user preferences for future scheduling

## When User Requests a Change
If the user asks to modify their schedule, respond with TWO parts:
1. A friendly confirmation message
2. A JSON code block with the structured modification

### Move Event Format
\`\`\`json
{
  "action": "move",
  "eventId": "evt_xxx",
  "newSlot": {
    "dayOfWeek": 1,
    "startTime": "18:00"
  }
}
\`\`\`

### Delete Event Format
\`\`\`json
{
  "action": "delete",
  "eventId": "evt_xxx"
}
\`\`\`

### Feedback Format (for preferences)
\`\`\`json
{
  "action": "feedback",
  "feedback": "User prefers evening workouts"
}
\`\`\`

## Important Rules
- Only modify events that are NOT locked (locked events cannot be moved or deleted)
- Use the EXACT event ID from the schedule above (e.g., "evt_abc123")
- dayOfWeek: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
- startTime must be in HH:mm format (24-hour)
- If unclear what the user wants, ask clarifying questions
- When storing feedback, summarize the user's preference concisely

## When to Include JSON
- If user says "move", "reschedule", "change time", "put X at", etc. → include JSON block with action: "move"
- If user says "delete", "remove", "cancel" → include JSON block with action: "delete"
- If user says "I prefer", "I like", "don't schedule X at Y" → include JSON block with action: "feedback"
- For questions about the schedule (what's on, when, etc.) → NO JSON block, just answer

ALWAYS include the JSON code block when the user requests ANY modification. Match the event by title when finding the eventId.`
}
