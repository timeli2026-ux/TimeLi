/**
 * Confirm Preference Prompt Template
 * Phase 8: LLM Gateway - Plan 03
 *
 * Generates conversational questions to confirm detected user preferences.
 * Used when the system notices patterns in user behavior (e.g., repeatedly
 * moving workouts to evening).
 */

/**
 * Types of preferences that can be detected from user behavior
 */
export type PreferenceType =
  | 'time_preference'      // e.g., "prefers evening for exercise"
  | 'spacing_preference'   // e.g., "prefers 2-day gaps between study sessions"
  | 'day_preference'       // e.g., "avoids Monday meetings"
  | 'duration_preference'  // e.g., "prefers 45-min sessions over 60-min"

/**
 * A pattern detected from user behavior
 */
export interface DetectedPattern {
  type: PreferenceType
  observation: string // e.g., "User moved workouts to evening 3 times"
  suggestedPreference: string // e.g., "Prefer evening slots for exercise goals"
}

/**
 * Parsed response from LLM for preference confirmation
 */
export interface ConfirmPreferenceResponse {
  question: string      // The question to ask the user
  confirmAction: string // Action if user confirms (e.g., "Set evening preference for exercise")
  rejectAction: string  // Action if user rejects (e.g., "Keep suggesting various times")
}

/**
 * Build prompt for generating preference confirmation question
 *
 * @param detectedPattern - The pattern detected from user behavior
 * @returns System prompt for the LLM
 */
export function buildConfirmPreferencePrompt(detectedPattern: DetectedPattern): string {
  return `You are a scheduling assistant that helps users optimize their schedules.

A pattern has been detected in the user's behavior:
- Type: ${detectedPattern.type}
- Observation: "${detectedPattern.observation}"
- Suggested preference: "${detectedPattern.suggestedPreference}"

Generate a conversational, non-presumptuous question to confirm if the user wants this preference applied automatically.

Requirements:
- Be conversational and friendly
- Reference the specific observation
- Don't assume the user wants to change - ask genuinely
- Offer clear accept/reject actions
- Keep the question under 150 characters
- Keep each action under 50 characters

Respond with ONLY a JSON object in this exact format (no markdown, no code blocks):
{
  "question": "Your question here referencing the specific observation",
  "confirmAction": "Clear action description if confirmed",
  "rejectAction": "Clear action description if rejected"
}

Examples by preference type:

time_preference:
{
  "question": "I noticed you often move workouts to the evening. Would you like me to schedule exercise in the evening by default?",
  "confirmAction": "Set evening preference for exercise",
  "rejectAction": "Keep suggesting various times"
}

spacing_preference:
{
  "question": "You seem to prefer having a day between study sessions. Should I always space them out like this?",
  "confirmAction": "Add 1-day minimum gap between sessions",
  "rejectAction": "Keep current flexible spacing"
}

day_preference:
{
  "question": "I've noticed you usually reschedule Monday meetings to other days. Want me to avoid Mondays for meetings?",
  "confirmAction": "Avoid scheduling meetings on Monday",
  "rejectAction": "Keep Monday available for meetings"
}

duration_preference:
{
  "question": "You often shorten focus sessions to 45 minutes. Would you prefer this as your default session length?",
  "confirmAction": "Set 45-min default for focus sessions",
  "rejectAction": "Keep 60-min default sessions"
}

Respond with ONLY the JSON object.`
}

/**
 * Parse LLM response into ConfirmPreferenceResponse
 *
 * @param response - Raw LLM response (should be JSON)
 * @returns Parsed response with question and actions
 */
export function parseConfirmResponse(response: string): ConfirmPreferenceResponse {
  // Default fallback response
  const fallback: ConfirmPreferenceResponse = {
    question: 'Would you like me to remember this preference for future scheduling?',
    confirmAction: 'Save this preference',
    rejectAction: 'Keep current settings',
  }

  try {
    // Clean up response - remove markdown code blocks if present
    let cleanResponse = response.trim()
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.slice(7)
    }
    if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.slice(3)
    }
    if (cleanResponse.endsWith('```')) {
      cleanResponse = cleanResponse.slice(0, -3)
    }
    cleanResponse = cleanResponse.trim()

    const parsed = JSON.parse(cleanResponse)

    // Validate required fields
    if (!parsed.question || typeof parsed.question !== 'string') {
      return fallback
    }
    if (!parsed.confirmAction || typeof parsed.confirmAction !== 'string') {
      return fallback
    }
    if (!parsed.rejectAction || typeof parsed.rejectAction !== 'string') {
      return fallback
    }

    // Enforce length limits
    return {
      question: truncateWithEllipsis(parsed.question, 200),
      confirmAction: truncateWithEllipsis(parsed.confirmAction, 60),
      rejectAction: truncateWithEllipsis(parsed.rejectAction, 60),
    }
  } catch {
    // If JSON parsing fails, return fallback
    return fallback
  }
}

/**
 * Truncate string with ellipsis if over limit
 */
function truncateWithEllipsis(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3).trim() + '...'
}

/**
 * Create a DetectedPattern from observation data
 * Helper function for building patterns from analytics
 */
export function createDetectedPattern(
  type: PreferenceType,
  observation: string,
  suggestedPreference: string
): DetectedPattern {
  return {
    type,
    observation,
    suggestedPreference,
  }
}

/**
 * Common pattern templates for quick creation
 */
export const PATTERN_TEMPLATES = {
  eveningWorkout: (count: number): DetectedPattern => ({
    type: 'time_preference',
    observation: `User moved workouts to evening ${count} times`,
    suggestedPreference: 'Prefer evening slots for exercise goals',
  }),

  morningFocus: (count: number): DetectedPattern => ({
    type: 'time_preference',
    observation: `User scheduled focus work in morning ${count} times`,
    suggestedPreference: 'Prefer morning slots for deep work sessions',
  }),

  avoidMonday: (count: number): DetectedPattern => ({
    type: 'day_preference',
    observation: `User rescheduled Monday tasks to other days ${count} times`,
    suggestedPreference: 'Avoid Monday for flexible tasks',
  }),

  sessionSpacing: (days: number, count: number): DetectedPattern => ({
    type: 'spacing_preference',
    observation: `User prefers ${days}-day gaps between similar sessions (${count} instances)`,
    suggestedPreference: `Set ${days}-day minimum spacing for repeated sessions`,
  }),

  shorterSessions: (minutes: number, count: number): DetectedPattern => ({
    type: 'duration_preference',
    observation: `User shortened sessions to ${minutes} minutes ${count} times`,
    suggestedPreference: `Set ${minutes}-minute default session duration`,
  }),
}
